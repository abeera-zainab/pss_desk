import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

export const app = createApp();

// Wipe all rows between tests, respecting FK order.
export async function resetDb() {
  await prisma.file.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.case.deleteMany();
  await prisma.user.deleteMany();
}

export async function makeUser(role: "ADMIN" | "MANAGER" | "WORKER", email: string, name = email) {
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const username = email.split("@")[0].toLowerCase();
  return prisma.user.create({ data: { name, email, username, passwordHash, role } });
}

// Logs a user in and returns their access token.
export async function loginToken(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Password123!" });
  return res.body.accessToken;
}

export function auth(token: string) {
  return `Bearer ${token}`;
}
