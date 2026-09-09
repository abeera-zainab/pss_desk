import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { generateCaseNumber, generateTaskReferenceId } from "./lib/generateReferenceId";

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@office.local" },
    update: {},
    create: { name: "Admin User", email: "admin@office.local", passwordHash: password, role: "ADMIN" }
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@office.local" },
    update: {},
    create: { name: "Manager User", email: "manager@office.local", passwordHash: password, role: "MANAGER" }
  });

  const worker = await prisma.user.upsert({
    where: { email: "worker@office.local" },
    update: {},
    create: { name: "Worker User", email: "worker@office.local", passwordHash: password, role: "WORKER" }
  });

  await prisma.user.upsert({
    where: { email: "worker2@office.local" },
    update: {},
    create: { name: "Second Worker", email: "worker2@office.local", passwordHash: password, role: "WORKER" }
  });

  // Only create sample data once (keeps `npm run seed` idempotent).
  const existingCases = await prisma.case.count();
  if (existingCases === 0) {
    const deadline = new Date(Date.now() + 14 * 86_400_000); // two weeks out

    // Generated, never hardcoded: writing "CASE-0001" directly left the
    // case_number counter at zero, so the first case created through the UI
    // generated CASE-0001 as well and died on the unique constraint. The tasks
    // below already went through their generator; the case has to as well.
    const sampleCaseNumber = await generateCaseNumber();

    const sampleCase = await prisma.case.create({
      data: {
        caseNumber: sampleCaseNumber,
        title: "Client Onboarding - Acme Corp",
        description: "Collect, verify and file all onboarding documents for the new client.",
        priority: "HIGH",
        status: "OPEN",
        createdBy: admin.id,
        assignedManagerId: manager.id,
        deadline,
        requiredDocuments: ["Signed contract (PDF)", "ID verification", "Tax form W-9"]
      }
    });

    // Task A - ready to start.
    const taskAReferenceId = await generateTaskReferenceId("FR");
    const taskA = await prisma.task.create({
      data: {
        taskType: "FR",
        referenceId: taskAReferenceId,
        title: "Collect client documents",
        description: "Gather all required onboarding documents from the client.",
        instructions: "Upload each document as a separate PDF. Mark submitted when complete.",
        priority: "HIGH",
        status: "PENDING",
        caseId: sampleCase.id,
        assignedUserId: worker.id,
        deadline
      }
    });

    // Task B - depends on A, so it starts LOCKED until A is approved.
    const taskBReferenceId = await generateTaskReferenceId("GEO_LOCATION");
    await prisma.task.create({
      data: {
        taskType: "GEO_LOCATION",
        referenceId: taskBReferenceId,
        title: "Verify and file documents",
        description: "Verify the collected documents and file them in the system.",
        instructions: "Only start once the collection task has been approved.",
        priority: "MEDIUM",
        status: "LOCKED",
        caseId: sampleCase.id,
        assignedUserId: worker.id,
        dependsOnTaskId: taskA.id,
        deadline
      }
    });
  }

  console.log("Seed complete. Login with any of:");
  console.log("  admin@office.local    / Password123!  (ADMIN)");
  console.log("  manager@office.local  / Password123!  (MANAGER)");
  console.log("  worker@office.local   / Password123!  (WORKER)");
  console.log("  worker2@office.local  / Password123!  (WORKER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());