import { Request, Response } from "express";
import * as caseService from "../services/case.service";

export async function create(req: Request, res: Response) {
  res.status(201).json(await caseService.createCase(req.user!, req.body));
}

export async function list(req: Request, res: Response) {
  res.json(await caseService.listCases(req.user!, req.query));
}

export async function getOne(req: Request, res: Response) {
  res.json(await caseService.getCase(req.user!, req.params.id));
}

export async function update(req: Request, res: Response) {
  res.json(await caseService.updateCase(req.params.id, req.body));
}
// Add this function
export async function deleteCase(req: Request, res: Response) {
  res.json(await caseService.deleteCase(req.user!, req.params.id));
}