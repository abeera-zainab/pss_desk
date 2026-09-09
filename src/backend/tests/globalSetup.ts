import { execSync } from "child_process";

// Sync the schema into the test database once before the suite runs.
// Kept in step with tests/env.ts - override both with TEST_DATABASE_URL.
export default async function globalSetup() {
  const DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    "postgresql://casedesk:casedesk@localhost:11804/casedesk_test?schema=public";
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL }
  });
}
