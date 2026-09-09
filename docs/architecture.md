# Architecture

## The shape of it

Three containers on one private Docker network:

```
                    :11802
  browser  ──────────────────►  frontend (nginx)
                                  │  serves the built React bundle
                                  │  proxies /api and /socket.io
                                  ▼
                                backend (Express + Socket.io)     :11803
                                  │                                loopback
                                  ├──────────────►  db (PostgreSQL)  :11804
                                  │                                  loopback
                                  └──────────────►  /data/pss_desk/storage
```

The browser only ever talks to one port. nginx serves the static bundle and
forwards `/api` and `/socket.io` to the API container, which makes every request
same-origin: no CORS preflights, no cookie domain problems, and the compiled
bundle works on any hostname because it calls the API at the relative path `/api`.

The API and database are published on `127.0.0.1` only. Nothing outside the host
can reach them directly.

---

## Backend layers

`src/backend/src/` is a conventional four-layer Express application. A request
falls through them in order:

```
routes/        URL to handler. Attaches requireAuth and the Zod validator.
controllers/   Unwraps the request, calls a service, shapes the response.
services/      All business rules and every permission check. The real logic.
lib/prisma.ts  Database access.
```

`middleware/` holds the cross-cutting pieces: `auth.ts` verifies the access token
and populates `req.user`, `validate.ts` runs Zod schemas from `validators/`, and
`error.ts` turns thrown errors into JSON via the helpers in `utils/errors.ts`.

**Permission checks belong in the service layer, not the route layer.** Routes
establish *who* the caller is; services decide *what* that caller may touch. The
predicates live in `services/access.service.ts` (`canViewCase`, `canManageCase`,
`canViewTask`) and are called by the services that load records. A route that
merely requires authentication is not access control.

---

## Roles

Three roles, defined in `schema.prisma` and mirrored in `shared/types`:

| Role | Scope |
|---|---|
| `ADMIN` | Everything. Creates users and cases. |
| `MANAGER` | Cases assigned to them, and the tasks under those cases. |
| `WORKER` | Tasks assigned to them, and the cases those tasks belong to. |

The UI hides what a role cannot use, but that is a convenience, not a control.
Every restriction is enforced server-side as well.

---

## Authentication

Two tokens:

- **Access token** - a JWT, 15 minutes, held in JavaScript memory only, sent as
  `Authorization: Bearer`. Never written to `localStorage`, so an XSS bug cannot
  read a long-lived credential out of storage.
- **Refresh token** - random, 7 days, stored **hashed** in the `RefreshToken`
  table and returned as an httpOnly cookie scoped to `/api/auth`. JavaScript
  cannot read it, and it is not attached to ordinary API calls.

The flow:

1. `POST /api/auth/login` returns the access token in the body and sets the
   refresh cookie.
2. The access token expires. The next call gets a 401.
3. The axios interceptor in `frontend/src/lib/api.ts` calls `/api/auth/refresh`,
   gets a fresh pair, and replays the original request once. A `_retry` flag stops
   this looping, and a shared in-flight promise stops concurrent 401s from firing
   several refreshes at once.
4. If the refresh also fails, the app clears its auth state and returns to login.

Because only a hash of the refresh token is stored, a leaked database dump does not
hand over usable sessions.

---

## Realtime

Socket.io shares the HTTP server, so it needs no second port. Rooms:

| Room | Who joins | Carries |
|---|---|---|
| `user:<userId>` | that user | personal notifications |
| `case:<caseId>` | everyone on the case | case and file activity |
| `task:<taskId>` | anyone viewing the task | comments, status changes |

Notifications are written to Postgres first and then emitted. The socket is an
optimisation, not the delivery guarantee: a user who was offline still finds the
notification waiting via `GET /api/notifications`.

Room membership is a permission boundary. Joining `case:<id>` must be gated by the
same `canViewCase` check that guards the REST endpoints, or the socket becomes a
way around them.

---

## File storage

Uploads never touch the application directory. `STORAGE_ROOT` points at
`/data/storage` inside the container, which is bind-mounted from
`${DATA_ROOT}/storage` on the HDD.

```
storage/
├── cases/       case attachments
├── tasks/       task deliverables
├── board/       investigation board items
├── reports/     generated exports
└── profiles/    profile images
```

Three rules the implementation depends on:

1. **The stored filename is a server-generated UUID plus the original extension.**
   The client's filename is kept only as a display label in the `File` row. Nothing
   the client sends is ever used to build a path.
2. **There is no static file route.** The storage directory is not served by nginx.
   The only way out is `GET /api/files/:id/download`, which checks the caller's
   permission on the parent case or task before streaming the bytes.
3. **Disk and database must agree.** A `File` row records `filepath` relative to
   `STORAGE_ROOT`; the absolute path is only ever computed by joining the two.

Uploads are capped per file by `MAX_FILE_SIZE_MB` and restricted to an explicit
MIME allow-list in `file.service.ts`.

---

## Database

PostgreSQL via Prisma. The schema is `src/backend/prisma/schema.prisma`, and
`prisma/migrations/` is the ordered history that produces it.

Migrations are applied by the container entrypoint on every start, using
`prisma migrate deploy` - which only ever applies committed migration files and
never generates or infers changes. Development uses `prisma migrate dev`; the
deployed stack does not.

The cluster lives at `${DATA_ROOT}/postgres` on the HDD, in a `pgdata`
subdirectory so Postgres never has to initialise into a non-empty mount root.

---

## Frontend

Vite, React 18, TypeScript, Tailwind, React Router, Zustand for auth and
notification state, axios for HTTP.

```
src/frontend/src/
├── lib/          api client, socket client, formatting, theme tokens
├── store/        auth and notification state
├── pages/        one file per screen
├── components/   shared UI
└── hooks/        realtime subscription
```

`lib/api.ts` is the only module that talks to the network. Every endpoint is a
named method with typed arguments, so a backend change that breaks a call site
surfaces as a type error rather than a runtime 404.

`src/shared/types/` is imported by the frontend through the `@shared` alias and is
the contract between the two halves. Its enums are const objects with a derived
union type rather than TypeScript `enum`s: a real `enum` is nominal, so a status
string parsed out of a JSON response is not assignable to it even though it is the
identical value at runtime. These definitions must stay in step with the Prisma
enums by hand - nothing enforces that automatically.
