# API reference

Base path `/api`. Served on the same origin as the web app, so the browser calls
it at a relative URL; it is also published directly on `API_PORT` (localhost only).

## Conventions

**Authentication.** Every endpoint except `/auth/login`, `/auth/refresh` and
`/health` requires `Authorization: Bearer <access token>`. Access tokens last 15
minutes; the client refreshes them silently using the httpOnly cookie set at
login. See [architecture.md](architecture.md).

**Roles.** `ADMIN` sees everything. `MANAGER` sees cases assigned to them and
the tasks under those cases. `WORKER` sees tasks assigned to them - as primary
assignee or co-assignee - and the cases those tasks belong to.

**Errors.** Non-2xx responses are `{ "error": "message" }`.

| Status | Meaning |
|---|---|
| 400 | Validation failed, or an illegal state transition |
| 401 | Missing, malformed or expired access token |
| 403 | Authenticated, but not permitted |
| 404 | No such record, or not visible to the caller |
| 409 | Conflict, e.g. duplicate email or a second check-in |

**Pagination.** List endpoints that support it take `page` and `limit` and return
`{ data, total, page, limit, totalPages }`. Attendance and leave lists are
currently unpaginated; see [audit.md](audit.md).

---

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | No auth. `{ status, time }`. |

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }`. Returns `{ accessToken, user }` and sets the refresh cookie. Rate limited: 50 requests per 15 minutes. |
| POST | `/api/auth/refresh` | Uses the refresh cookie. Rotates it and returns a new access token. |
| POST | `/api/auth/logout` | Revokes the current refresh token and clears the cookie. |
| GET | `/api/auth/me` | The caller's own user record. |

There is no registration endpoint. Accounts are created by an admin.

## Users

Admin only, except where noted.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/users` | Paginated. Filter with `role`. |
| GET | `/api/users/managers` | All active managers. Used to populate case assignment. |
| GET | `/api/users/workers` | All active workers. |
| POST | `/api/users` | `{ name, email, password, role, managerId?, domains? }` |
| PUT | `/api/users/:id` | Partial update. Setting `password` or `isActive: false` revokes that user's sessions. |
| DELETE | `/api/users/:id` | Deactivates rather than deletes, preserving audit history. Revokes sessions. |

`domains` is a list of `TaskType` values marking which task types a worker handles.

## Cases

| Method | Path | Notes |
|---|---|---|
| GET | `/api/cases` | Paginated, scoped to the caller's role. Filter with `status`. |
| POST | `/api/cases` | Admin. May include a `tasks` array to create tasks with the case. |
| GET | `/api/cases/:id` | Includes tasks, files and board items. |
| PUT | `/api/cases/:id` | Admin, or the assigned manager. |
| DELETE | `/api/cases/:id` | Admin. Cascades to tasks, files and board items. |
| POST | `/api/cases/:id/files` | Multipart `file`. Admin or assigned manager. |

Case numbers (`CASE-0001`) are generated server-side from a counter.

## Tasks

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tasks` | Filter with `caseId`, `status`, `assignedUserId`. |
| POST | `/api/tasks` | Admin or the case's manager. |
| GET | `/api/tasks/:id` | Includes comments, files, links and activity history. |
| PUT | `/api/tasks/:id/edit` | Admin or the case's manager. |
| PUT | `/api/tasks/:id/status` | See transitions below. |
| PUT | `/api/tasks/:id/assign` | **Replaces** the primary assignee. |
| PUT | `/api/tasks/:id/assign-multiple` | `{ userIds }`. Replaces the whole team. Use this for multi-worker tasks. |
| PUT | `/api/tasks/:id/approve` | Manager. Completes the task and unlocks its dependents. |
| PUT | `/api/tasks/:id/reject` | Manager. `{ comment }` required. |
| GET/POST | `/api/tasks/:id/comments` | |
| POST | `/api/tasks/:id/files` | Multipart `file`. Any worker on the task, or its manager. |
| GET/POST | `/api/tasks/:id/links` | External URLs attached to the task. |
| DELETE | `/api/tasks/:id/links/:linkId` | |

Reference ids (`FR-00001`, `GEO-00001`, `CYB-00001`) are generated per task type.

**Status transitions.** Anything else is `400`.

| Role | Allowed |
|---|---|
| Worker | `PENDING → IN_PROGRESS`, `IN_PROGRESS → SUBMITTED` |
| Manager | `SUBMITTED → UNDER_REVIEW`, `UNDER_REVIEW → SUBMITTED` |
| Manager | `COMPLETED` and `REJECTED` only via approve / reject |

A task with an incomplete dependency is `LOCKED` and rejects every write until the
dependency is approved. Approving a task unlocks **all** of its dependents.

## Files

| Method | Path | Notes |
|---|---|---|
| GET | `/api/files/:id/download` | Permission-checked stream. |

The storage directory is never served statically; this is the only way to read an
uploaded file. Uploads are capped by `MAX_FILE_SIZE_MB` and restricted to PDF,
DOCX, XLSX, PNG, JPEG, MP4, MOV, WEBM and ZIP. The stored filename and extension
are generated by the server.

## Board

Case-scoped. All routes require view access to the case.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/cases/:caseId/board` | Items with their file metadata. |
| POST | `/api/cases/:caseId/board` | Multipart `file` plus `x`, `y`. |
| PUT | `/api/cases/:caseId/board/:id/move` | `{ x, y }` |
| PUT | `/api/cases/:caseId/board/:id/description` | `{ description }` |
| DELETE | `/api/cases/:caseId/board/:id` | |
| GET | `/api/cases/:caseId/board/connections` | |
| POST | `/api/cases/:caseId/board/connections` | `{ fromItemId, toItemId, label? }` |
| DELETE | `/api/cases/:caseId/board/connections/:id` | |

## Attendance

| Method | Path | Notes |
|---|---|---|
| POST | `/api/attendance/check-in` | 409 if already checked in today. |
| POST | `/api/attendance/check-out` | |
| GET | `/api/attendance/today` | The caller's record for today, or null. |
| GET | `/api/attendance` | `userId`, `from`, `to`. Workers see only their own; managers only their team. |

The day a record belongs to is the calendar day in `APP_TIMEZONE`.

## Leave

| Method | Path | Notes |
|---|---|---|
| POST | `/api/leave` | `{ type, startDate, endDate, reason }`. Maximum 30 days. |
| GET | `/api/leave` | `userId`, `status`. Same scoping as attendance. |
| PUT | `/api/leave/:id/approve` | Manager, for a direct report. Marks each day `ON_LEAVE`. |
| PUT | `/api/leave/:id/reject` | `{ reviewComment }` |

## Reports

| Method | Path | Notes |
|---|---|---|
| GET | `/api/reports/attendance` | `month`, `userId`, `format=pdf\|xlsx`. |
| GET | `/api/reports/performance` | Same parameters. |
| GET | `/api/reports/case/:id` | PDF dossier. Requires view access to the case. |

A manager may pass `userId` only for someone on their own team.

## Notifications

| Method | Path | Notes |
|---|---|---|
| GET | `/api/notifications` | `unreadOnly=true` to filter. |
| PUT | `/api/notifications/:id/read` | Only the owner. |

## Stats

| Method | Path | Notes |
|---|---|---|
| GET | `/api/stats/dashboard` | Counts and recent activity, scoped to the caller. |

---

## Websocket events

Socket.io on the same origin, at `/socket.io`. The access token is passed as
`auth.token` in the handshake.

**Client to server.** Both are permission-checked; a subscription the caller may
not have is declined silently.

| Event | Payload |
|---|---|
| `subscribe:case` / `unsubscribe:case` | case id |
| `subscribe:task` / `unsubscribe:task` | task id |

Each connection joins `user:<id>` automatically.

**Server to client.**

| Event | Room |
|---|---|
| `notification:new` | `user:<id>` |
| `case:updated` | `case:<id>` |
| `task:created`, `task:updated` | `case:<id>`, `task:<id>` |
| `file:new` | `case:<id>`, `task:<id>` |
| `comment:new` | `task:<id>` |
| `board:item-added`, `board:item-moved`, `board:item-removed` | `case:<id>` |
| `board:connection-added`, `board:connection-removed` | `case:<id>` |

Notifications are persisted before being emitted, so a user who was offline still
receives them via `GET /api/notifications`.
