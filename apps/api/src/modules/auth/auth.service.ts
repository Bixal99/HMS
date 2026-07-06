import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma";
import { config } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { LoginInput, TokenPayload, AuthTokens, Role } from "@shared/types";
import crypto from "crypto";

export class AuthService {
  private static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    });
    
    const refreshToken = jwt.sign(
      { userId: payload.userId, version: crypto.randomBytes(8).toString('hex') },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRY }
    );

    return { accessToken, refreshToken };
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
    const hashedRefreshToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');

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
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string };
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

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
      const newHashedToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
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
    
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Revoke the token if it exists
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashedToken },
      data: { revokedAt: new Date() },
    });
  }
}
