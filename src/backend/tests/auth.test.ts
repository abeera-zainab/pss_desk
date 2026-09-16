import request from "supertest";
import { app, resetDb, makeUser } from "./helpers";
import { prisma } from "../src/lib/prisma";

beforeAll(async () => {
  await resetDb();
  await makeUser("ADMIN", "admin@test.local", "Admin");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth", () => {
  it("logs in with valid credentials and sets a refresh cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.local", password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe("ADMIN");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("casedesk_refresh="))).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.local", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("logs in with username as well as email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "admin", password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("admin");
  });

  it("lets the signed-in user change their password", async () => {
    await makeUser("WORKER", "changer@test.local", "Changer");
    const login = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "changer", password: "Password123!" });
    const changed = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: "Password123!", newPassword: "NewPass123!" });
    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "changer@test.local", password: "Password123!" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "changer", password: "NewPass123!" });
    expect(newLogin.status).toBe(200);
  });

  it("returns the current user from /auth/me", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.local", password: "Password123!" });
    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("admin@test.local");
  });

  it("rejects /auth/me without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("refreshes with the cookie, and logout invalidates the session", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.local", password: "Password123!" });
    const cookie = (login.headers["set-cookie"] as unknown as string[])[0];

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    // The rotated cookie from the refresh is what a browser would now hold.
    const rotated = (refreshed.headers["set-cookie"] as unknown as string[])[0];
    await request(app).post("/api/auth/logout").set("Cookie", rotated);

    const afterLogout = await request(app).post("/api/auth/refresh").set("Cookie", rotated);
    expect(afterLogout.status).toBe(401);
  });
});
