import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { prisma } from "../../lib/prisma";
import { resolvePatientId } from "../appointments/appointments.service";

const router = Router();
router.use(authenticate);
router.use(authorize("PATIENT"));

router.get("/search", async (req: Request, res: Response) => {
  const patientId = await resolvePatientId(req.user!.id);
  if (!patientId) return res.status(404).json({ error: "No patient profile" });

  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

  const quickActions = [
    { id: "book", label: "Book Appointment", href: "/appointments/book", type: "action" as const },
    { id: "appointments", label: "My Appointments", href: "/portal/appointments", type: "action" as const },
    { id: "prescriptions", label: "Prescriptions", href: "/portal/prescriptions", type: "action" as const },
    { id: "bills", label: "Bills & Payments", href: "/portal/bills", type: "action" as const },
    { id: "notifications", label: "Notifications", href: "/portal/notifications", type: "action" as const },
  ].filter((a) => !q || a.label.toLowerCase().includes(q));

  if (!q) {
    return res.json({
      data: {
        quickActions,
        appointments: [],
        doctors: [],
        departments: [],
        records: [],
      },
    });
  }

  const [appointments, doctors, departments, prescriptions, invoices] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          patientId,
          OR: [
            { reasonForVisit: { contains: q, mode: "insensitive" } },
            { doctor: { user: { name: { contains: q, mode: "insensitive" } } } },
          ],
        },
        take: 8,
        orderBy: { scheduledAt: "desc" },
        include: {
          doctor: { select: { user: { select: { name: true } }, department: { select: { name: true } } } },
        },
      }),
      prisma.staff.findMany({
        where: {
          isActive: true,
          user: { role: "DOCTOR" },
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { specialization: { contains: q, mode: "insensitive" } },
            { department: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 8,
        select: {
          id: true,
          specialization: true,
          department: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.department.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 8,
        select: { id: true, name: true },
      }),
      prisma.prescription.findMany({
        where: { patientId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, status: true },
      }),
      prisma.invoice.findMany({
        where: { patientId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, invoiceNumber: true, status: true, totalCents: true },
      }),
    ]);

  return res.json({
    data: {
      quickActions,
      appointments: appointments.map((a) => ({
        id: a.id,
        label: `${a.doctor.user.name ?? "Doctor"} · ${a.status}`,
        href: `/portal/appointments/${a.id}`,
        scheduledAt: a.scheduledAt,
      })),
      doctors: doctors.map((d) => ({
        id: d.id,
        label: d.user.name ?? "Doctor",
        subtitle: `${d.department.name}${d.specialization ? ` · ${d.specialization}` : ""}`,
        href: `/appointments/book?doctorId=${d.id}`,
      })),
      departments: departments.map((d) => ({
        id: d.id,
        label: d.name,
        href: `/appointments/book?departmentId=${d.id}`,
      })),
      records: [
        ...prescriptions
          .filter(() => "prescription".includes(q) || q.length < 3)
          .map((p) => ({
            id: p.id,
            label: "Prescription",
            subtitle: p.status,
            href: "/portal/prescriptions",
          })),
        ...invoices.map((inv) => ({
          id: inv.id,
          label: inv.invoiceNumber ?? "Invoice",
          subtitle: inv.status,
          href: `/portal/bills`,
        })),
      ],
    },
  });
});

export default router;
