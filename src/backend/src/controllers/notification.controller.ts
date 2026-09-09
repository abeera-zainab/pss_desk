import { Request, Response } from "express";
import * as notificationService from "../services/notification.service";
import { notFound } from "../utils/errors";

export async function list(req: Request, res: Response) {
  const unreadOnly = req.query.unreadOnly === "true";
  res.json(await notificationService.listNotifications(req.user!.id, unreadOnly));
}

export async function markRead(req: Request, res: Response) {
  const ok = await notificationService.markRead(req.user!.id, req.params.id);
  if (!ok) throw notFound("Notification not found");
  res.json({ ok: true });
}
