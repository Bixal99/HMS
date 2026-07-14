import { randomUUID } from "crypto";
import type {
  AppointmentEventType,
  AppointmentStatus,
  Prisma,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

type Tx = Prisma.TransactionClient;

export async function logAppointmentEvent(
  tx: Tx | typeof prisma,
  input: {
    appointmentId: string;
    eventType: AppointmentEventType;
    fromStatus?: AppointmentStatus | null;
    toStatus?: AppointmentStatus | null;
    actorUserId?: string | null;
    note?: string | null;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  },
) {
  return tx.appointmentEvent.create({
    data: {
      id: randomUUID(),
      appointmentId: input.appointmentId,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      actorUserId: input.actorUserId ?? null,
      note: input.note ?? null,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
