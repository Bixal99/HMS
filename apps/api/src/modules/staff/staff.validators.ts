import { z } from "zod";

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum([
    "ADMIN",
    "DOCTOR",
    "NURSE",
    "RECEPTIONIST",
    "PHARMACIST",
    "LAB_TECHNICIAN",
    "BILLING_OFFICER",
  ]),
  employeeCode: z.string().min(1),
  departmentId: z.string().uuid(),
  designation: z.string().min(1),
  specialization: z.string().optional().or(z.literal("")),
});

export const availabilityBlockSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMins: z.number().int().min(5).max(120).default(15),
});

export const replaceAvailabilitySchema = z.object({
  blocks: z.array(availabilityBlockSchema),
});

export const createLeaveSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(1).max(500),
});

export const patchLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const listStaffQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  specialization: z.string().optional(),
});
