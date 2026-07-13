import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { validateSessionToken } from "@shared/auth";
import { prisma } from "./prisma";

export type SocketUser = {
  id: string;
  email: string;
  role: string;
  staffId?: string | null;
  patientId?: string | null;
};

let io: Server | null = null;

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    out[rawKey] = decodeURIComponent(rest.join("=") ?? "");
  }
  return out;
}

async function enrichUser(user: {
  id: string;
  email: string;
  role: string;
}): Promise<SocketUser> {
  const [staff, patient] = await Promise.all([
    prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true } }),
    prisma.patient.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    }),
  ]);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    staffId: staff?.id ?? null,
    patientId: patient?.id ?? null,
  };
}

export function initSocket(httpServer: HttpServer) {
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

  io = new Server(httpServer, {
    cors: { origin: webOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie ?? "");
      const sessionToken =
        cookies["authjs.session-token"] ?? cookies["__Secure-authjs.session-token"];
      if (!sessionToken) return next(new Error("Unauthenticated"));

      const user = await validateSessionToken(prisma, sessionToken);
      if (!user) return next(new Error("Unauthenticated"));

      socket.data.user = await enrichUser(user);
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error("Unauthenticated"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    if (user.role === "DOCTOR" && user.staffId) {
      socket.join(`doctor:${user.staffId}`);
    }
    if (["NURSE", "RECEPTIONIST", "ADMIN", "DOCTOR"].includes(user.role)) {
      socket.join("staff:all");
    }
  });

  return io;
}

export function emitAppointmentEvent(
  event:
    | "appointment:created"
    | "appointment:checked_in"
    | "appointment:cancelled"
    | "appointment:completed"
    | "appointment:no_show",
  appointment: { doctorId: string },
) {
  const server = getIO();
  server.to(`doctor:${appointment.doctorId}`).emit(event, appointment);
  server.to("staff:all").emit(event, appointment);
}
