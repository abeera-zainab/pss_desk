import request from "supertest";
import { app, resetDb, makeUser, loginToken } from "./helpers";
import { prisma } from "../src/lib/prisma";

let adminT: string, mgrT: string, mgr2T: string, workerT: string, worker2T: string;
let managerId: string, workerId: string;
let caseId: string, taskAId: string, taskBId: string;

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const soon = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

beforeAll(async () => {
  await resetDb();
  await makeUser("ADMIN", "admin@test.local");
  const mgr = await makeUser("MANAGER", "mgr@test.local");
  await makeUser("MANAGER", "mgr2@test.local");
  const wk = await makeUser("WORKER", "wk@test.local");
  await makeUser("WORKER", "wk2@test.local");
  managerId = mgr.id;
  workerId = wk.id;

  adminT = await loginToken("admin@test.local");
  mgrT = await loginToken("mgr@test.local");
  mgr2T = await loginToken("mgr2@test.local");
  workerT = await loginToken("wk@test.local");
  worker2T = await loginToken("wk2@test.local");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("case & task workflow", () => {
  it("only an admin can create a case", async () => {
    const body = {
      title: "Onboarding",
      description: "Docs",
      priority: "HIGH",
      assignedManagerId: managerId,
      deadline: soon(),
      requiredDocuments: ["Contract"]
    };
    const denied = await request(app).post("/api/cases").set(bearer(workerT)).send(body);
    expect(denied.status).toBe(403);

    const res = await request(app).post("/api/cases").set(bearer(adminT)).send(body);
    expect(res.status).toBe(201);
    caseId = res.body.id;
  });

  it("scopes case visibility to the assigned manager", async () => {
    const mine = await request(app).get("/api/cases").set(bearer(mgrT));
    expect(mine.body.total).toBe(1);
    const others = await request(app).get("/api/cases").set(bearer(mgr2T));
    expect(others.body.total).toBe(0);
  });

  it("a manager can only create tasks in their own case", async () => {
    const foreign = await request(app)
      .post("/api/tasks")
      .set(bearer(mgr2T))
      .send({
        title: "X",
        description: "Y",
        priority: "LOW",
        assignedUserId: workerId,
        caseId,
        deadline: soon()
      });
    expect(foreign.status).toBe(403);
  });

  it("creates task A (PENDING) and dependent task B (LOCKED)", async () => {
    const a = await request(app)
      .post("/api/tasks")
      .set(bearer(mgrT))
      .send({
        title: "Collect docs",
        description: "Gather",
        priority: "HIGH",
        assignedUserId: workerId,
        caseId,
        deadline: soon()
      });
    expect(a.status).toBe(201);
    expect(a.body.status).toBe("PENDING");
    taskAId = a.body.id;

    const b = await request(app)
      .post("/api/tasks")
      .set(bearer(mgrT))
      .send({
        title: "Verify docs",
        description: "Check",
        priority: "MEDIUM",
        assignedUserId: workerId,
        caseId,
        dependsOnTaskId: taskAId,
        deadline: soon()
      });
    expect(b.status).toBe(201);
    expect(b.body.status).toBe("LOCKED");
    taskBId = b.body.id;
  });

  it("enforces the worker state machine and locked read-only rule", async () => {
    // Start A
    const start = await request(app)
      .put(`/api/tasks/${taskAId}/status`)
      .set(bearer(workerT))
      .send({ status: "IN_PROGRESS" });
    expect(start.status).toBe(200);

    // Cannot touch the LOCKED task B
    const locked = await request(app)
      .put(`/api/tasks/${taskBId}/status`)
      .set(bearer(workerT))
      .send({ status: "IN_PROGRESS" });
    expect(locked.status).toBe(403);

    // Cannot jump straight to COMPLETED
    const jump = await request(app)
      .put(`/api/tasks/${taskAId}/status`)
      .set(bearer(workerT))
      .send({ status: "COMPLETED" });
    expect(jump.status).toBe(400);

    // Submit A
    const submit = await request(app)
      .put(`/api/tasks/${taskAId}/status`)
      .set(bearer(workerT))
      .send({ status: "SUBMITTED" });
    expect(submit.status).toBe(200);
  });

  it("only a manager can approve, and approval unlocks the dependent task", async () => {
    const workerTry = await request(app).put(`/api/tasks/${taskAId}/approve`).set(bearer(workerT));
    expect(workerTry.status).toBe(403);

    const approve = await request(app).put(`/api/tasks/${taskAId}/approve`).set(bearer(mgrT));
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe("COMPLETED");

    const b = await request(app).get(`/api/tasks/${taskBId}`).set(bearer(mgrT));
    expect(b.body.status).toBe("PENDING"); // unlocked
  });

  it("rejection requires a comment and returns the task to IN_PROGRESS", async () => {
    await request(app).put(`/api/tasks/${taskBId}/status`).set(bearer(workerT)).send({ status: "IN_PROGRESS" });
    await request(app).put(`/api/tasks/${taskBId}/status`).set(bearer(workerT)).send({ status: "SUBMITTED" });

    const noComment = await request(app).put(`/api/tasks/${taskBId}/reject`).set(bearer(mgrT)).send({});
    expect(noComment.status).toBe(400);

    const rejected = await request(app)
      .put(`/api/tasks/${taskBId}/reject`)
      .set(bearer(mgrT))
      .send({ comment: "Re-scan page 2" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("IN_PROGRESS");

    const comments = await request(app).get(`/api/tasks/${taskBId}/comments`).set(bearer(workerT));
    expect(comments.body.some((c: any) => c.message.includes("Re-scan page 2"))).toBe(true);
  });

  it("enforces the file MIME whitelist and download permissions", async () => {
    const exe = await request(app)
      .post(`/api/tasks/${taskAId}/files`)
      .set(bearer(workerT))
      .attach("file", Buffer.from("MZbad"), { filename: "evil.exe", contentType: "application/x-msdownload" });
    expect(exe.status).toBe(400);

    const pdf = await request(app)
      .post(`/api/tasks/${taskAId}/files`)
      .set(bearer(workerT))
      .attach("file", Buffer.from("%PDF-1.4 test"), { filename: "report.pdf", contentType: "application/pdf" });
    expect(pdf.status).toBe(201);
    const fileId = pdf.body.id;
    expect(pdf.body.storedName).toBeUndefined(); // internal name never exposed

    const owner = await request(app).get(`/api/files/${fileId}/download`).set(bearer(workerT));
    expect(owner.status).toBe(200);

    const stranger = await request(app).get(`/api/files/${fileId}/download`).set(bearer(worker2T));
    expect(stranger.status).toBe(403);
  });

  it("generates notifications for the worker", async () => {
    const res = await request(app).get("/api/notifications").set(bearer(workerT));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
