import { Request, Response } from "express";
import * as fileService from "../services/file.service";
import { badRequest } from "../utils/errors";

export async function uploadToCase(req: Request, res: Response) {
  if (!req.file) throw badRequest("No file uploaded");
  res.status(201).json(
    await fileService.uploadCaseFile(req.user!, req.params.id, req.file, req.body.folder)
  );
}

export async function uploadToTask(req: Request, res: Response) {
  if (!req.file) throw badRequest("No file uploaded");
  res.status(201).json(await fileService.uploadTaskFile(req.user!, req.params.id, req.file));
}

export async function download(req: Request, res: Response) {
  const { absolute, filename, mimetype } = await fileService.downloadFile(req.user!, req.params.id);
  // Serve the type recorded at upload, which was checked against the allow-list,
  // rather than letting Express infer one from the path. Combined with the
  // attachment disposition res.download sets and helmet's nosniff header, stored
  // evidence can never be rendered as a document in the app's own origin.
  res.type(mimetype);
  res.download(absolute, filename);
}

export async function deleteCaseFile(req: Request, res: Response) {
  res.json(await fileService.deleteCaseFile(req.user!, req.params.id, req.params.fileId));
}
