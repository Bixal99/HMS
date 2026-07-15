import type { Request, Response } from "express";
import { parseISO, startOfDay } from "date-fns";
import {
  emitAppointmentEvent,
  emitUrgentIntakeEvent,
} from "../../lib/socket";
import {
  approveReschedule,
  assignDoctor,
  bookAppointment,
  cancelAppointment,
  checkInAppointment,
  completeAppointment,
  confirmAppointment,
  createWalkInAppointment,
  getAppointmentById,
  getTodayQueue,
  joinWaitlist,
  listDoctors,
  listMyAppointments,
  listPendingRequests,
  listRescheduleRequests,
  listSlots,
  markNoShow,
  offerAlternatives,
  pendingCounts,
  Prisma,
  rejectAppointment,
  requestReschedule,
  rescheduleAppointment,
  resolvePatientId,
  resolveStaffId,
  startConsultation,
} from "./appointments.service";
import {
  assignDoctorSchema,
  bookAppointmentSchema,
  cancelSchema,
  mineQuerySchema,
  offerAlternativeSchema,
  rejectSchema,
  rescheduleSchema,
  slotsQuerySchema,
  waitlistSchema,
  walkInSchema,
} from "./appointments.validators";
import { getSetting } from "../settings/settings.service";
import { apiError } from "./appointments.constants";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : String(id);
}

function sendApiError(
  res: Response,
  err: ReturnType<typeof apiError>,
) {
  return res.status(err.status).json({
    success: false,
    code: err.code,
    message: err.message,
    action: err.action,
  });
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

export async function listDoctorsHandler(req: Request, res: Response) {
  const departmentId =
    typeof req.query.departmentId === "string" ? req.query.departmentId : undefined;
  const data = await listDoctors(departmentId);
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

  const isPatientSelfService = req.user!.role === "PATIENT";

  try {
    const appointment = await bookAppointment({
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      reasonForVisit: parsed.data.reasonForVisit,
      durationMinutes: parsed.data.durationMinutes,
      createdBy: req.user!.id,
      intakeId: parsed.data.intakeId,
      isPatientSelfService,
      appointmentSource:
        parsed.data.appointmentSource ??
        (isPatientSelfService ? "PATIENT_PORTAL" : "RECEPTION"),
      visitType: parsed.data.visitType,
      priority: parsed.data.priority,
      actorUserId: req.user!.id,
    });

    if (isPatientSelfService) {
      emitAppointmentEvent("appointment:pending", appointment);
    } else {
      emitAppointmentEvent("appointment:confirmed", appointment);
    }

    if (appointment.intake?.isUrgent || appointment.priority === "URGENT") {
      emitUrgentIntakeEvent({
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        scheduledAt: appointment.scheduledAt.toISOString(),
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        categoryName: appointment.intake?.symptomCategory.name ?? "Urgent",
      });
    }
    return res.status(201).json(appointment);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2002" || err.code === "P2034")
    ) {
      return sendApiError(
        res,
        apiError(
          "SLOT_ALREADY_TAKEN",
          "This appointment slot is no longer available.",
          "refresh_slots",
          409,
        ),
      );
    }
    if (err instanceof Error) {
      if (err.message === "SLOT_ALREADY_TAKEN") {
        return sendApiError(
          res,
          apiError(
            "SLOT_ALREADY_TAKEN",
            "This appointment slot is no longer available.",
            "refresh_slots",
            409,
          ),
        );
      }
      if (err.message === "PATIENT_ALREADY_BOOKED") {
        return sendApiError(
          res,
          apiError(
            "PATIENT_ALREADY_BOOKED",
            "This patient already has an open appointment with this doctor today. Cancel or complete it before booking another.",
            "choose_another_day",
            409,
          ),
        );
      }
      if (err.message === "SLOT_IN_PAST") {
        return res.status(400).json({
          error: "That time has already passed. Choose a later slot.",
        });
      }
      if (err.message === "INTAKE_NOT_FOUND") {
        return res.status(404).json({ error: "Intake not found" });
      }
      if (err.message === "INTAKE_PATIENT_MISMATCH") {
        return res.status(403).json({ error: "Intake does not belong to this patient" });
      }
      if (err.message === "INTAKE_ALREADY_LINKED") {
        return res.status(409).json({ error: "Intake is already linked to an appointment" });
      }
    }
    throw err;
  }
}

export async function mineHandler(req: Request, res: Response) {
  const patientId = await resolvePatientId(req.user!.id);
  if (!patientId) return res.status(404).json({ error: "No patient profile" });
  const parsed = mineQuerySchema.safeParse(req.query);
  const data = await listMyAppointments(patientId, parsed.success ? parsed.data.filter : undefined);
  return res.json({ data });
}

export async function getOneHandler(req: Request, res: Response) {
  const appointment = await getAppointmentById(paramId(req));
  if (!appointment) return res.status(404).json({ error: "Not found" });

  if (req.user!.role === "PATIENT") {
    const access = await assertPatientSelfOrStaff(req, appointment.patientId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
  } else if (req.user!.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user!.id);
    if (!staffId || staffId !== appointment.doctorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else if (!["ADMIN", "RECEPTIONIST", "NURSE"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json(appointment);
}

export async function pendingHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const data = await listPendingRequests();
  const counts = await pendingCounts();
  return res.json({ data, counts });
}

export async function rescheduleRequestsHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const data = await listRescheduleRequests();
  return res.json({ data });
}

export async function pendingCountsHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const counts = await pendingCounts();
  return res.json({ data: counts, count: counts.total });
}

export async function confirmHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const appointment = await confirmAppointment(paramId(req), req.user!.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:confirmed", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only pending appointments can be confirmed" });
    }
    throw err;
  }
}

export async function rejectHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const appointment = await rejectAppointment(
      paramId(req),
      req.user!.id,
      parsed.data.reasonCode,
      parsed.data.reasonNote,
      parsed.data.offeredAlternatives,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:rejected", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only pending appointments can be rejected" });
    }
    throw err;
  }
}

export async function offerAlternativeHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const parsed = offerAlternativeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const appointment = await offerAlternatives(
      paramId(req),
      req.user!.id,
      parsed.data.alternatives,
      parsed.data.note,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:alternative_offered", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only pending appointments can receive alternatives" });
    }
    throw err;
  }
}

export async function assignDoctorHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const parsed = assignDoctorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const appointment = await assignDoctor(
      paramId(req),
      parsed.data.doctorId,
      req.user!.id,
      parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:doctor_changed", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return sendApiError(
        res,
        apiError("SLOT_ALREADY_TAKEN", "That slot is no longer available.", "refresh_slots", 409),
      );
    }
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Doctor cannot be changed for this appointment" });
    }
    throw err;
  }
}

export async function requestRescheduleHandler(req: Request, res: Response) {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const patientId = await resolvePatientId(req.user!.id);
  if (!patientId) return res.status(404).json({ error: "No patient profile" });
  try {
    const appointment = await requestReschedule(
      paramId(req),
      patientId,
      new Date(parsed.data.scheduledAt),
      parsed.data.doctorId,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:reschedule_requested", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Cannot request reschedule for this appointment" });
    }
    throw err;
  }
}

export async function approveRescheduleHandler(req: Request, res: Response) {
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const appointment = await approveReschedule(paramId(req), req.user!.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:confirmed", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_RESCHEDULE_REQUEST") {
      return res.status(400).json({ error: "No reschedule request pending" });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return sendApiError(
        res,
        apiError("SLOT_ALREADY_TAKEN", "That slot is no longer available.", "refresh_slots", 409),
      );
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

  if (req.user!.role === "PATIENT") {
    return requestRescheduleHandler(req, res);
  }
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const appointment = await rescheduleAppointment(
      existing.id,
      new Date(parsed.data.scheduledAt),
      parsed.data.doctorId,
      req.user!.id,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:confirmed", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_RESCHEDULABLE") {
      return res.status(400).json({ error: "Appointment cannot be rescheduled" });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return sendApiError(
        res,
        apiError("SLOT_ALREADY_TAKEN", "This appointment slot is no longer available.", "refresh_slots", 409),
      );
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

  if (req.user.role === "PATIENT") {
    const access = await assertPatientSelfOrStaff(req, existing.patientId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
  } else if (!["ADMIN", "RECEPTIONIST"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const appointment = await cancelAppointment(
      existing.id,
      parsed.data.cancelReason,
      req.user.id,
    );
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:cancelled", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Appointment cannot be cancelled" });
    }
    throw err;
  }
}

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
    if (body.status !== undefined && body.status !== "CHECKED_IN" && body.status !== "WAITING") {
      return res.status(403).json({
        error: "Nurses may only check in appointments",
      });
    }
  } else if (!["ADMIN", "RECEPTIONIST"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const appointment = await checkInAppointment(paramId(req), req.user.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:checked_in", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only confirmed appointments can be checked in" });
    }
    throw err;
  }
}

export async function startHandler(req: Request, res: Response) {
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
    const appointment = await startConsultation(existing.id, req.user.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:in_consultation", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Appointment cannot start consultation" });
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
    const appointment = await completeAppointment(existing.id, req.user.id);
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
  if (!["ADMIN", "RECEPTIONIST"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const appointment = await markNoShow(paramId(req), req.user.id);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    emitAppointmentEvent("appointment:no_show", appointment);
    return res.json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Only confirmed or waiting appointments can be marked no-show" });
    }
    throw err;
  }
}

export async function waitlistHandler(req: Request, res: Response) {
  const waitlistEnabled = await getSetting<boolean>("features.appointmentWaitlist");
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

export async function walkInHandler(req: Request, res: Response) {
  const parsed = walkInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const appointment = await createWalkInAppointment({
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      reasonForVisit: parsed.data.reasonForVisit,
      createdBy: req.user!.id,
    });
    emitAppointmentEvent("appointment:confirmed", appointment);
    emitAppointmentEvent("appointment:checked_in", appointment);
    return res.status(201).json(appointment);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_FREE_SLOT") {
      return res.status(409).json({ error: "No free walk-in slot available" });
    }
    throw err;
  }
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
