import { prisma } from "./prisma";
import { TaskType } from "@prisma/client";

const PREFIX: Record<TaskType, string> = {
  FR: "FR",
  GEO_LOCATION: "GEO",
  CYBER_INT: "CYB"
};

export async function generateTaskReferenceId(taskType: TaskType): Promise<string> {
  const key = `task_${taskType}`;
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 }
  });
  const number = counter.value.toString().padStart(5, "0");
  return `${PREFIX[taskType]}-${number}`;
}

export async function generateCaseNumber(): Promise<string> {
  const key = "case_number";
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 }
  });
  const number = counter.value.toString().padStart(4, "0");
  return `CASE-${number}`;
}