# Code audit

Review of the CaseDesk codebase carried out on 2026-08-12, before first
deployment. Ten reviewers each took one domain (auth, authorisation, routing,
files and board, case/task workflow, attendance/leave/reporting, realtime, data
layer, frontend core, frontend pages), and every reported defect was then
re-checked against the source by a second reviewer whose brief was to refute it.

**124 defects were confirmed: 3 critical, 21 high, 47 medium, 53 low.**

Everything critical and high was traced back to the source by hand before being
acted on, and the security fixes were then verified against the running stack.
The medium and low findings are recorded below but not fixed: several are product
decisions rather than bugs, and the rest are better done with the original
developer than around them.

The project is unfinished, and this reflects that. The architecture is sound - the
layering is clean, permission logic is centralised in `access.service.ts`, uploads
are stored under generated names and served only through a permission-checked
endpoint, and refresh tokens are stored hashed. The defects cluster in a few
recognisable places rather than being spread evenly, which is the good case: they
are fixable in batches.

---

## Fixed and verified

### 1. Any logged-in user could download any case dossier (critical)

`GET /api/reports/case/:id` was gated by `requireAuth` and nothing else. The
controller passed `req.params.id` straight to the service, which had no `user`
parameter at all, so no check was possible anywhere in the chain. Any
authenticated user with a case id - and case ids appear in task payloads, socket
rooms and UI links - received a PDF containing the case description, assigned
manager, every evidence-board item with its notes, and the full connection graph.

It was the only case-scoped route in the API with no access check.

*Fixed* in `controllers/report.controller.ts`: the case is loaded and passed
through `canViewCase` before the report is generated.

*Verified:* a worker with no task on the case now gets `403`; an admin still gets `200`.

### 2. Any logged-in user could join any case or task socket room (critical)

`subscribe:case` and `subscribe:task` called `socket.join()` with the id the
client sent, unconditionally. The handshake authenticated *who* the user was and
nothing checked *what* they could subscribe to. Joining a room delivered every
`case:updated`, `task:created`, `task:updated`, `file:new`, `comment:new` and
`board:*` payload for that case - raw Prisma rows including task instructions,
comment text and file metadata.

This was a complete parallel read channel around the REST authorisation layer.

*Fixed* in `sockets/index.ts`: both handlers now resolve the record and apply the
same `canViewCase` / `canViewTask` predicates the REST endpoints use, and decline
silently so a client cannot tell "not yours" from "does not exist".

*Verified* with a real socket client: a case-room broadcast reaches an authorised
admin and does not reach a worker who is not on the case.

### 3. Managers could read any employee's data via `?userId=` (high, three places)

The team-scoping guard was written as `else if (role === "MANAGER" && !userId)`,
so supplying `?userId=` skipped the scope entirely and passed the value straight
into the query. The report controller had the same defect in a different shape:
`if (queryUserId) return [queryUserId]`.

Any manager could therefore read any employee's attendance history, leave history
(including the free-text `reason`, which routinely carries medical detail), and
attendance or performance reports - for admins, for other managers, for staff on
other teams.

*Fixed* in `attendance.controller.ts`, `leave.controller.ts` and
`report.controller.ts`: a manager may narrow to one person, but only inside their
own team; anything else is `403`.

*Verified:* manager requesting the admin's records now gets `403` on all three
endpoints, and their own team's data still returns `200`.

### 4. Approving a task unlocked only one of its dependents (high)

`approveTask` fetched a single dependent with `findFirst` and tested its status
afterwards. With two or more tasks depending on the same predecessor, every
dependent but one stayed `LOCKED` permanently - unable to be started, submitted
or edited out of that state - and the parent case could never reach `COMPLETED`.
Worse, if the row `findFirst` happened to return was already unlocked, the genuinely
locked siblings were skipped entirely.

*Fixed:* `findMany` filtered on `status: "LOCKED"`, unlocking every dependent.

### 5. Co-assigned workers were locked out of their own tasks (high, four places)

`canViewTask` grants access to workers attached through `TaskAssignment` as well
as the primary `assignedUserId` - but four call sites loaded the task without
including the `assignments` relation, so that branch could never match. Any worker
who was not the primary assignee got `403` on comments (read and write), file
downloads and file uploads, on a task that appeared in their own task list.

*Fixed* in `comment.service.ts`, `file.service.ts` (download and upload) and the
socket task handler.

### 6. The first case created through the UI always failed (high)

The seed wrote `caseNumber: "CASE-0001"` directly while leaving the `case_number`
counter at zero. The first case created through the API then generated
`CASE-0001` as well and died on the unique constraint. Since the deployment
procedure seeds the database to create the first admin, this hit every fresh
install.

*Reproduced* on the running stack: `HTTP 409 A record with that unique value already exists`.

*Fixed:* the seed now calls `generateCaseNumber()`, like the tasks around it
already did.

### 7. Password resets did not end existing sessions (high)

Resetting a user's password wrote a new hash and nothing else. Every refresh token
already issued to that account kept rotating successfully, so the standard
response to a compromised account did not actually end the intruder's session.

*Fixed:* `revokeAllSessions()` added to `auth.service.ts` and called on password
change and deactivation. Access tokens already issued still stand until they
expire - that is inherent to stateless tokens, and the window is bounded by
`ACCESS_TOKEN_EXPIRY`.

### 8. Uploads were stored under a client-controlled extension (high)

The MIME allow-list was enforced on the client-supplied `Content-Type` header
while the file was written to disk as `${uuid}${path.extname(originalname)}` - an
extension the client also controlled. The two were never reconciled, so a request
declaring `image/png` could be stored as `.html`. Combined with the board's
"Open" button, which turns stored bytes into a same-origin document via a blob
URL, that was a route to stored XSS.

*Fixed:* the allow-list is now a MIME-to-extension map and the stored extension is
taken from it, never from the client. The download endpoint also serves the
validated stored MIME type rather than letting Express infer one from the path.

### 9. Attendance and leave disagreed about what a day is (high)

`Attendance.date` is a Postgres `DATE`. The service built its key from
*server-local* midnight, which Postgres then truncates in UTC - so on any host
east of UTC every attendance row filed one day early. The container currently runs
in UTC while the office is Asia/Karachi, which masks that bug and creates the
mirror-image one instead: an early-morning check-in is recorded against yesterday.
Leave approval keyed the same column differently again, and stepped its date
cursor with local-time `setDate()`, which can repeat or skip a day across a DST
boundary.

*Fixed:* a shared `utils/businessDay.ts` states the office timezone explicitly
(`APP_TIMEZONE`, defaulting to `Asia/Karachi` in this deployment) and expresses
every day key as UTC midnight of the office's calendar day. Attendance and leave
now use it, so both writers agree regardless of the container's timezone.

### 10. Realtime silently died 15 minutes after login (high)

The socket handshake carries the access token. When it expired, the next
reconnect - a laptop waking, a wifi blip, an API restart - replayed the stale
token, the handshake middleware rejected it, and socket.io does not retry a
middleware rejection. Nothing pushed refreshed tokens into `socket.auth` and no
`connect_error` handler existed, so notifications, kanban updates and the evidence
board simply stopped, with nothing shown to the user.

*Fixed:* the API client now publishes refreshed tokens, the auth store forwards
them to the socket, and a `connect_error` handler refreshes and reconnects on an
auth failure while leaving ordinary network errors to socket.io's own retry.

### 11. Creating a multi-worker task made the wrong person lead (high)

The new-task modal created the task with the first selected worker as primary,
then looped the rest through `PUT /tasks/:id/assign` - which *replaces* the
primary assignee rather than adding to the team. The last worker picked silently
became the lead, contradicting the code's own comment, and each iteration fired
another notification and broadcast. The purpose-built `assign-multiple` endpoint
existed and was never called.

*Fixed:* one `assignMultipleUsers` call with the full list.

### 12. Sessions would have broken on deployment (found during deployment)

Not from the audit. The refresh cookie was marked `secure` whenever
`NODE_ENV=production`, but the stack serves plain HTTP on the LAN. Browsers never
send a secure cookie over HTTP, so every session would have ended without warning
at the 15-minute mark, on a fresh install, with no error to explain it.

*Fixed:* the flag is now `COOKIE_SECURE`, tied to how the app is actually served
rather than to `NODE_ENV`. It must be set to `true` when TLS is added; see
[deployment.md](deployment.md).

### Also fixed while working

- **36 TypeScript errors** across 8 files. `npm run build` runs `tsc && vite build`
  and had never passed. The bulk came from `shared/types` declaring its enums as
  TypeScript `enum`s: an `enum` is a nominal type, so a status string parsed from a
  JSON response is not assignable to it even though it is the identical value at
  runtime. Converted to const objects with derived union types, which erase at
  build time and accept both forms.
- **`baseUrl` / `ignoreDeprecations` conflict** in the frontend tsconfig: the
  pinned compiler rejected the value that newer editor toolchains demanded.
  Removed both; `paths` resolves relative to the config file since TS 5.0.
- **`checkuser.js`** deleted - a debug script that printed a user record including
  the password hash.
- **`MAX_FILE_SIZE_MB=500MB`** in the committed `.env`: `Number("500MB")` is `NaN`,
  so the limit silently fell back to 20 MB. The parser now tolerates both forms.
- **Path containment check** added on download. `filepath` is server-generated, so
  this is defence in depth rather than a live hole.
- Em dashes removed throughout, and the `✅ FIXED:` progress markers left in the
  source replaced with comments that say something.

---

## Not fixed: recommended next

Grouped by theme, roughly in priority order. Severity is as assessed by the review.

### Missing transactions (medium, data integrity)

Several multi-write operations can fail halfway and leave the database
inconsistent.

| Finding | Location |
|---|---|
| `createCase` writes a case plus N tasks with no transaction, and never validates that the task assignees exist | `be/services/case.service.ts:74` |
| `deleteCase` issues eight dependent deletes plus the case delete outside a transaction, duplicating what the schema cascades already do | `be/services/case.service.ts:224` |
| `assignMultipleUsers` deletes every assignment then re-creates them, outside a transaction - an interruption leaves the task with none | `be/services/task.service.ts:292` |
| `approveLeave` / `rejectLeave` check the `PENDING` status outside the transaction that acts on it, so two approvals can race | `be/services/leave.service.ts:55` |

### Orphaned files (medium, data integrity)

The database and the disk drift apart. Nothing currently reclaims the bytes.

- `deleteCase` removes `File` rows but never the files on disk.
- Deleting a board item removes the `BoardItem` but leaves the `File` row, which
  stays listed on the case and stays downloadable.
- Uploads are written to disk *before* the permission check runs, and are not
  removed when the request is rejected - so a user who cannot upload to a case can
  still cause bytes to accumulate.

Worth a reconciliation job as well as the fixes: a periodic sweep for files on
disk with no row, and rows with no file.

### Unbounded queries (medium, will degrade with age)

Fine at four seeded users, a problem after a year of history.

- `GET /api/attendance` and `GET /api/leave` return every matching row with no
  pagination, and the Attendance page requests all of them.
- `resolveScope` for an admin calls `listUsers({ limit: 1000 })`, which silently
  truncates at 1000 users.

### The multi-assignee model is half-migrated (medium, consistency)

`TaskAssignment` was added later and not all code caught up. The four instances
that produced `403`s are fixed; these remain, and are visible to users:

- Dashboard task and case counts ignore `TaskAssignment`, so a co-assigned worker
  sees zeros.
- On the Kanban board, co-assigned workers cannot drag their own tasks.
- A `MANAGER` who is assigned a task still cannot view or progress it: access is
  keyed on role, never on the assignment.

### States that are never written (medium, consistency)

`TaskStatus.REJECTED` is defined in the schema, rendered by the UI and counted by
the reports, but nothing ever writes it - `rejectTask` moves the task elsewhere.
The Kanban `REJECTED` column is therefore permanently empty, and the performance
report's "Rejected" and "Rework %" columns are structurally always zero.

This needs a product decision, not just a code change: either `rejectTask` should
write `REJECTED`, or the column and the metrics should go.

### Remaining date and time issues (medium, correctness)

The shared day helper fixes the attendance and leave keys. Two related issues are
untouched because they need a decision about intended behaviour:

- The monthly report window is built from local-time boundaries against a UTC date
  column, so rows at the edges of a month can fall outside it.
- `checkOut` only ever looks at *today's* row, so a shift crossing midnight can
  never be closed. Overlapping leave requests are not checked either, and an
  approved leave and a check-in overwrite each other's attendance status.

### The test suites do not run (medium)

- `backend/tests/workflow.test.ts` posts tasks without `taskType`, which became
  required in a later migration. Every workflow test fails.
- `frontend/src/pages/__tests__/Login.test.tsx` asserts UI copy that no longer
  exists.

Worth repairing before the next change lands: the suites are reasonable in shape,
they have simply gone stale, and there is nothing else guarding the workflow rules.

### Session hardening (medium, security)

- Refresh-token rotation has no reuse detection. A stolen token that is replayed
  after the legitimate client has rotated it should invalidate the whole family;
  today it is simply rejected on its own.
- Refresh expiry slides forward on every rotation, so an active session never
  actually reaches the 7-day limit.
- Socket connections are authenticated once at handshake and then never
  re-checked, so a deactivated user's open socket keeps receiving events until
  they disconnect.

### Error handling and UX (low, but user-visible)

- List pages swallow load failures and render the empty state, so "no cases" and
  "the request failed" look identical.
- Role changes and deactivation fire on a single click with no confirmation and no
  guard against removing the last admin.
- Workers are shown an Edit-task button the API rejects.
- Board additions and connections are applied twice for the acting user, once
  optimistically and once from the socket echo.
- Six socket events are emitted with no listener on the frontend, and `case:created`
  is emitted into a room nobody has joined yet.

### Dead code (low)

Nine findings, mostly unused exports, duplicated helpers (`fmtTime` exists twice)
and the legacy single-assignee paths left behind by the `TaskAssignment` migration.
Harmless, but it is what makes the multi-assignee inconsistencies above so easy to
reintroduce.

---

## Method and caveats

Each domain was reviewed by one agent and independently re-checked by a second
whose instructions were to refute the finding and to default to rejecting anything
it could not confirm in the source; 6 findings were rejected that way.

That is not the same as proof. I personally traced every critical and high finding
to the code before acting on it, and verified the security fixes against the
running stack - those I stand behind. The medium and low findings above are
reported as assessed, and each should be confirmed before work is planned around
it. Line numbers refer to the code as it stood after the restructure and before
the fixes above were applied.

No test suite was run, because the suites do not currently pass and the code was
audited by reading rather than by execution.
