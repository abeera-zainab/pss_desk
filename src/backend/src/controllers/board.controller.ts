import { Request, Response } from "express";
import * as boardService from "../services/board.service";
import { badRequest } from "../utils/errors";

export async function list(req: Request, res: Response) {
  const { caseId } = req.params;
  res.json(await boardService.listBoardItems(req.user!, caseId));
}

export async function add(req: Request, res: Response) {
  const { caseId } = req.params;
  if (!req.file) throw badRequest("No file uploaded");
  const x = Number(req.body.x) || 0;
  const y = Number(req.body.y) || 0;
  const description = req.body.description || undefined;
  const item = await boardService.addBoardItem(req.user!, caseId, req.file, x, y, description);
  res.status(201).json(item);
}

export async function move(req: Request, res: Response) {
  const { x, y } = req.body;
  const item = await boardService.moveBoardItem(req.user!, req.params.id, x, y);
  res.json(item);
}

export async function updateDescription(req: Request, res: Response) {
  const { description } = req.body;
  if (typeof description !== "string") throw badRequest("description must be a string");
  const item = await boardService.updateBoardItemDescription(req.user!, req.params.id, description);
  res.json(item);
}

export async function remove(req: Request, res: Response) {
  res.json(await boardService.deleteBoardItem(req.user!, req.params.id));
}

export async function listConn(req: Request, res: Response) {
  const { caseId } = req.params;
  res.json(await boardService.listConnections(req.user!, caseId));
}

export async function addConn(req: Request, res: Response) {
  const { caseId } = req.params;
  const { fromItemId, toItemId, label } = req.body;
  if (!fromItemId || !toItemId) throw badRequest("fromItemId and toItemId are required");
  res.status(201).json(await boardService.addConnection(req.user!, caseId, fromItemId, toItemId, label));
}

export async function removeConn(req: Request, res: Response) {
  res.json(await boardService.deleteConnection(req.user!, req.params.id));
}