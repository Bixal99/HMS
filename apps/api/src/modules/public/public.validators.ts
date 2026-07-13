import { z } from "zod";

export const contactBodySchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  message: z.string().min(10).max(4000),
  phone: z.string().max(40).optional(),
});
