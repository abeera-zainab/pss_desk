import { PrismaClient } from "@prisma/client";

// Reuse a single Prisma client instance across the app (avoids exhausting DB connections)
export const prisma = new PrismaClient();
