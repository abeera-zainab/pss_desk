# CaseDesk - Internal Office Case Management System
### Corrected & Production-Ready Specification (v2)

You are a senior full-stack software architect and developer.

Build a complete, production-ready internal office Case Management System called **"CaseDesk"**, used by an organization of ~40 employees. It must be secure, scalable, cleanly structured, and easy to maintain.

The system manages cases, tasks, employees, documents, approvals, notifications, and real-time collaboration.

Do NOT create a simple demo. Build a properly structured full-stack application with separate frontend and backend.

---

## 1. TECHNOLOGY STACK

**Frontend**
- React.js with Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Socket.io Client
- Zustand for global state (auth, notifications, socket connection)

**Backend**
- Node.js + Express.js
- TypeScript
- Socket.io Server
- Zod for request validation
- Helmet + CORS whitelist + express-rate-limit for security
- Morgan (dev) + Winston (production) for logging

**Database**
- PostgreSQL

**ORM**
- Prisma ORM

**Authentication**
- JWT - short-lived access token (15 min) + long-lived refresh token (7 days, httpOnly cookie)
- bcrypt password hashing (min 10 salt rounds)

**File Storage**
- Local disk storage via Multer (no cloud storage)
- Enforced allowed MIME types and max file size

**Testing**
- Jest + Supertest for backend API tests
- Basic React Testing Library setup for critical frontend flows

---

## 2. PROJECT STRUCTURE

```
CaseDesk/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── context/       (or store/ if using Zustand)
│       ├── utils/
│       └── routes/
├── backend/
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       ├── sockets/
│       ├── validators/     (zod schemas)
│       ├── utils/
│       └── uploads/        (gitignored, runtime storage)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── shared/
│   └── types/             (shared enums & DTOs used by both FE/BE)
├── README.md
└── .env.example
```

Rules:
- Frontend and backend are **completely separate** - no shared runtime code, only shared **types** via the `shared/` folder (compiled as a small package or copied at build time).
- Frontend never contains backend logic (no DB calls, no file system access).
- Backend never contains frontend/UI code.

---

## 3. USER ROLES & PERMISSIONS

Three roles: **ADMIN**, **MANAGER**, **WORKER**.

User accounts are **only created by an Admin** (or seeded at setup). There is **no public self-registration endpoint** - this is an internal office tool, and open registration is a security risk.

| Action | Admin | Manager | Worker |
|---|---|---|---|
| Create users | ✅ | ❌ | ❌ |
| Create cases | ✅ | ❌ | ❌ |
| Assign case to manager | ✅ | ❌ | ❌ |
| Create tasks in own case | ➖ | ✅ | ❌ |
| Assign task to worker | ➖ | ✅ | ❌ |
| View all cases/tasks | ✅ | Only assigned cases | Only assigned tasks |
| Approve/reject task | ➖ | ✅ (own case's tasks) | ❌ |
| Upload files | ✅ | ✅ | ✅ (own task only) |

---

## 4. ADMIN ROLE

**Admin Dashboard** shows:
- Total users, total cases, active tasks, completed tasks, pending approvals, employee activity feed

**Admin can:**
- Create/edit/deactivate users, assign roles
- Create cases, assign to a manager
- Assign tasks directly to a manager or worker (override path)
- View all cases, tasks, files, and progress across the org

**Case Creation Flow - Fields:**
- Title, Description
- Priority: `LOW | MEDIUM | HIGH | URGENT`
- Assigned Manager (required)
- Deadline
- Required Documents (checklist of expected document names/types, stored as `String[]` on Case)
- Optional file attachments (reference docs, initial reports, instructions)

Uploaded files during case creation are visible to the assigned manager and, once tasks are created, to the relevant workers on those tasks.

---

## 5. MANAGER ROLE

**Manager Dashboard** shows:
- Assigned cases, tasks created, worker progress, pending approvals, submitted files

**Manager can:**
- Receive cases from Admin
- Create multiple tasks inside an assigned case
- Assign **one primary worker per task** (see note below on multi-worker cases)
- Set priority, deadline, instructions, dependency task
- Upload supporting files (templates, guidelines, prior documents)
- Review submissions → Approve or Reject with a comment
- View full task history / audit trail

> **Note on "multiple workers":** A single Task has exactly one `assignedUserId` to keep status/dependency logic unambiguous (one person is accountable for moving a task's state). If a case genuinely needs several workers collaborating, the Manager creates **separate tasks** for each worker (optionally with dependencies between them), rather than assigning many workers to one task. This avoids ambiguity around who submitted/approved what.

**Task Creation Flow - Fields:**
- Title, Description
- Assigned Worker (single user)
- Priority: `LOW | MEDIUM | HIGH | URGENT`
- Deadline
- Depends On (optional, references another Task in the same case)
- Instructions (rich text)
- Optional file attachments

---

## 6. WORKER ROLE

**Worker Dashboard** shows:
- My assigned tasks grouped by status: Pending, In Progress, Submitted, Completed
- Notifications

**Worker can:**
- Open an assigned task (only if not locked)
- View instructions and attached files
- Start task → change status `PENDING → IN_PROGRESS`
- Upload completed work (reports, documents, images)
- Add comments
- Submit task → `IN_PROGRESS → SUBMITTED`
- View task history (all status changes with timestamps and actor)

A **locked** task (blocked by an incomplete dependency) is read-only - no status change, no uploads, no comments - until it unlocks.

---

## 7. CASE & TASK WORKFLOW

```
Admin creates Case
       ↓
Admin assigns Manager
       ↓
Manager creates Tasks (with optional dependencies)
       ↓
Manager assigns Workers → Worker notified
       ↓
Worker starts task (if unlocked)
       ↓
Worker uploads files + comments
       ↓
Worker submits task → Manager notified
       ↓
Manager reviews → Approve / Reject (with comment)
       ↓
On Approve: dependent task(s) automatically unlock → assigned worker notified
On Reject: task returns to IN_PROGRESS, worker notified with manager's comment
```

---

## 8. TASK DEPENDENCY SYSTEM

- A task can optionally depend on exactly one prior task in the same case (`dependsOnTaskId`).
- A dependent task's initial status is `LOCKED`, not `PENDING`.
- A locked task is **not editable** by the worker - no status change, uploads, or comments are accepted (enforced server-side, not just hidden in the UI).
- A task unlocks (`LOCKED → PENDING`) **only when its dependency task is APPROVED** (not merely "completed" or "submitted" - an unapproved/rejected dependency must not unlock downstream work).
- On unlock, the assigned worker receives a real-time notification.

---

## 9. REAL-TIME KANBAN BOARD

**Columns (must match the Task status enum exactly):**
`LOCKED → PENDING → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → COMPLETED / REJECTED`

- Visible to all authorized users, scoped to what they're allowed to see (Admin: all; Manager: own cases; Worker: own tasks - but a Worker viewing the board still sees column structure for context on their case).
- Drag-and-drop updates status instantly via API call, then broadcasts via Socket.io - **no optimistic-only client state**; server is the source of truth, UI reconciles on the socket event.
- Invalid transitions (e.g., dragging a `LOCKED` task, or a Worker dragging into `COMPLETED` directly) are rejected server-side with a clear error, even if the UI accidentally allows the drag.

---

## 10. REAL-TIME NOTIFICATION SYSTEM

Socket.io rooms structure (for targeted delivery instead of global broadcast):
- `user:<userId>` - personal notifications
- `case:<caseId>` - all users involved in that case (admin, manager, all assigned workers)
- `task:<taskId>` - used for live comment/status sync while a task detail view is open

**Events that generate a notification (persisted in DB + emitted via socket if user online):**
Case assigned · Task created · Task assigned · Task unlocked · File uploaded · Task submitted · Task approved · Task rejected

If the user is offline, the notification is simply stored in Postgres with `read: false` and delivered via `GET /notifications` on next login - no separate "offline queue" needed since Socket.io emits are fire-and-forget on top of the persisted record.

---

## 11. FILE MANAGEMENT SYSTEM

**Who can upload:**
- Admin: during case creation, during direct task assignment
- Manager: during task creation, during review
- Worker: during task submission

**Storage layout on disk:**
```
backend/src/uploads/
  ├── cases/
  ├── tasks/
  ├── reports/
  └── profiles/
```

**Security constraints (previously missing - required):**
- Allowed MIME types only: PDF, DOCX, XLSX, PNG, JPG, JPEG (reject everything else, including executables/scripts)
- Max file size: 20 MB per file (configurable via env)
- Server generates a randomized/unique filename on disk (e.g. `uuid + original extension`) - never trust or reuse the client's original filename for the stored path, to prevent path traversal and overwrite attacks
- Files served only through an authenticated download endpoint (`GET /files/:id/download`) that checks the requester's permission on the related case/task - never expose the `uploads/` folder as static public content

**File record fields:**
`id, filename (original), storedName (on disk), filepath, mimetype, size, uploadedBy, taskId (nullable), caseId (nullable), createdAt`

> A File row belongs to **either** a Case **or** a Task, not both - `taskId` and `caseId` are both nullable, with an app-level check that exactly one is set.

---

## 12. DATABASE DESIGN (Prisma)

```prisma
enum Role {
  ADMIN
  MANAGER
  WORKER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum CaseStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CLOSED
}

enum TaskStatus {
  LOCKED
  PENDING
  IN_PROGRESS
  SUBMITTED
  UNDER_REVIEW
  COMPLETED
  REJECTED
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
}

model Case {
  id                String     @id @default(uuid())
  title             String
  description       String
  priority          Priority
  status            CaseStatus @default(OPEN)
  createdBy         String
  assignedManagerId String
  deadline          DateTime
  requiredDocuments String[]
  createdAt         DateTime   @default(now())
}

model Task {
  id             String     @id @default(uuid())
  title          String
  description    String
  instructions   String?
  status         TaskStatus @default(PENDING)
  priority       Priority
  assignedUserId String
  caseId         String
  dependsOnTaskId String?   @unique
  deadline       DateTime
  createdAt      DateTime   @default(now())
}

model Comment {
  id        String   @id @default(uuid())
  taskId    String
  authorId  String
  message   String
  createdAt DateTime @default(now())
}

model File {
  id         String   @id @default(uuid())
  filename   String
  storedName String
  filepath   String
  mimetype   String
  size       Int
  uploadedBy String
  taskId     String?
  caseId     String?
  createdAt  DateTime @default(now())
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  message   String
  type      String   // e.g. "TASK_ASSIGNED", "TASK_APPROVED"
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model ActivityLog {
  id         String   @id @default(uuid())
  userId     String
  action     String
  entityType String   // "CASE" | "TASK" | "USER" | "FILE"
  entityId   String
  details    String?
  createdAt  DateTime @default(now())
}
```

Relations (`@relation`), foreign keys, and indexes on `email`, `caseId`, `assignedUserId`, and `userId` (on Notification/ActivityLog) should be added in the actual schema for query performance - omitted above only for readability.

---

## 13. AUTHENTICATION & SECURITY

- `POST /auth/login` - returns access token (short-lived) + sets httpOnly refresh cookie
- `POST /auth/refresh` - issues new access token from refresh cookie
- `POST /auth/logout` - clears refresh cookie, invalidates session
- `GET /auth/me` - returns current user profile from access token

No public registration route. New accounts are created by Admin via `POST /users`.

**Security middleware:**
- Helmet for secure headers
- CORS restricted to the frontend's origin only
- express-rate-limit on `/auth/*` routes to prevent brute force
- Zod validation on every request body/params before it reaches a controller
- Role-based authorization middleware on every protected route (`requireRole(['ADMIN'])`, etc.)
- Ownership checks in services (a Manager can only touch cases where `assignedManagerId === self`; a Worker only tasks where `assignedUserId === self`)

---

## 14. BACKEND REST API

**Auth**
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

**Users** (Admin only, except GET /users/me handled by /auth/me)
```
GET    /users              ?page=&limit=&role=
POST   /users
PUT    /users/:id
DELETE /users/:id           (soft delete → isActive: false)
```

**Cases**
```
POST   /cases                        (Admin)
GET    /cases                        ?page=&limit=&status=  (scoped by role)
GET    /cases/:id
PUT    /cases/:id                    (Admin)
```

**Tasks**
```
POST   /tasks                        (Manager, within own case)
GET    /tasks                        ?caseId=&status=&assignedUserId=
GET    /tasks/:id
PUT    /tasks/:id/status              (drag-and-drop / worker actions)
PUT    /tasks/:id/assign              (Manager/Admin)
PUT    /tasks/:id/approve             (Manager)
PUT    /tasks/:id/reject              (Manager, requires comment)
```

**Comments**
```
POST   /tasks/:id/comments
GET    /tasks/:id/comments
```

**Files**
```
POST   /cases/:id/files
POST   /tasks/:id/files
GET    /files/:id/download            (permission-checked, streams file)
```

**Notifications**
```
GET    /notifications                 ?unreadOnly=
PUT    /notifications/:id/read
```

All list endpoints use pagination (`page`, `limit`) - not strictly required at 40 users' current data volume, but keeps the API correct as history accumulates over years.

---

## 15. FRONTEND PAGES

**Auth:** Login (Register removed - accounts are admin-provisioned)

**Admin:** Dashboard · User Management · Case Management · Case Detail

**Manager:** Dashboard · Case Detail · Task Creation · Worker Management

**Worker:** Dashboard · My Tasks · Task Detail · File Upload

**Common:** Kanban Board · Notifications · Profile

---

## 16. DEVELOPMENT RULES

1. Frontend and backend completely separate; only types shared via `shared/`.
2. TypeScript everywhere, strict mode on.
3. No hardcoded data - everything from DB/env.
4. All destructive/authorization-sensitive logic enforced server-side, never trusted from client state.
5. README with full local setup steps (Postgres setup, `.env` values, migration commands, seed script for an initial Admin user).
6. `.env.example` provided with at least: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `PORT`, `FRONTEND_ORIGIN`, `MAX_FILE_SIZE_MB`.
7. Commands: `npm run dev` in both `frontend/` and `backend/`.
8. Build order:
   1. Architecture & folder structure
   2. Prisma schema & migrations
   3. Backend core (auth, middleware, controllers, services)
   4. Socket.io real-time layer
   5. Frontend (auth flow first, then role dashboards)
   6. Connect frontend ↔ backend
   7. End-to-end workflow test (case → task → dependency → approval → notification)
   8. Seed script + README finalization

---

Build this as a professional, office-grade Case Management System, exactly as specified above.
