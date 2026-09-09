# CaseDesk

Internal case-management platform: cases and dependent task workflows, evidence
uploads, a shared investigation board, attendance and leave, reporting, and live
updates over websockets.

React + Vite + TypeScript on the front, Express + Prisma + PostgreSQL behind it,
Socket.io between them. The whole stack runs from one `docker compose up`.

---

## Quick start

```bash
cp .env.example .env         # then edit the secrets, see docs/configuration.md
docker compose up -d --build
```

Open **http://localhost:11802**.

The first start applies all database migrations automatically. To create the demo
accounts as well, set `SEED_ON_START=true` before the first run.

---

## Ports

The stack is confined to the **11802-11900** block. Only the web UI is reachable
from other machines; the API and database are published on loopback only.

| Port | Service | Exposure |
|---|---|---|
| **11802** | Web UI (nginx) | LAN - this is the address people open |
| 11803 | REST API and websockets | localhost only |
| 11804 | PostgreSQL | localhost only |
| 11812 | Vite dev server | local development only |
| 11813 | API in dev mode | local development only |

11805-11900 are unallocated and reserved for future CaseDesk services.

Change them in `.env` (`APP_PORT`, `API_PORT`, `DB_PORT`); nothing is hardcoded.

---

## Where things live

The application is small and runs from wherever this repository sits, which on the
deployment server is the SSD. Everything that grows without bound lives on the
large HDD mounted at `/data`, and nothing in the application directory ever
exceeds a couple of megabytes.

```
/home/<user>/pss_desk/          SSD - code, config, container images
/data/pss_desk/                 HDD - all persistent state
├── postgres/                   database cluster
├── storage/                    uploaded evidence (cases, tasks, board, reports)
├── logs/                       API logs, size-capped and rotated
└── backups/                    database dumps
```

`DATA_ROOT` in `.env` is the single switch controlling this. Point it somewhere
else and the whole data set moves with it.

---

## Repository layout

```
pss_desk/
├── docker-compose.yml          the deployed stack
├── .env.example                every setting, documented
├── docker/                     image definitions and nginx config
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── backend-entrypoint.sh
│   └── nginx.conf
├── docs/
│   ├── architecture.md         how the pieces fit together
│   ├── configuration.md        every environment variable
│   ├── deployment.md           deploying to the production server
│   ├── development.md          running it locally, tests
│   ├── api.md                  endpoint reference
│   ├── audit.md                pre-deployment code review
│   └── functional-spec.md      original requirements
└── src/
    ├── backend/                Express API (routes, controllers, services)
    ├── frontend/               React application
    └── shared/                 TypeScript types used by both
```

---

## Documentation

| Document | Read it when |
|---|---|
| [docs/deployment.md](docs/deployment.md) | Deploying to the production server, backups, upgrades |
| [docs/configuration.md](docs/configuration.md) | You need to know what a setting does |
| [docs/development.md](docs/development.md) | Working on the code locally |
| [docs/architecture.md](docs/architecture.md) | Understanding how a request flows through the system |
| [docs/api.md](docs/api.md) | Calling the API |
| [docs/functional-spec.md](docs/functional-spec.md) | Checking intended behaviour against what was built |
| [docs/audit.md](docs/audit.md) | What the pre-deployment code review found, and what is still open |

---

## Everyday commands

```bash
docker compose ps                      # what is running
docker compose logs -f backend         # follow API logs
docker compose up -d --build           # rebuild and restart after a code change
docker compose down                    # stop everything (data is untouched)
docker compose exec db psql -U casedesk casedesk    # database shell
```
