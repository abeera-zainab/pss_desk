import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import * as commentService from "../services/comment.service";
import * as taskLinkService from "../services/tasklink.service";

export async function create(req: Request, res: Response) {
  res.status(201).json(await taskService.createTask(req.user!, req.body));
}

export async function list(req: Request, res: Response) {
  res.json(await taskService.listTasks(req.user!, req.query));
}

export async function getOne(req: Request, res: Response) {
  res.json(await taskService.getTask(req.user!, req.params.id));
}

export async function updateStatus(req: Request, res: Response) {
  res.json(await taskService.changeStatus(req.user!, req.params.id, req.body.status));
}

export async function assign(req: Request, res: Response) {
  res.json(await taskService.assignTask(req.user!, req.params.id, req.body.assignedUserId));
}

// Assign multiple users to a task
export async function assignMultiple(req: Request, res: Response) {
  res.json(await taskService.assignMultipleUsers(req.user!, req.params.id, req.body.userIds));
}

export async function approve(req: Request, res: Response) {
  res.json(await taskService.approveTask(req.user!, req.params.id));
}

export async function reject(req: Request, res: Response) {
  res.json(await taskService.rejectTask(req.user!, req.params.id, req.body.comment));
}

export async function addComment(req: Request, res: Response) {
  res.status(201).json(await commentService.addComment(req.user!, req.params.id, req.body.message));
}

export async function listComments(req: Request, res: Response) {
  res.json(await commentService.listComments(req.user!, req.params.id));
}

export async function edit(req: Request, res: Response) {
  const task = await taskService.editTask(req.user!, req.params.id, req.body);
  res.json(task);
}

export async function addLink(req: Request, res: Response) {
  res
    .status(201)
    .json(await taskLinkService.addTaskLink(req.user!, req.params.id, req.body.url, req.body.label));
}

export async function listLinks(req: Request, res: Response) {
  res.json(await taskLinkService.listTaskLinks(req.user!, req.params.id));
}

export async function removeLink(req: Request, res: Response) {
  await taskLinkService.deleteTaskLink(req.user!, req.params.id, req.params.linkId);
  res.status(204).send();
}