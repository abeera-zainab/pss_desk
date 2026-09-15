import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { notFound, forbidden } from "../utils/errors";
import { uploadBoardFile } from "./file.service";
import { emitBoard } from "../sockets";

async function canAccessCase(_user: AuthUser, caseId: string): Promise<boolean> {
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  return !!caseRecord;
}

async function assertCaseAccess(user: AuthUser, caseId: string) {
  const allowed = await canAccessCase(user, caseId);
  if (!allowed) throw forbidden("Not authorized to view this case's board");
}

export async function listBoardItems(user: AuthUser, caseId: string) {
  await assertCaseAccess(user, caseId);
  return prisma.boardItem.findMany({
    where: { caseId },
    include: { file: true },
    orderBy: { createdAt: "asc" }
  });
}

export async function addBoardItem(
  user: AuthUser,
  caseId: string,
  file: Express.Multer.File,
  x: number,
  y: number,
  description?: string
) {
  await assertCaseAccess(user, caseId);
  const uploaded = await uploadBoardFile(user, caseId, file);
  const item = await prisma.boardItem.create({
    data: { fileId: uploaded.id, caseId, x, y, description },
    include: { file: true }
  });
  emitBoard(caseId, "board:item-added", item);
  return item;
}

export async function moveBoardItem(user: AuthUser, id: string, x: number, y: number) {
  const item = await prisma.boardItem.findUnique({ where: { id } });
  if (!item) throw notFound("Board item not found");
  await assertCaseAccess(user, item.caseId);

  const updated = await prisma.boardItem.update({
    where: { id },
    data: { x, y },
    include: { file: true }
  });
  emitBoard(item.caseId, "board:item-moved", updated);
  return updated;
}

export async function updateBoardItemDescription(user: AuthUser, id: string, description: string) {
  const item = await prisma.boardItem.findUnique({ where: { id } });
  if (!item) throw notFound("Board item not found");
  await assertCaseAccess(user, item.caseId);

  const updated = await prisma.boardItem.update({
    where: { id },
    data: { description },
    include: { file: true }
  });
  emitBoard(item.caseId, "board:item-updated", updated);
  return updated;
}

export async function deleteBoardItem(user: AuthUser, id: string) {
  const item = await prisma.boardItem.findUnique({ where: { id } });
  if (!item) throw notFound("Board item not found");
  await assertCaseAccess(user, item.caseId);

  await prisma.boardItem.delete({ where: { id } });
  emitBoard(item.caseId, "board:item-deleted", { id });
  return { id };
}

export async function listConnections(user: AuthUser, caseId: string) {
  await assertCaseAccess(user, caseId);
  return prisma.boardConnection.findMany({
    where: { fromItem: { caseId } }
  });
}

export async function addConnection(
  user: AuthUser,
  caseId: string,
  fromItemId: string,
  toItemId: string,
  label?: string
) {
  await assertCaseAccess(user, caseId);

  const [fromItem, toItem] = await Promise.all([
    prisma.boardItem.findUnique({ where: { id: fromItemId } }),
    prisma.boardItem.findUnique({ where: { id: toItemId } })
  ]);
  if (!fromItem || !toItem || fromItem.caseId !== caseId || toItem.caseId !== caseId) {
    throw forbidden("Both items must belong to this case");
  }

  const conn = await prisma.boardConnection.create({ data: { fromItemId, toItemId, label } });
  emitBoard(caseId, "board:connection-added", conn);
  return conn;
}

export async function deleteConnection(user: AuthUser, id: string) {
  const conn = await prisma.boardConnection.findUnique({
    where: { id },
    include: { fromItem: true }
  });
  if (!conn) throw notFound("Connection not found");
  await assertCaseAccess(user, conn.fromItem.caseId);

  await prisma.boardConnection.delete({ where: { id } });
  emitBoard(conn.fromItem.caseId, "board:connection-deleted", { id });
  return { id };
}