import { Request, Response } from "express";
import * as statsService from "../services/stats.service";

export async function dashboard(req: Request, res: Response) {
  res.json(await statsService.dashboard(req.user!));
}
