import type { Request, Response } from "express";
import {
  getPublicStats,
  listPublicDepartments,
  listPublicDoctors,
  sendContactMessage,
} from "./public.service";
import { contactBodySchema } from "./public.validators";

export async function departmentsHandler(_req: Request, res: Response) {
  const data = await listPublicDepartments();
  return res.json({ data });
}

export async function doctorsHandler(_req: Request, res: Response) {
  const data = await listPublicDoctors();
  return res.json({ data });
}

export async function statsHandler(_req: Request, res: Response) {
  const data = await getPublicStats();
  return res.json({ data });
}

export async function contactHandler(req: Request, res: Response) {
  const parsed = contactBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid contact payload" });
  }
  try {
    const result = await sendContactMessage(parsed.data);
    return res.status(202).json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unable to send message" });
  }
}
