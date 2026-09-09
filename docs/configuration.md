# Configuration

Every setting lives in the `.env` file at the repository root. `docker-compose.yml`
reads it and passes the relevant values into each container. There is no
configuration baked into an image, so the same images run in any environment.

Start from the template:

```bash
cp .env.example .env
```

Docker Compose reads this file verbatim. Keep comments on their own lines and
leave no trailing spaces after a value, or the spaces become part of it.

---

## Ports

| Variable | Default | Notes |
|---|---|---|
| `APP_PORT` | `11802` | Web UI. The only port published to the network. |
| `API_PORT` | `11803` | REST API and websockets. Published on `127.0.0.1` only. |
| `DB_PORT` | `11804` | PostgreSQL. Published on `127.0.0.1` only. |

Browsers never talk to `API_PORT` directly: nginx in the web container proxies
`/api` and `/socket.io` through to it, so the browser only needs `APP_PORT`.

The API and database bind to loopback deliberately. Publishing either to the LAN
would expose an unauthenticated database port and bypass the proxy.

---

## Data volume

| Variable | Default | Notes |
|---|---|---|
| `DATA_ROOT` | `/data/pss_desk` | Host directory holding all persistent state. |

This must point at the large HDD, never at the SSD the application runs from. It
holds four subdirectories, created automatically on first start:

- `postgres/` - the database cluster
- `storage/` - uploaded evidence, split into `cases`, `tasks`, `board`, `reports`, `profiles`
- `logs/` - API logs, capped at 10 MB per file with 5 files kept
- `backups/` - where scheduled database dumps are written

Prepare it once before the first start:

```bash
sudo mkdir -p /data/pss_desk/postgres /data/pss_desk/storage /data/pss_desk/logs /data/pss_desk/backups
sudo chown -R 1000:1000 /data/pss_desk
```

The API container runs as uid 1000, which is why the ownership matters.

---

## Database

| Variable | Notes |
|---|---|
| `POSTGRES_USER` | Database role. Used to build `DATABASE_URL`. |
| `POSTGRES_PASSWORD` | Set a real one. Only reachable from localhost, but it still guards your data. |
| `POSTGRES_DB` | Database name. |

`DATABASE_URL` is assembled from these in `docker-compose.yml`; do not set it
yourself for the deployed stack. Local development is the exception, where
`src/backend/.env` carries its own `DATABASE_URL`.

**Changing `POSTGRES_PASSWORD` after the first start does not work on its own.**
Postgres only reads it when it initialises an empty cluster. To rotate it, change
it inside the database and then update `.env` to match:

```bash
docker compose exec db psql -U casedesk -c "ALTER USER casedesk WITH PASSWORD 'new-password';"
```

---

## Authentication

| Variable | Default | Notes |
|---|---|---|
| `JWT_ACCESS_SECRET` | - | Signs short-lived access tokens. |
| `JWT_REFRESH_SECRET` | - | Signs refresh tokens. Must differ from the access secret. |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Access token lifetime. |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token lifetime, and the refresh cookie's max-age. |

Generate each secret separately:

```bash
openssl rand -hex 48
```

Anyone holding these secrets can mint a valid token for any user, including an
admin. Treat them like the database password: never commit them, and rotate them
if they leak. Rotating invalidates every active session, which logs everyone out.

---

## Application

| Variable | Default | Notes |
|---|---|---|
| `FRONTEND_ORIGIN` | `http://localhost:11802` | Comma-separated CORS allow-list. |
| `MAX_FILE_SIZE_MB` | `500` | Upload ceiling per file. Numeric only. |
| `VITE_API_BASE` | empty | Leave empty. Build-time only. |
| `SEED_ON_START` | `false` | Creates demo accounts on start-up. |

**`FRONTEND_ORIGIN`** only matters for clients calling the API on a different
origin. Because nginx serves the app and proxies the API from the same origin,
normal browser traffic is same-origin and never triggers a CORS check.

**`MAX_FILE_SIZE_MB`** must be a bare number. `500MB` fails to parse and silently
falls back to 20 MB. Keep `client_max_body_size` in `docker/nginx.conf` at or above
this value, or nginx rejects large uploads before the API ever sees them.

**`VITE_API_BASE`** is compiled into the JavaScript bundle at image build time, not
read at run time. Left empty, the app calls the API at the relative path `/api`,
so one built image works on any hostname or IP. Only set it when the API is served
from a genuinely different origin, and rebuild the frontend image after changing it.

**`SEED_ON_START`** must be `false` on production. It creates the well-known demo
accounts listed in [deployment.md](deployment.md), each with a published password.

---

## Local development

Two further files configure a non-containerised checkout. They are ignored by the
deployed stack.

- `src/backend/.env` - database URL, secrets, and `PORT=11813`
- `src/frontend/.env` - `VITE_API_BASE`, normally left empty

Both have a committed `.env.example` alongside them. Development ports (11812,
11813) are deliberately distinct from the deployed ports so that `npm run dev` and
`docker compose up` can run at the same time.

See [development.md](development.md).
