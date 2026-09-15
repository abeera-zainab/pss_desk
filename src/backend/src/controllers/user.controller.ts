import { Request, Response } from "express";
import * as userService from "../services/user.service";
import { logActivity } from "../services/activity.service";

export async function list(req: Request, res: Response) {
  res.json(await userService.listUsers(req.query));
}

export async function listManagers(_req: Request, res: Response) {
  res.json(await userService.listManagers());
}

export async function listWorkers(req: Request, res: Response) {
  res.json(await userService.listWorkers(req.user!));
}

export async function create(req: Request, res: Response) {
  const user = await userService.createUser(req.body);
  await logActivity(req.user!.id, "USER_CREATED", "USER", user.id, user.email);
  res.status(201).json(user);
}

export async function update(req: Request, res: Response) {
  const user = await userService.updateUser(req.params.id, req.body);
  await logActivity(req.user!.id, "USER_UPDATED", "USER", user.id, user.email);
  res.json(user);
}

export async function remove(req: Request, res: Response) {
  const user = await userService.deactivateUser(req.params.id);
  await logActivity(req.user!.id, "USER_DEACTIVATED", "USER", user.id, user.email);
  res.json(user);
}
