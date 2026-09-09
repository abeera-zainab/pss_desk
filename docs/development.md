# Development

Running CaseDesk locally, outside the deployed container stack.

Development ports (11812 for the UI, 11813 for the API) are deliberately distinct
from the deployed ones (11802/11803), so `npm run dev` and `docker compose up` can
run side by side.

---

## Requirements

- Node.js 20+
- Docker, for PostgreSQL

---

## Setup

### 1. Database

The simplest route is to run just the database container from the deployed stack:

```bash
docker compose up -d db
```

That publishes Postgres on `localhost:11804` using the credentials in the root
`.env`.

### 2. Backend

```bash
cd src/backend
cp .env.example .env          # then set DATABASE_URL and the JWT secrets
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

The API starts on `http://localhost:11813` with hot reload.

### 3. Frontend

In a second terminal:

```bash
cd src/frontend
npm install
npm run dev
```

The app starts on `http://localhost:11812`.

No `.env` is needed. The app calls the API at the relative path `/api`, and the
Vite dev server proxies `/api` and `/socket.io` to port 11813 - the same
arrangement nginx provides in production, so the two environments behave alike.

### Demo accounts

`npm run seed` creates:

| Email | Role |
|---|---|
| `admin@office.local` | ADMIN |
| `manager@office.local` | MANAGER |
| `worker@office.local` | WORKER |
| `worker2@office.local` | WORKER |

All use `Password123!`. The seed is idempotent and only creates sample case data
when the database has none.

---

## Working on the code

### Layout

```
src/
├── backend/          Express API
│   ├── prisma/       schema and migration history
│   ├── src/
│   │   ├── routes/       URL to handler; attaches auth and validators
│   │   ├── controllers/  request in, service call, response out
│   │   ├── services/     business rules and permission checks
│   │   ├── validators/   Zod schemas
│   │   ├── middleware/   auth, validation, error handling
│   │   ├── sockets/      Socket.io setup and room helpers
│   │   ├── utils/        errors, logging, exports, dates
│   │   └── lib/          Prisma client, id generation
│   └── tests/
├── frontend/         React app
│   └── src/
│       ├── pages/        one file per screen
│       ├── components/   shared UI
│       ├── lib/          api client, socket, formatting, theme
│       ├── store/        Zustand state
│       └── hooks/
└── shared/types/     the contract between the two
```

[architecture.md](architecture.md) explains how a request moves through these.

### Conventions worth knowing

**Permission checks belong in services, not routes.** Routes establish who the
caller is; services decide what they may touch, using the predicates in
`services/access.service.ts`. A route that only requires authentication is not
access control - that mistake accounts for several of the findings in
[audit.md](audit.md).

**Load `assignments` whenever you check task access.** `canViewTask` grants access
to co-assigned workers as well as the primary assignee, and silently denies them
if the relation was not included in the query.

**Never build a filesystem path from client input.** Uploads get a generated UUID
and an extension chosen from the server's own MIME map.

**Day keys go through `utils/businessDay.ts`.** Attendance and leave use Postgres
`DATE` columns; building a key from local midnight files rows on the wrong day.

**Shared types must track the Prisma enums by hand.** `shared/types/index.ts`
mirrors `schema.prisma`, and nothing enforces it. Its enums are const objects with
a derived union type, not TypeScript `enum`s, so that string literals and values
parsed from JSON are both assignable.

### Database changes

```bash
cd src/backend
# edit prisma/schema.prisma, then
npx prisma migrate dev --name describe_the_change
```

Commit the generated migration. The deployed stack applies migrations with
`prisma migrate deploy`, which only ever runs committed files - so a schema change
without a migration will not reach production.

Update `src/shared/types/index.ts` in the same commit when the change affects the
API surface.

---

## Tests

```bash
cd src/backend  && npm test     # jest + supertest
cd src/frontend && npm test     # vitest
```

The backend suite needs a `casedesk_test` database; `tests/globalSetup.ts` pushes
the schema into it before running. Override the connection with
`TEST_DATABASE_URL`.

**Both suites currently fail**, and did before this review. `workflow.test.ts`
creates tasks without the `taskType` field that a later migration made required,
and `Login.test.tsx` asserts UI copy that has since changed. Neither reflects a
defect in the application - the tests have gone stale. See [audit.md](audit.md).

---

## Building

```bash
cd src/backend  && npm run build    # tsc -> dist/
cd src/frontend && npm run build    # tsc && vite build -> dist/
```

The frontend build type-checks before bundling, so a type error fails the build.
Run it before pushing; the container build runs exactly the same command and will
stop there otherwise.
