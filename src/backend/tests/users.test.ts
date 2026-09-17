import request from "supertest";
import { app, resetDb, makeUser, loginToken, auth } from "./helpers";
import { prisma } from "../src/lib/prisma";

describe("permanent user delete", () => {
  let adminToken: string;
  let adminId: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await makeUser("ADMIN", "admin@test.local", "Admin");
    adminId = admin.id;
    adminToken = await loginToken("admin@test.local");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("removes the user from the admin list and blocks login", async () => {
    const worker = await makeUser("WORKER", "worker@test.local", "Worker");
    const del = await request(app)
      .delete(`/api/users/${worker.id}/permanent`)
      .set("Authorization", auth(adminToken));
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const list = await request(app).get("/api/users?limit=100").set("Authorization", auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.find((u: { id: string }) => u.id === worker.id)).toBeUndefined();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "worker@test.local", password: "Password123!" });
    expect(login.status).toBe(401);
  });

  it("does not allow deleting your own account", async () => {
    const res = await request(app)
      .delete(`/api/users/${adminId}/permanent`)
      .set("Authorization", auth(adminToken));
    expect(res.status).toBe(400);
  });

  it("does not allow deleting the last active admin", async () => {
    const other = await makeUser("ADMIN", "second@test.local", "Second");
    await request(app).delete(`/api/users/${adminId}`).set("Authorization", auth(adminToken));

    const res = await request(app)
      .delete(`/api/users/${other.id}/permanent`)
      .set("Authorization", auth(adminToken));
    expect(res.status).toBe(400);
  });
});
