import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { config } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import {
  LoginInput,
  TokenPayload,
  AuthTokens,
  Role,
  RegisterPatientInput,
  CreateStaffInput,
} from "@shared/types";
import crypto from "crypto";

export class AuthService {
  private static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: payload.userId, version: crypto.randomBytes(8).toString("hex") },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRY } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  static async registerPatient(data: RegisterPatientInput): Promise<{
    tokens: AuthTokens;
    user: any;
  }> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError("Email already registered", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Generate MRN (Medical Record Number)
    const mrn = `MRN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create user and patient in transaction
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        passwordHash: hashedPassword,
        phone: data.phone,
        role: Role.PATIENT,
        patient: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            mrn,
            dob: new Date(), // TODO: get from form
            gender: "OTHER" as any, // TODO: get from form
          },
        },
      },
      include: {
        patient: true,
        staff: true,
      },
    });

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: Role.PATIENT,
      patientId: user.patient?.id,
    };

    const tokens = this.generateTokens(payload);
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(tokens.refreshToken)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt,
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return { tokens, user: userWithoutPassword };
  }

  static async login(data: LoginInput): Promise<{ tokens: AuthTokens; user: any }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        staff: true,
        patient: true,
      },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is deactivated. Please contact support.", 403);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      staffId: user.staff?.id,
      patientId: user.patient?.id,
    };

    const tokens = this.generateTokens(payload);

    // Hash refresh token to store in DB
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(tokens.refreshToken)
      .digest("hex");

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt,
      },
    });

    // Strip password from returned user object
    const { passwordHash, ...userWithoutPassword } = user;
    return { tokens, user: userWithoutPassword };
  }

  static async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
        userId: string;
      };
      const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const savedToken = await prisma.refreshToken.findFirst({
        where: {
          userId: decoded.userId,
          tokenHash: hashedToken,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!savedToken) {
        throw new AppError("Invalid or expired refresh token", 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { staff: true, patient: true },
      });

      if (!user || !user.isActive) {
        throw new AppError("User not found or deactivated", 401);
      }

      // Revoke old token (rotation)
      await prisma.refreshToken.update({
        where: { id: savedToken.id },
        data: { revokedAt: new Date() },
      });

      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as Role,
        staffId: user.staff?.id,
        patientId: user.patient?.id,
      };

      const tokens = this.generateTokens(payload);
      const newHashedToken = crypto
        .createHash("sha256")
        .update(tokens.refreshToken)
        .digest("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newHashedToken,
          expiresAt,
        },
      });

      return tokens;
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;

    const hashedToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Revoke the token if it exists
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashedToken },
      data: { revokedAt: new Date() },
    });
  }

  static async getUserProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        staff: {
          include: { department: true },
        },
        patient: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async createStaff(data: CreateStaffInput): Promise<any> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError("Email already registered", 400);
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });

    if (!department) {
      throw new AppError("Department not found", 404);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Generate employee code
    const employeeCode = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create user and staff in transaction
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        passwordHash: hashedPassword,
        phone: data.phone,
        role: data.role as Role,
        staff: {
          create: {
            employeeCode,
            departmentId: data.departmentId,
            designation: data.designation,
            specialization: data.specialization || null,
          },
        },
      },
      include: {
        staff: {
          include: { department: true },
        },
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt,
      },
    });

    // TODO: Send email with reset link containing resetToken
    // await sendPasswordResetEmail(user.email, resetToken);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashedToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }
}
