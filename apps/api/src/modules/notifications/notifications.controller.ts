import type { Request, Response } from "express";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "./notifications.service";

export async function listHandler(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 30);
  const offset = Number(req.query.offset ?? 0);
  const result = await listNotifications(req.user!.id, limit, offset);
  res.json(result);
}

export async function unreadCountHandler(req: Request, res: Response) {
  const count = await unreadCount(req.user!.id);
  res.json({ count });
}

export async function markReadHandler(req: Request, res: Response) {
  const id = String(req.params.id);
  const updated = await markRead(req.user!.id, id);
  if (!updated) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json(updated);
}

export async function markAllReadHandler(req: Request, res: Response) {
  const result = await markAllRead(req.user!.id);
  res.json(result);
}
