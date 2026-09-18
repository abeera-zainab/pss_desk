-- CaseDesk schema changes for a new machine.
-- Postgres runs this after seed/database.sql on first init (empty DATA_ROOT).
-- Statements are idempotent so they are safe if the dump already includes them.
--
-- Covered here:
--   * username (sign-in name)
--   * deletedAt (permanent user delete, hidden from lists)
--   * loginNo (unique sign-in ID PSS-####)
--
-- Attendance "late after 09:45" uses the existing LATE status. No extra columns.

-- ---------- username ----------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

UPDATE "User"
SET "username" = lower(split_part("email", '@', 1))
WHERE "username" IS NULL;

WITH ranked AS (
  SELECT id, "username", row_number() OVER (PARTITION BY "username" ORDER BY "createdAt") AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = ranked."username" || '_' || substr(replace(u.id::text, '-', ''), 1, 6)
FROM ranked
WHERE u.id = ranked.id AND ranked.rn > 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'username'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- ---------- permanent delete ----------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");

-- ---------- unique sign-in ID ----------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginNo" TEXT;

WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n
  FROM "User"
)
UPDATE "User" u
SET "loginNo" = 'PSS-' || lpad(numbered.n::text, 4, '0')
FROM numbered
WHERE u.id = numbered.id AND u."loginNo" IS NULL;

INSERT INTO "Counter" ("key", "value")
SELECT 'user_login_no', COUNT(*)::int FROM "User"
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST("Counter"."value", EXCLUDED."value");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'loginNo'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "loginNo" SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_loginNo_key" ON "User"("loginNo");
