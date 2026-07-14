import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { validateSessionToken } from "@shared/auth";
import { prisma } from "./prisma";
import { setIO, tryGetIO } from "./socket-io-access";
import {
  notifyPatient,
  notifyRoles,
  notifyStaff,
  queueNotify,
} from "./notifications";

export type SocketUser = {
  id: string;
  email: string;
  role: string;
  staffId?: string | null;
  patientId?: string | null;
};

/** Safe emit when socket may not be initialized (e.g. tests). */
export { tryGetIO };

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

  const io = new Server(httpServer, {
    cors: { origin: webOrigin, credentials: true },
  });
  setIO(io);

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
    socket.join(`user:${user.id}`);
    if (user.role === "DOCTOR" && user.staffId) {
      socket.join(`doctor:${user.staffId}`);
    }
    if (["NURSE", "RECEPTIONIST", "ADMIN", "DOCTOR"].includes(user.role)) {
      socket.join("staff:all");
    }
    if (user.role === "NURSE") {
      socket.join("nurse:all");
    }
    if (user.role === "LAB_TECHNICIAN") {
      socket.join("lab:all");
    }
    if (user.role === "PHARMACIST") {
      socket.join("pharmacy:all");
    }
    if (user.role === "BILLING_OFFICER") {
      socket.join("billing:all");
    }
    if (user.role === "ADMIN") {
      socket.join("lab:all");
      socket.join("pharmacy:all");
      socket.join("billing:all");
      socket.join("nurse:all");
    }
    if (user.role === "PATIENT" && user.patientId) {
      socket.join(`patient:${user.patientId}`);
    }
  });

  return io;
}

export function getIO(): Server {
  const server = tryGetIO();
  if (!server) {
    throw new Error("Socket.IO has not been initialized");
  }
  return server;
}

export type AppointmentSocketEvent =
  | "appointment:created"
  | "appointment:pending"
  | "appointment:confirmed"
  | "appointment:rejected"
  | "appointment:expired"
  | "appointment:alternative_offered"
  | "appointment:reschedule_requested"
  | "appointment:doctor_changed"
  | "appointment:checked_in"
  | "appointment:in_consultation"
  | "appointment:cancelled"
  | "appointment:completed"
  | "appointment:no_show";

type AppointmentNotifyPayload = {
  id?: string;
  doctorId: string;
  patientId?: string;
  status?: string;
  priority?: string;
};

export function emitAppointmentEvent(
  event: AppointmentSocketEvent,
  appointment: AppointmentNotifyPayload,
) {
  const server = tryGetIO();
  const apptId = appointment.id;
  const patientHref = apptId
    ? `/portal/appointments/${apptId}`
    : "/portal/appointments";
  const receptionHref = "/appointments/pending";
  const doctorHref = "/appointments/queue";

  if (server) {
    if (event === "appointment:pending" || event === "appointment:reschedule_requested") {
      server.to("staff:all").emit(event, appointment);
    } else if (
      event === "appointment:confirmed" ||
      event === "appointment:checked_in" ||
      event === "appointment:in_consultation" ||
      event === "appointment:doctor_changed"
    ) {
      server.to(`doctor:${appointment.doctorId}`).emit(event, appointment);
      server.to("staff:all").emit(event, appointment);
      if (appointment.patientId) {
        server.to(`patient:${appointment.patientId}`).emit(event, appointment);
      }
    } else if (
      event === "appointment:rejected" ||
      event === "appointment:expired" ||
      event === "appointment:alternative_offered" ||
      event === "appointment:cancelled"
    ) {
      server.to("staff:all").emit(event, appointment);
      if (appointment.patientId) {
        server.to(`patient:${appointment.patientId}`).emit(event, appointment);
      }
    } else {
      server.to(`doctor:${appointment.doctorId}`).emit(event, appointment);
      server.to("staff:all").emit(event, appointment);
      if (appointment.patientId) {
        server.to(`patient:${appointment.patientId}`).emit(event, appointment);
      }
    }
  }

  const titles: Record<AppointmentSocketEvent, string> = {
    "appointment:created": "New appointment",
    "appointment:pending": "New appointment request",
    "appointment:confirmed": "Appointment confirmed",
    "appointment:rejected": "Appointment unavailable",
    "appointment:expired": "Appointment request expired",
    "appointment:alternative_offered": "Alternative times offered",
    "appointment:reschedule_requested": "Reschedule requested",
    "appointment:doctor_changed": "Doctor updated",
    "appointment:checked_in": "Patient checked in",
    "appointment:in_consultation": "Consultation started",
    "appointment:cancelled": "Appointment cancelled",
    "appointment:completed": "Appointment completed",
    "appointment:no_show": "Patient no-show",
  };

  queueNotify(async () => {
    if (event === "appointment:pending" || event === "appointment:reschedule_requested") {
      await notifyRoles(["RECEPTIONIST", "ADMIN"], {
        type: event,
        title: titles[event],
        href: receptionHref,
        meta: appointment as Record<string, unknown>,
      });
      if (appointment.patientId && event === "appointment:pending") {
        await notifyPatient(appointment.patientId, {
          type: event,
          title: "Appointment request submitted",
          body: "Status: Pending confirmation. Our staff will review shortly.",
          href: patientHref,
          meta: appointment as Record<string, unknown>,
        });
      }
      return;
    }

    if (event === "appointment:confirmed") {
      await notifyStaff(appointment.doctorId, {
        type: event,
        title:
          appointment.priority === "URGENT" || appointment.priority === "EMERGENCY"
            ? "Urgent patient scheduled"
            : "Appointment confirmed",
        href: doctorHref,
        meta: appointment as Record<string, unknown>,
      });
      if (appointment.patientId) {
        await notifyPatient(appointment.patientId, {
          type: event,
          title: "Appointment confirmed",
          body: "Please arrive 15 minutes early.",
          href: patientHref,
          meta: appointment as Record<string, unknown>,
        });
      }
      return;
    }

    if (
      event === "appointment:rejected" ||
      event === "appointment:expired" ||
      event === "appointment:alternative_offered" ||
      event === "appointment:cancelled"
    ) {
      if (appointment.patientId) {
        await notifyPatient(appointment.patientId, {
          type: event,
          title: titles[event],
          href: patientHref,
          meta: appointment as Record<string, unknown>,
        });
      }
      if (event === "appointment:cancelled") {
        await notifyRoles(["RECEPTIONIST", "ADMIN"], {
          type: event,
          title: titles[event],
          href: receptionHref,
          meta: appointment as Record<string, unknown>,
        });
        if (appointment.doctorId) {
          await notifyStaff(appointment.doctorId, {
            type: event,
            title: titles[event],
            href: doctorHref,
            meta: appointment as Record<string, unknown>,
          });
        }
      }
      return;
    }

    if (event === "appointment:checked_in") {
      await notifyStaff(appointment.doctorId, {
        type: event,
        title: "Patient waiting",
        href: doctorHref,
        meta: appointment as Record<string, unknown>,
      });
      return;
    }

    await notifyStaff(appointment.doctorId, {
      type: event,
      title: titles[event] ?? "Appointment update",
      href: doctorHref,
      meta: appointment as Record<string, unknown>,
    });
    if (appointment.patientId && event === "appointment:completed") {
      await notifyPatient(appointment.patientId, {
        type: event,
        title: titles[event],
        href: patientHref,
        meta: appointment as Record<string, unknown>,
      });
    }
  });
}

export type UrgentIntakePayload = {
  appointmentId: string;
  doctorId: string;
  scheduledAt: string;
  patientName: string;
  categoryName: string;
};

export function emitUrgentIntakeEvent(payload: UrgentIntakePayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("staff:all").emit("intake:urgent", payload);
  queueNotify(async () => {
    await notifyRoles(["RECEPTIONIST", "ADMIN"], {
      type: "intake:urgent",
      title: "Urgent appointment request",
      body: `${payload.patientName} — ${payload.categoryName}`,
      href: "/appointments/pending",
      meta: payload,
    });
  });
}

export type LabOrderCreatedPayload = {
  labOrderId: string;
  patientName: string;
  testCount: number;
};

export function emitLabOrderCreated(payload: LabOrderCreatedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("lab:all").emit("lab:order_created", payload);
  queueNotify(async () => {
    await notifyRoles(["LAB_TECHNICIAN", "ADMIN"], {
      type: "lab:order_created",
      title: "New lab order",
      body: `${payload.patientName} · ${payload.testCount} test(s)`,
      href: "/lab/queue",
      meta: payload,
    });
  });
}

export type LabResultReadyPayload = {
  labOrderItemId: string;
  labOrderId: string;
  testName: string;
  patientName: string;
  orderedBy: string;
  patientId: string;
};

export function emitLabResultReady(payload: LabResultReadyPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`doctor:${payload.orderedBy}`).emit("lab:result_ready", payload);
  server.to(`patient:${payload.patientId}`).emit("lab:result_ready", {
    labOrderId: payload.labOrderId,
    message: "Lab results are available",
  });
  queueNotify(async () => {
    await notifyStaff(payload.orderedBy, {
      type: "lab:result_ready",
      title: "Lab results ready",
      body: `${payload.testName} · ${payload.patientName}`,
      href: `/patients`,
      meta: payload,
    });
    await notifyPatient(payload.patientId, {
      type: "lab:result_ready",
      title: "Lab results available",
      body: "Your lab results are ready to view",
      href: "/portal",
      meta: { labOrderId: payload.labOrderId },
    });
  });
}

export type PharmacyRxCreatedPayload = {
  prescriptionId: string;
  patientName: string;
  itemCount: number;
  patientId: string;
};

export function emitPharmacyRxCreated(payload: PharmacyRxCreatedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("pharmacy:all").emit("pharmacy:rx_created", payload);
  server.to(`patient:${payload.patientId}`).emit("pharmacy:rx_created", {
    prescriptionId: payload.prescriptionId,
    message: "A prescription was sent to pharmacy",
  });
  queueNotify(async () => {
    await notifyRoles(["PHARMACIST", "ADMIN"], {
      type: "pharmacy:rx_created",
      title: "New prescription",
      body: `${payload.patientName} · ${payload.itemCount} item(s)`,
      href: "/pharmacy/queue",
      meta: payload,
    });
    await notifyPatient(payload.patientId, {
      type: "pharmacy:rx_created",
      title: "Prescription sent to pharmacy",
      href: "/portal",
      meta: { prescriptionId: payload.prescriptionId },
    });
  });
}

export type PharmacyRxReadyPayload = {
  prescriptionId: string;
  patientId: string;
  patientName: string;
};

export function emitPharmacyRxReady(payload: PharmacyRxReadyPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`patient:${payload.patientId}`).emit("pharmacy:rx_ready", payload);
  server.to("staff:all").emit("pharmacy:rx_ready", payload);
  queueNotify(async () => {
    await notifyPatient(payload.patientId, {
      type: "pharmacy:rx_ready",
      title: "Prescription ready",
      body: "Your medication is ready for pickup",
      href: "/portal",
      meta: payload,
    });
  });
}

export type PharmacyStockUnavailablePayload = {
  prescriptionId: string;
  doctorId: string;
  medicineHint: string;
  patientName: string;
  alternatives?: string[];
};

export function emitPharmacyStockUnavailable(payload: PharmacyStockUnavailablePayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`doctor:${payload.doctorId}`).emit("pharmacy:stock_unavailable", payload);
  queueNotify(async () => {
    await notifyStaff(payload.doctorId, {
      type: "pharmacy:stock_unavailable",
      title: "Stock unavailable",
      body: `${payload.medicineHint} · ${payload.patientName}`,
      href: "/pharmacy/alerts",
      meta: payload,
    });
  });
}

export type VitalsAbnormalPayload = {
  encounterId: string;
  doctorId: string;
  patientName: string;
  flags: string[];
};

export function emitVitalsAbnormal(payload: VitalsAbnormalPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`doctor:${payload.doctorId}`).emit("vitals:abnormal", payload);
  queueNotify(async () => {
    await notifyStaff(payload.doctorId, {
      type: "vitals:abnormal",
      title: "Abnormal vitals",
      body: `${payload.patientName}: ${payload.flags.join(", ")}`,
      href: `/encounters/${payload.encounterId}`,
      meta: payload,
    });
  });
}

export type PharmacyDispensedPayload = {
  prescriptionId: string;
  patientId: string;
  patientName: string;
};

export function emitPharmacyDispensed(payload: PharmacyDispensedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("billing:all").emit("pharmacy:dispensed", payload);
  queueNotify(async () => {
    await notifyRoles(["BILLING_OFFICER", "ADMIN"], {
      type: "pharmacy:dispensed",
      title: "Pharmacy dispensed",
      body: payload.patientName,
      href: "/billing",
      meta: payload,
    });
  });
}

export type WardAdmitPayload = {
  admissionId: string;
  patientId: string;
  patientName: string;
  wardName: string;
  bedLabel: string;
};

export function emitPatientAdmitted(payload: WardAdmitPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("nurse:all").emit("ward:patient_admitted", payload);
  server.to("staff:all").emit("ward:patient_admitted", payload);
  queueNotify(async () => {
    await notifyRoles(["NURSE", "ADMIN"], {
      type: "ward:patient_admitted",
      title: "Patient admitted",
      body: `${payload.patientName} · ${payload.wardName} ${payload.bedLabel}`,
      href: "/wards/nursing",
      meta: payload,
    });
  });
}

export type WardDischargePayload = {
  admissionId: string;
  patientId: string;
  patientName: string;
};

export function emitPatientDischarged(payload: WardDischargePayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("billing:all").emit("ward:patient_discharged", payload);
  server.to("staff:all").emit("ward:patient_discharged", payload);
  queueNotify(async () => {
    await notifyRoles(["BILLING_OFFICER", "ADMIN"], {
      type: "ward:patient_discharged",
      title: "Ready for billing",
      body: `${payload.patientName} was discharged`,
      href: "/billing",
      meta: payload,
    });
  });
}

export type BillingInvoicePayload = {
  invoiceId: string;
  patientId: string;
  totalCents: number;
};

export function emitInvoiceCreated(payload: BillingInvoicePayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`patient:${payload.patientId}`).emit("billing:invoice_created", payload);
  server.to("staff:all").emit("billing:invoice_created", payload);
  queueNotify(async () => {
    await notifyPatient(payload.patientId, {
      type: "billing:invoice_created",
      title: "Invoice generated",
      body: `Amount due: ${(payload.totalCents / 100).toFixed(2)}`,
      href: "/portal",
      meta: payload,
    });
  });
}

export type BillingPaymentPayload = {
  invoiceId: string;
  patientId: string;
  amountCents: number;
};

export function emitPaymentRecorded(payload: BillingPaymentPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`patient:${payload.patientId}`).emit("billing:payment_recorded", payload);
  server.to("staff:all").emit("billing:payment_recorded", payload);
  queueNotify(async () => {
    await notifyPatient(payload.patientId, {
      type: "billing:payment_recorded",
      title: "Payment recorded",
      body: `Received ${(payload.amountCents / 100).toFixed(2)}`,
      href: "/portal",
      meta: payload,
    });
  });
}

export type NursingUrgentNotePayload = {
  admissionId: string;
  doctorId?: string | null;
  patientName: string;
  preview: string;
};

export function emitNursingUrgentNote(payload: NursingUrgentNotePayload) {
  const server = tryGetIO();
  if (!server) return;
  if (payload.doctorId) {
    server.to(`doctor:${payload.doctorId}`).emit("nursing:urgent_note", payload);
  }
  server.to("staff:all").emit("nursing:urgent_note", payload);
  queueNotify(async () => {
    if (payload.doctorId) {
      await notifyStaff(payload.doctorId, {
        type: "nursing:urgent_note",
        title: "Urgent nursing note",
        body: `${payload.patientName}: ${payload.preview}`,
        href: "/wards/nursing",
        meta: payload,
      });
    }
  });
}

export type RadiologyOrderCreatedPayload = {
  orderId: string;
  patientName: string;
  studyCount: number;
};

export function emitRadiologyOrderCreated(payload: RadiologyOrderCreatedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("lab:all").emit("radiology:order_created", payload);
  queueNotify(async () => {
    await notifyRoles(["LAB_TECHNICIAN", "ADMIN"], {
      type: "radiology:order_created",
      title: "New imaging order",
      body: `${payload.patientName} · ${payload.studyCount} study(ies)`,
      href: "/radiology/queue",
      meta: payload,
    });
  });
}

export type RadiologyReportReadyPayload = {
  orderId: string;
  orderedBy: string;
  patientId: string;
  modalityName: string;
};

export function emitRadiologyReportReady(payload: RadiologyReportReadyPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`doctor:${payload.orderedBy}`).emit("radiology:report_ready", payload);
  server.to(`patient:${payload.patientId}`).emit("radiology:report_ready", {
    orderId: payload.orderId,
    message: "Imaging report is available",
  });
  queueNotify(async () => {
    await notifyStaff(payload.orderedBy, {
      type: "radiology:report_ready",
      title: "Imaging report ready",
      body: payload.modalityName,
      href: "/radiology/queue",
      meta: payload,
    });
    await notifyPatient(payload.patientId, {
      type: "radiology:report_ready",
      title: "Imaging report available",
      href: "/portal",
      meta: { orderId: payload.orderId },
    });
  });
}

export type SurgeryRequestedPayload = {
  requestId: string;
  patientName: string;
  procedureName: string;
};

export function emitSurgeryRequested(payload: SurgeryRequestedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("staff:all").emit("surgery:requested", payload);
}

export type SurgeryScheduledPayload = {
  requestId: string;
  surgeonId: string;
  patientName: string;
  scheduledStart: string;
};

export function emitSurgeryScheduled(payload: SurgeryScheduledPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`doctor:${payload.surgeonId}`).emit("surgery:scheduled", payload);
  server.to("nurse:all").emit("surgery:scheduled", payload);
  server.to("staff:all").emit("surgery:scheduled", payload);
}

export type SurgeryCompletedPayload = {
  requestId: string;
  patientId: string;
  patientName: string;
};

export function emitSurgeryCompleted(payload: SurgeryCompletedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("billing:all").emit("surgery:completed", payload);
  server.to("staff:all").emit("surgery:completed", payload);
}

export type AdmitRequestedPayload = {
  encounterId: string;
  patientId: string;
  patientName: string;
  note?: string | null;
};

export function emitAdmitRequested(payload: AdmitRequestedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("staff:all").emit("ward:admit_requested", payload);
}

export type FollowUpRequestedPayload = {
  encounterId: string;
  patientId: string;
  patientName: string;
  preferredDate?: string | null;
  note?: string | null;
};

export function emitFollowUpRequested(payload: FollowUpRequestedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("staff:all").emit("appointment:follow_up_requested", payload);
  server.to(`patient:${payload.patientId}`).emit("appointment:follow_up_requested", {
    encounterId: payload.encounterId,
    preferredDate: payload.preferredDate ?? null,
    message: "A follow-up visit was requested — reception will contact you to book",
  });
}

export type EncounterFinalizedPayload = {
  encounterId: string;
  patientId: string;
  patientName: string;
};

export function emitEncounterFinalized(payload: EncounterFinalizedPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to("billing:all").emit("encounter:finalized", payload);
  queueNotify(async () => {
    await notifyRoles(["BILLING_OFFICER", "ADMIN"], {
      type: "encounter:finalized",
      title: "Encounter finalized",
      body: payload.patientName,
      href: "/billing",
      meta: payload,
    });
  });
}

export type DoctorReadyPayload = {
  appointmentId: string;
  patientId: string;
  doctorId: string;
};

export function emitDoctorReady(payload: DoctorReadyPayload) {
  const server = tryGetIO();
  if (!server) return;
  server.to(`patient:${payload.patientId}`).emit("appointment:doctor_ready", payload);
  server.to("staff:all").emit("appointment:doctor_ready", payload);
  queueNotify(async () => {
    await notifyPatient(payload.patientId, {
      type: "appointment:doctor_ready",
      title: "Doctor is ready",
      body: "Please proceed to the consultation room",
      href: "/portal",
      meta: payload,
    });
  });
}
