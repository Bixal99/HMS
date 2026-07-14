"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { API_BASE, apiFetch } from "@/lib/api";

type RoleHandoffListenerProps = {
  role: string;
};

type MeHealth = {
  staffId?: string | null;
};

export function RoleHandoffListener({ role }: RoleHandoffListenerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<MeHealth>("/health/me")
      .then((me) => {
        if (!cancelled) setStaffId(me.staffId ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket: Socket = io(API_BASE, { withCredentials: true });
    const go = (href: string) => () => router.push(href);
    const invalidate = (...keys: string[]) => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: [key] });
    };

    if (role === "DOCTOR") {
      socket.on(
        "appointment:created",
        (payload: {
          doctorId?: string;
          patient?: { firstName?: string; lastName?: string };
        }) => {
          if (staffId && payload.doctorId && payload.doctorId !== staffId) return;
          const name = payload.patient
            ? `${payload.patient.firstName ?? ""} ${payload.patient.lastName ?? ""}`.trim()
            : "A patient";
          toast.info(`New appointment: ${name || "patient"}`, {
            action: { label: "Open queue", onClick: go("/appointments/queue") },
            duration: 10_000,
          });
          invalidate("queue");
        },
      );
      socket.on(
        "appointment:checked_in",
        (payload: {
          doctorId?: string;
          patient?: { firstName?: string; lastName?: string };
        }) => {
          if (staffId && payload.doctorId && payload.doctorId !== staffId) return;
          const name = payload.patient
            ? `${payload.patient.firstName ?? ""} ${payload.patient.lastName ?? ""}`.trim()
            : "A patient";
          toast.info(`${name || "Patient"} checked in — waiting`, {
            action: { label: "Open queue", onClick: go("/appointments/queue") },
            duration: 10_000,
          });
          invalidate("queue");
        },
      );
      socket.on(
        "lab:result_ready",
        (payload: { testName?: string; patientName?: string }) => {
          toast.success(
            `Lab ready: ${payload.testName ?? "Result"} · ${payload.patientName ?? "patient"}`,
            {
              action: { label: "Queue", onClick: go("/appointments/queue") },
              duration: 12_000,
            },
          );
        },
      );
      socket.on(
        "vitals:abnormal",
        (payload: { patientName: string; flags: string[]; encounterId: string }) => {
          toast.error(
            `Abnormal vitals: ${payload.patientName} — ${payload.flags.join(", ")}`,
            {
              action: {
                label: "Open visit",
                onClick: go(`/encounters/${payload.encounterId}`),
              },
              duration: 15_000,
            },
          );
        },
      );
      socket.on(
        "pharmacy:stock_unavailable",
        (payload: {
          medicineHint: string;
          patientName: string;
          alternatives?: string[];
        }) => {
          const alt =
            payload.alternatives && payload.alternatives.length > 0
              ? ` Alternatives: ${payload.alternatives.join(", ")}`
              : "";
          toast.warning(
            `Pharmacy out of stock: ${payload.medicineHint} · ${payload.patientName}.${alt}`,
            { duration: 16_000 },
          );
        },
      );
      socket.on(
        "appointment:cancelled",
        (payload: {
          doctorId?: string;
          patient?: { firstName?: string; lastName?: string };
        }) => {
          if (staffId && payload.doctorId && payload.doctorId !== staffId) return;
          const name = payload.patient
            ? `${payload.patient.firstName ?? ""} ${payload.patient.lastName ?? ""}`.trim()
            : "A patient";
          toast.info(`Appointment cancelled: ${name || "patient"}`, {
            action: { label: "Open queue", onClick: go("/appointments/queue") },
            duration: 10_000,
          });
          invalidate("queue");
        },
      );
      socket.on(
        "radiology:report_ready",
        (payload: { modalityName?: string }) => {
          toast.success(`Imaging report ready: ${payload.modalityName ?? "Study"}`, {
            duration: 12_000,
          });
        },
      );
      socket.on(
        "nursing:urgent_note",
        (payload: { patientName: string; preview: string }) => {
          toast.error(`Urgent nursing note: ${payload.patientName} — ${payload.preview}`, {
            action: { label: "Wards", onClick: go("/wards") },
            duration: 15_000,
          });
        },
      );
      socket.on(
        "surgery:scheduled",
        (payload: { patientName: string; scheduledStart: string }) => {
          toast.info(
            `Surgery scheduled: ${payload.patientName} · ${new Date(payload.scheduledStart).toLocaleString()}`,
            {
              action: { label: "Surgery board", onClick: go("/surgery/board") },
              duration: 12_000,
            },
          );
        },
      );
    }

    if (role === "LAB_TECHNICIAN" || role === "ADMIN") {
      socket.on(
        "lab:order_created",
        (payload: { patientName: string; testCount: number }) => {
          toast.info(
            `New lab order: ${payload.patientName} (${payload.testCount} test${payload.testCount === 1 ? "" : "s"})`,
            {
              action: { label: "Lab queue", onClick: go("/lab/queue") },
              duration: 12_000,
            },
          );
          invalidate("lab-queue-count", "lab-queue");
        },
      );
      socket.on(
        "radiology:order_created",
        (payload: { patientName: string; studyCount: number }) => {
          toast.info(
            `New imaging order: ${payload.patientName} (${payload.studyCount})`,
            {
              action: { label: "Imaging", onClick: go("/radiology/queue") },
              duration: 12_000,
            },
          );
          invalidate("radiology-queue-count");
        },
      );
    }

    if (role === "PHARMACIST" || role === "ADMIN") {
      socket.on(
        "pharmacy:rx_created",
        (payload: { patientName: string; itemCount: number }) => {
          toast.info(
            `New prescription: ${payload.patientName} (${payload.itemCount} item${payload.itemCount === 1 ? "" : "s"})`,
            {
              action: { label: "Pharmacy", onClick: go("/pharmacy/queue") },
              duration: 12_000,
            },
          );
          invalidate("pharmacy-queue-count", "pharmacy-queue");
        },
      );
    }

    if (role === "BILLING_OFFICER" || role === "ADMIN") {
      socket.on("pharmacy:dispensed", (payload: { patientName: string }) => {
        toast.info(`Pharmacy dispensed — billable: ${payload.patientName}`, {
          action: { label: "Billing", onClick: go("/billing") },
          duration: 12_000,
        });
        invalidate("billing-alerts-count");
      });
      socket.on("ward:patient_discharged", (payload: { patientName: string }) => {
        toast.info(`Patient discharged — review billing: ${payload.patientName}`, {
          action: { label: "Billing", onClick: go("/billing") },
          duration: 12_000,
        });
        invalidate("billing-alerts-count");
      });
      socket.on("surgery:completed", (payload: { patientName: string }) => {
        toast.info(`Surgery completed — billable: ${payload.patientName}`, {
          action: { label: "Billing", onClick: go("/billing") },
          duration: 12_000,
        });
        invalidate("billing-alerts-count");
      });
      socket.on(
        "encounter:finalized",
        (payload: { patientName: string }) => {
          toast.info(`Visit finalized — billable: ${payload.patientName}`, {
            action: { label: "Billing", onClick: go("/billing") },
            duration: 12_000,
          });
          invalidate("billing-alerts-count");
        },
      );
    }

    if (role === "NURSE" || role === "ADMIN") {
      socket.on(
        "ward:patient_admitted",
        (payload: { patientName: string; wardName: string; bedLabel: string }) => {
          toast.info(
            `Admitted: ${payload.patientName} · ${payload.wardName} / Bed ${payload.bedLabel}`,
            {
              action: { label: "Nursing", onClick: go("/wards/nursing") },
              duration: 12_000,
            },
          );
        },
      );
      socket.on(
        "surgery:scheduled",
        (payload: { patientName: string; scheduledStart: string }) => {
          toast.info(
            `Surgery scheduled: ${payload.patientName} · ${new Date(payload.scheduledStart).toLocaleString()}`,
            { duration: 12_000 },
          );
        },
      );
    }

    if (role === "RECEPTIONIST" || role === "ADMIN") {
      socket.on(
        "appointment:cancelled",
        (payload: {
          patient?: { firstName?: string; lastName?: string };
        }) => {
          const name = payload.patient
            ? `${payload.patient.firstName ?? ""} ${payload.patient.lastName ?? ""}`.trim()
            : "A patient";
          toast.info(`Appointment cancelled: ${name || "patient"}`, {
            action: { label: "Pending", onClick: go("/appointments/pending") },
            duration: 10_000,
          });
          invalidate("pending-appointments", "queue");
        },
      );
      socket.on("billing:payment_recorded", (payload: { amountCents: number }) => {
        toast.success(`Payment recorded · $${(payload.amountCents / 100).toFixed(2)}`, {
          action: { label: "Patients", onClick: go("/patients") },
          duration: 10_000,
        });
      });
      socket.on(
        "ward:patient_admitted",
        (payload: { patientName: string; wardName: string; bedLabel: string }) => {
          toast.info(
            `Admission: ${payload.patientName} · ${payload.wardName} / Bed ${payload.bedLabel}`,
            {
              action: { label: "Wards", onClick: go("/wards") },
              duration: 12_000,
            },
          );
        },
      );
      socket.on(
        "ward:admit_requested",
        (payload: { patientName: string; note?: string | null }) => {
          toast.info(
            `Admit requested: ${payload.patientName}${payload.note ? ` — ${payload.note}` : ""}`,
            {
              action: { label: "Admit", onClick: go("/wards") },
              duration: 14_000,
            },
          );
        },
      );
      socket.on(
        "appointment:follow_up_requested",
        (payload: {
          patientName: string;
          preferredDate?: string | null;
          note?: string | null;
        }) => {
          const extra = [
            payload.preferredDate ? `preferred ${payload.preferredDate}` : null,
            payload.note ?? null,
          ]
            .filter(Boolean)
            .join(" · ");
          toast.info(
            `Follow-up requested: ${payload.patientName}${extra ? ` — ${extra}` : ""}`,
            {
              action: { label: "Book", onClick: go("/appointments/book") },
              duration: 14_000,
            },
          );
        },
      );
      socket.on(
        "pharmacy:rx_ready",
        (payload: { patientName: string }) => {
          toast.info(`Prescription ready for pickup: ${payload.patientName}`, {
            duration: 10_000,
          });
        },
      );
      socket.on(
        "surgery:requested",
        (payload: { patientName: string; procedureName: string }) => {
          toast.info(`Surgery requested: ${payload.patientName} — ${payload.procedureName}`, {
            action: { label: "Surgery board", onClick: go("/surgery/board") },
            duration: 12_000,
          });
        },
      );
    }

    if (role === "PATIENT") {
      // pending / self-book: success page + inbox only (no duplicate socket toast)
      socket.on("appointment:confirmed", () => {
        toast.success("Appointment confirmed", {
          action: { label: "View", onClick: go("/portal/appointments") },
          duration: 8_000,
        });
        invalidate("appointments-mine", "appointments-mine-pending");
      });
      socket.on("appointment:rejected", () => {
        toast.message("Appointment unavailable", {
          action: { label: "Appointments", onClick: go("/portal/appointments") },
          duration: 10_000,
        });
        invalidate("appointments-mine", "appointments-mine-pending");
      });
      socket.on("appointment:expired", () => {
        toast.message("Request expired — please book again", {
          action: { label: "Book", onClick: go("/appointments/book") },
          duration: 10_000,
        });
        invalidate("appointments-mine", "appointments-mine-pending");
      });
      socket.on("appointment:alternative_offered", () => {
        toast.info("Alternative times offered", {
          action: { label: "Review", onClick: go("/portal/appointments") },
          duration: 10_000,
        });
      });
      socket.on("appointment:checked_in", () => {
        toast.info("You are checked in — the doctor will see you soon", {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 10_000,
        });
      });
      socket.on("appointment:doctor_ready", () => {
        toast.success("Your doctor is ready — please proceed", {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 12_000,
        });
      });
      socket.on("appointment:follow_up_requested", () => {
        toast.info(
          "A follow-up visit was requested — reception will help you book",
          {
            action: { label: "Portal", onClick: go("/portal") },
            duration: 12_000,
          },
        );
      });
      socket.on("lab:result_ready", () => {
        toast.info("Lab results are available", {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 12_000,
        });
      });
      socket.on("pharmacy:rx_created", () => {
        toast.info("A prescription was sent to pharmacy", {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 10_000,
        });
        invalidate("my-prescriptions");
      });
      socket.on("pharmacy:rx_ready", () => {
        toast.success("Prescription ready for pickup", {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 12_000,
        });
        invalidate("my-prescriptions");
      });
      socket.on("radiology:report_ready", () => {
        toast.info("Imaging report is available", {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 12_000,
        });
      });
      socket.on("billing:invoice_created", (payload: { totalCents: number }) => {
        toast.info(`New invoice · $${(payload.totalCents / 100).toFixed(2)}`, {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 12_000,
        });
        invalidate("patient-unpaid-count", "my-invoices");
      });
      socket.on("billing:payment_recorded", (payload: { amountCents: number }) => {
        toast.success(`Payment received · $${(payload.amountCents / 100).toFixed(2)}`, {
          action: { label: "Portal", onClick: go("/portal") },
          duration: 10_000,
        });
        invalidate("patient-unpaid-count", "my-invoices");
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [role, staffId, router, queryClient]);

  return null;
}
