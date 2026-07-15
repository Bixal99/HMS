/** Shared helpers so bell + history show detail and route consistently. */

export type NotificationLike = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  meta?: unknown;
};

function asRecord(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  return meta as Record<string, unknown>;
}

function personName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const first = typeof row.firstName === "string" ? row.firstName : "";
  const last = typeof row.lastName === "string" ? row.lastName : "";
  const mrn = typeof row.mrn === "string" ? row.mrn : "";
  const name = `${first} ${last}`.trim();
  if (name && mrn) return `${name} · ${mrn}`;
  return name || mrn || null;
}

function doctorName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const user = row.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (typeof u.name === "string" && u.name.trim()) return u.name.trim();
    if (typeof u.email === "string") return u.email;
  }
  return null;
}

function whenText(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Prefer stored body; otherwise rebuild from meta for older rows. */
export function notificationBody(item: NotificationLike): string | null {
  if (item.body?.trim()) return item.body;
  const meta = asRecord(item.meta);
  if (!meta) return null;

  if (typeof meta.patientName === "string" && meta.patientName.trim()) {
    const extras = [
      typeof meta.testName === "string" ? meta.testName : null,
      typeof meta.categoryName === "string" ? meta.categoryName : null,
      typeof meta.modalityName === "string" ? meta.modalityName : null,
      typeof meta.wardName === "string" ? meta.wardName : null,
      whenText(meta.scheduledAt),
    ].filter(Boolean);
    return extras.length ? `${meta.patientName} · ${extras.join(" · ")}` : meta.patientName;
  }

  const patient = personName(meta.patient);
  const doctor = doctorName(meta.doctor);
  const when = whenText(meta.scheduledAt);
  const bits = [patient, doctor, when].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

/** Resolve a click destination when href was never stored. */
export function notificationHref(
  item: NotificationLike,
  role?: string,
): string | null {
  if (item.href) return item.href;
  const meta = asRecord(item.meta);
  const type = item.type;
  const isPatient = role === "PATIENT";
  const apptId = typeof meta?.id === "string" ? meta.id : null;

  if (type.startsWith("appointment:")) {
    if (isPatient) {
      return apptId
        ? `/portal/appointments/${apptId}`
        : "/portal/appointments";
    }
    if (type === "appointment:pending" || type === "appointment:reschedule_requested") {
      return "/appointments/pending";
    }
    return "/appointments/queue";
  }
  if (isPatient) {
    if (type.startsWith("lab:") || type.startsWith("radiology:")) return "/portal";
    if (type.startsWith("pharmacy:")) return "/portal/prescriptions";
    if (type.startsWith("billing:")) return "/portal/bills";
    return "/portal/notifications";
  }
  if (type.startsWith("lab:")) return "/lab/queue";
  if (type.startsWith("pharmacy:")) return "/pharmacy/queue";
  if (type.startsWith("radiology:")) return "/radiology/queue";
  if (type.startsWith("billing:") || type === "pharmacy:dispensed") return "/billing";
  if (type.startsWith("ward:") || type.startsWith("nursing:")) return "/wards/nursing";
  if (typeof meta?.encounterId === "string") return `/encounters/${meta.encounterId}`;
  if (typeof meta?.patientId === "string") return `/patients/${meta.patientId}`;
  return "/notifications";
}
