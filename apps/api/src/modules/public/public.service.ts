import { Resend } from "resend";
import { prisma } from "../../lib/prisma";
import { getSetting } from "../settings/settings.service";

export async function listPublicDepartments() {
  return prisma.department.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}

export async function listPublicDoctors() {
  return prisma.staff.findMany({
    where: {
      isActive: true,
      user: { role: "DOCTOR", isActive: true },
    },
    select: {
      id: true,
      specialization: true,
      designation: true,
      department: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { designation: "asc" },
  });
}

export async function getPublicStats() {
  const [doctorCount, departmentCount, patientCount] = await Promise.all([
    prisma.staff.count({
      where: { isActive: true, user: { role: "DOCTOR", isActive: true } },
    }),
    prisma.department.count(),
    prisma.patient.count({ where: { deletedAt: null } }),
  ]);
  return { doctorCount, departmentCount, patientCount };
}

export async function sendContactMessage(input: {
  name: string;
  email: string;
  message: string;
  phone?: string;
}) {
  let to: string | null = null;
  try {
    to = await getSetting<string | null>("hospital.contactEmail");
  } catch {
    to = null;
  }
  to = to || process.env.HOSPITAL_CONTACT_EMAIL || null;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) {
    console.info("[public/contact] mail fallback (no Resend key or recipient)", {
      to,
      ...input,
    });
    return { delivered: false as const, mode: "logged" as const };
  }

  const resend = new Resend(apiKey);
  const hospitalName = await getSetting<string>("hospital.name").catch(
    () => "MediCore",
  );

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "MediCore <onboarding@resend.dev>",
    to,
    replyTo: input.email,
    subject: `Contact form — ${hospitalName}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      input.phone ? `Phone: ${input.phone}` : null,
      "",
      input.message,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return { delivered: true as const, mode: "resend" as const };
}
