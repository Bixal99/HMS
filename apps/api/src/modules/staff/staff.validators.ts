import { z } from "zod";

const baseFields = {
  email: z.string().email(),
  name: z.string().min(1),
  employeeCode: z.string().min(1),
  departmentId: z.string().uuid(),
  designation: z.string().min(1),
};

export const createStaffSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("DOCTOR"),
    ...baseFields,
    specialtyId: z.string().uuid(),
    licenseNumber: z.string().min(1),
    qualification: z.string().min(1),
    experienceYears: z.number().int().positive(),
    consultationRoom: z.string().optional(),
    consultationFeeCents: z.number().int().positive().optional(),
  }),
  z.object({
    role: z.literal("NURSE"),
    ...baseFields,
    wardId: z.string().uuid(),
    shiftPattern: z.string().min(1),
  }),
  z.object({
    role: z.literal("RECEPTIONIST"),
    ...baseFields,
    shiftPattern: z.string().min(1),
  }),
  z.object({
    role: z.literal("PHARMACIST"),
    ...baseFields,
    licenseNumber: z.string().min(1),
  }),
  z.object({
    role: z.literal("LAB_TECHNICIAN"),
    ...baseFields,
    qualification: z.string().min(1),
  }),
  z.object({
    role: z.literal("BILLING_OFFICER"),
    ...baseFields,
  }),
  z.object({
    role: z.literal("ADMIN"),
    ...baseFields,
  }),
]);

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
  specialtyId: z.string().uuid().optional(),
});
