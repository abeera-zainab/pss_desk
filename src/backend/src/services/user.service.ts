import bcrypt from "bcryptjs";
import { Prisma, TaskType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { badRequest, conflict, notFound } from "../utils/errors";
import { parsePagination, paginated } from "../utils/pagination";
import { revokeAllSessions } from "./auth.service";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  managerId: true,
  domains: true
} as const;

async function assertReportingChain(
  role: "ADMIN" | "MANAGER" | "WORKER",
  managerId: string | null | undefined
) {
  if (role === "ADMIN") {
    if (managerId) throw badRequest("Admins do not report to anyone");
    return;
  }

  if (!managerId) {
    throw badRequest(
      role === "MANAGER"
        ? "Team Leads must report to an Admin"
        : "Team members must report to a Team Lead"
    );
  }

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || !manager.isActive) {
    throw badRequest("Reports-to user must be an active account");
  }

  if (role === "MANAGER" && manager.role !== "ADMIN") {
    throw badRequest("Team Leads must report to an Admin");
  }
  if (role === "WORKER" && manager.role !== "MANAGER") {
    throw badRequest("Team members must report to a Team Lead");
  }
}

export async function listUsers(query: any) {
  const p = parsePagination(query);
  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicSelect,
      orderBy: { createdAt: "desc" },
      skip: p.skip,
      take: p.take
    }),
    prisma.user.count({ where })
  ]);
  return paginated(data, total, p);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
  managerId?: string;
  domains?: TaskType[];
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("A user with that email already exists");

  const managerId = input.role === "ADMIN" ? null : input.managerId ?? null;
  await assertReportingChain(input.role, managerId);

  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      managerId,
      domains: input.domains ?? []
    },
    select: publicSelect
  });
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    role?: "ADMIN" | "MANAGER" | "WORKER";
    isActive?: boolean;
    password?: string;
    managerId?: string | null;
    domains?: TaskType[];
  }
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("User not found");

  const data: Prisma.UserUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);
  if (input.domains !== undefined) data.domains = input.domains;

  if (input.role !== undefined || input.managerId !== undefined) {
    const nextRole = input.role ?? existing.role;
    const nextManagerId =
      nextRole === "ADMIN"
        ? null
        : input.managerId !== undefined
          ? input.managerId
          : existing.managerId;
    await assertReportingChain(nextRole, nextManagerId);
    data.managerId = nextManagerId;
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data, select: publicSelect });
    // A password reset or a deactivation is a security action, so it has to end
    // the sessions that are already open. Changing only the hash leaves every
    // existing refresh token rotating normally.
    if (input.password || input.isActive === false) {
      await revokeAllSessions(id);
    }
    return updated;
  } catch {
    throw notFound("User not found");
  }
}

// Soft delete - deactivate rather than remove, preserving audit history & FKs.
export async function deactivateUser(id: string) {
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: publicSelect
    });
    await revokeAllSessions(id);
    return updated;
  } catch {
    throw notFound("User not found");
  }
}

// Managers list (for admin case-assignment dropdowns) - small, non-paginated.
export async function listManagers() {
  return prisma.user.findMany({
    where: { role: "MANAGER", isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });
}

// Assignees for task dropdowns: Admin sees Team + Team Leads; Team Leads see only their Team.
export async function listWorkers(actor: AuthUser) {
  const where: Prisma.UserWhereInput = { isActive: true };
  if (actor.role === "ADMIN") {
    where.role = { in: ["WORKER", "MANAGER"] };
  } else {
    where.role = "WORKER";
    where.managerId = actor.id;
  }
  return prisma.user.findMany({
    where,
    select: publicSelect,
    orderBy: { name: "asc" }
  });
}

// Direct reports of a manager - used by leave approval & team-scoped reports.
export async function getDirectReports(managerId: string) {
  return prisma.user.findMany({
    where: { managerId },
    select: publicSelect
  });
}

// Finds active workers whose domains include the given task type - used for
// auto-assigning a worker when a Case is created from a template.
export async function findWorkersByDomain(domain: TaskType) {
  return prisma.user.findMany({
    where: { role: "WORKER", isActive: true, domains: { has: domain } },
    select: publicSelect,
    orderBy: { createdAt: "asc" }
  });
}