import type { Request, Response } from "express";
import { parseISO, startOfDay } from "date-fns";
import { emitAppointmentEvent } from "../../lib/socket";
import {
  bookAppointment,
  cancelAppointment,
  checkInAppointment,
  completeAppointment,
  markNoShow,
  getAppointmentById,
  getTodayQueue,
  joinWaitlist,
  listDoctors,
  listSlots,
  Prisma,
  rescheduleAppointment,
  resolvePatientId,
  resolveStaffId,
} from "./appointments.service";
import {
  bookAppointmentSchema,
  cancelSchema,
  rescheduleSchema,
  slotsQuerySchema,
  waitlistSchema,
} from "./appointments.validators";
import { getSetting } from "../settings/settings.service";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : String(id);
}

async function assertPatientSelfOrStaff(
  req: Request,
  patientId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!req.user) return { ok: false, status: 401, error: "Unauthenticated" };
  if (["ADMIN", "RECEPTIONIST"].includes(req.user.role)) return { ok: true };
  if (req.user.role !== "PATIENT") {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  const ownId = await resolvePatientId(req.user.id);
  if (!ownId || ownId !== patientId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}

export async function listDoctorsHandler(_req: Request, res: Response) {
  const data = await listDoctors();
  return res.json({ data });
}

export async function getSlotsHandler(req: Request, res: Response) {
  const parsed = slotsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }
  const date = startOfDay(parseISO(parsed.data.date));
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }
  const slots = await listSlots(parsed.data.doctorId, date);
  return res.json({ data: slots });
}

export async function bookHandler(req: Request, res: Response) {
  const parsed = bookAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const access = await assertPatientSelfOrStaff(req, parsed.data.patientId);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const appointment = await bookAppointment({
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      reasonForVisit: parsed.data.reasonForVisit,
      durationMinutes: parsed.data.durationMinutes,
      createdBy: req.user!.id,
    });
    emitAppointmentEvent("appointment:created", appointment);
    return res.status(201).json(appointment);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({
        error: "This slot was just booked by someone else. Please pick another.",
      });
    }
    throw err;
  }
}

export async function rescheduleHandler(req: Request, res: Response) {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const existing = await getAppointmentById(paramId(req));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const access = await assertPatientSelfOrStaff(req, existing.patientId);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const appointment = await rescheduleAppointment(
      existing.id,
      new Date(parsed.data.scheduledAt),
      parsed.data.doctorId,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:cancelled", existing);
    emitAppointmentEvent("appointment:created", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_RESCHEDULABLE") {
      return res.status(400).json({ error: "Appointment cannot be rescheduled" });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({
        error: "This slot was just booked by someone else. Please pick another.",
      });
    }
    throw err;
  }
}

export async function cancelHandler(req: Request, res: Response) {
  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "cancelReason is required" });
  }

  const existing = await getAppointmentById(paramId(req));
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  if (req.user.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user.id);
    if (!staffId || staffId !== existing.doctorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else if (req.user.role === "PATIENT") {
    const access = await assertPatientSelfOrStaff(req, existing.patientId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
  } else if (!["ADMIN", "RECEPTIONIST"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const appointment = await cancelAppointment(existing.id, parsed.data.cancelReason);
  emitAppointmentEvent("appointment:cancelled", appointment);
  return res.json(appointment);
}

/**
 * Nurse may only flip status (check-in). Reject bodies that try to change other fields.
 */
export async function checkInHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  if (req.user.role === "NURSE") {
    const body = req.body ?? {};
    const keys = Object.keys(body).filter((k) => body[k] !== undefined);
    const allowed = keys.every((k) => k === "status");
    if (!allowed) {
      return res.status(403).json({
        error: "Nurses may only update appointment status (check-in)",
      });
    }
    if (body.status !== undefined && body.status !== "CHECKED_IN") {
      return res.status(403).json({
        error: "Nurses may only update appointment status (check-in)",
      });
    }
  }

  try {
    const appointment = await checkInAppointment(paramId(req));
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:checked_in", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only scheduled appointments can be checked in" });
    }
    throw err;
  }
}

export async function completeHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const existing = await getAppointmentById(paramId(req));
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (req.user.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user.id);
    if (!staffId || staffId !== existing.doctorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const appointment = await completeAppointment(existing.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:completed", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Appointment cannot be completed" });
    }
    throw err;
  }
}

export async function noShowHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  try {
    const appointment = await markNoShow(paramId(req));
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:no_show", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only scheduled or checked-in appointments can be marked no-show" });
    }
    throw err;
  }
}

export async function waitlistHandler(req: Request, res: Response) {
  const waitlistEnabled = await getSetting<boolean>(
    "features.appointmentWaitlist",
  );
  if (!waitlistEnabled) {
    return res.status(403).json({ error: "Appointment waitlist is disabled" });
  }

  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const access = await assertPatientSelfOrStaff(req, parsed.data.patientId);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const entry = await joinWaitlist({
    patientId: parsed.data.patientId,
    doctorId: parsed.data.doctorId,
    preferredDate: parseISO(parsed.data.preferredDate),
  });
  return res.status(201).json(entry);
}

export async function queueHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const doctorId = paramId(req);

  if (req.user.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user.id);
    if (!staffId || staffId !== doctorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else if (!["NURSE", "ADMIN", "RECEPTIONIST"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const data = await getTodayQueue(doctorId);
  return res.json({ data });
}

export async function mePatientHandler(req: Request, res: Response) {
  const patientId = await resolvePatientId(req.user!.id);
  if (!patientId) return res.status(404).json({ error: "No patient profile" });
  return res.json({ id: patientId });
}
