import { z } from "zod";

export const createSurgeryRequestSchema = z.object({
  encounterId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid(),
  procedureName: z.string().min(1).max(300),
  urgency: z.enum(["ELECTIVE", "URGENT", "EMERGENCY"]).optional(),
  feeCents: z.number().int().min(0).optional().nullable(),
});

export const scheduleSurgerySchema = z
  .object({
    orRoom: z.string().min(1).max(50),
    scheduledStart: z.string().min(1),
    scheduledEnd: z.string().min(1),
    primarySurgeonId: z.string().uuid(),
    scheduleNotes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const start = new Date(val.scheduledStart);
    const end = new Date(val.scheduledEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Start and end must be valid date/times",
        path: ["scheduledStart"],
      });
      return;
    }
    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "End must be after start",
        path: ["scheduledEnd"],
      });
    }
    const year = start.getFullYear();
    const nowY = new Date().getFullYear();
    if (year < nowY - 1 || year > nowY + 2) {
      ctx.addIssue({
        code: "custom",
        message: "Use a realistic schedule year",
        path: ["scheduledStart"],
      });
    }
  });

export const completeSurgerySchema = z.object({
  operativeNotes: z.string().min(1).max(10000),
});
