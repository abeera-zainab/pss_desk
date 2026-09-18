# Deployment

Deploying CaseDesk to the production server.

The guiding constraint: **the application runs from the SSD, all data lives on the
HDD at `/data`.** The application directory stays under a few megabytes; the
database, uploaded evidence and logs go to `DATA_ROOT` and never grow inside it.

---

## Requirements

- Docker Engine 24+ with the Compose plugin
- A user in the `docker` group
- Free ports in the 11802-11900 range
- A writable `/data` partition on the large disk

---

## First deployment

### 1. Prepare the data volume

```bash
sudo mkdir -p /data/pss_desk/postgres /data/pss_desk/storage /data/pss_desk/logs /data/pss_desk/backups
sudo chown -R 1000:1000 /data/pss_desk
```

uid 1000 is the user the API container runs as. Without this the API cannot write
uploads or logs.

Confirm `/data` is the HDD and not a directory on the root filesystem:

```bash
df -h /data /          # the two lines must show different filesystems
```

### 2. Place the code on the SSD

```bash
cd ~ && git clone <repository-url> pss_desk && cd pss_desk
```

### 3. Configure

```bash
cp .env.example .env
openssl rand -hex 48     # JWT_ACCESS_SECRET
openssl rand -hex 48     # JWT_REFRESH_SECRET
openssl rand -hex 16     # POSTGRES_PASSWORD
```

Edit `.env` and replace every `CHANGE-ME`. Set `FRONTEND_ORIGIN` to the address
people will actually use, for example `http://192.168.1.50:11802`. Leave
`SEED_ON_START=false`.

Every setting is documented in [configuration.md](configuration.md).

```bash
chmod 600 .env
```

### 4. Start

```bash
docker compose up -d --build
```

The API container applies all pending migrations before it starts serving, so
there is no separate migration step. If `DATA_ROOT/postgres` is empty, Postgres
also loads `seed/database.sql` then `seed/migration.sql` (the snapshot and schema
deltas committed in this repo) during cluster init. Watch it come up:

```bash
docker compose logs -f backend
```

Expect `migrations up to date` followed by `CaseDesk API listening on 0.0.0.0:11803`.

### 5. Verify

```bash
curl http://localhost:11802/api/health          # {"status":"ok",...}
docker compose ps                               # all three services healthy
```

Then open `http://<server-ip>:11802` in a browser.

### 6. Create the first admin

There is no public registration: accounts are created by an admin, so the first
one has to be made directly. Seed the demo accounts, sign in as the admin, create
the real accounts through the UI, then deactivate the demo ones.

```bash
docker compose exec backend node dist/seed.js
```

| Email | Role | Password |
|---|---|---|
| `admin@office.local` | ADMIN | `Password123!` |
| `manager@office.local` | MANAGER | `Password123!` |
| `worker@office.local` | WORKER | `Password123!` |
| `worker2@office.local` | WORKER | `Password123!` |

**These passwords are published in this repository.** Deactivate every demo account
before the server is reachable by anyone else.

---

## Updating

```bash
cd ~/pss_desk
git pull
docker compose up -d --build
```

Migrations are applied automatically on start. Take a backup first if the release
includes schema changes.

Roll back by checking out the previous commit and rebuilding. Note that a rollback
does **not** revert database migrations; restore a dump if the schema moved.

---

## Backups

Everything that matters is the Postgres database plus `/data/pss_desk/storage`.
The application directory holds nothing that is not in version control.

Database dump:

```bash
docker compose exec -T db pg_dump -U casedesk casedesk \
  | gzip > /data/pss_desk/backups/casedesk-$(date +%F).sql.gz
```

Uploaded evidence:

```bash
tar -czf /data/pss_desk/backups/storage-$(date +%F).tar.gz -C /data/pss_desk storage
```

A nightly cron entry, run as a user in the `docker` group:

```cron
0 2 * * * cd /home/<user>/pss_desk && docker compose exec -T db pg_dump -U casedesk casedesk | gzip > /data/pss_desk/backups/casedesk-$(date +\%F).sql.gz
30 2 * * * find /data/pss_desk/backups -name 'casedesk-*.sql.gz' -mtime +30 -delete
```

Restoring a dump:

```bash
gunzip -c /data/pss_desk/backups/casedesk-2026-08-12.sql.gz \
  | docker compose exec -T db psql -U casedesk casedesk
```

Back up to a different machine as well. A dump sitting on the same disk as the
database does not survive that disk failing.

---

## Operations

```bash
docker compose ps                        # service status and health
docker compose logs -f backend           # follow API logs
docker compose restart backend           # restart just the API
docker compose down                      # stop everything, data untouched
docker compose exec db psql -U casedesk casedesk   # database shell
```

API logs are also written to `/data/pss_desk/logs/`, capped at 10 MB per file with
5 files retained, so they cannot fill the disk.

Disk usage:

```bash
du -sh /data/pss_desk/*
```

`storage/` is the directory that grows. Uploads are capped per file by
`MAX_FILE_SIZE_MB`, but the total is bounded only by the disk.

---

## Starting on boot

`restart: unless-stopped` is set on every service, so Docker restarts the stack
after a reboot. Nothing further is needed, provided the Docker service itself is
enabled:

```bash
sudo systemctl enable docker
```

Note that `docker compose down` counts as an explicit stop; the stack will not come
back on reboot until you start it again.

---

## Security checklist

Before the server is reachable by anyone else:

- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are freshly generated and different
- [ ] `POSTGRES_PASSWORD` is not the template value
- [ ] `.env` is `chmod 600` and not committed
- [ ] `SEED_ON_START=false`
- [ ] Every demo account is deactivated or deleted
- [ ] `FRONTEND_ORIGIN` names the real address, not `localhost`
- [ ] The API (11803) and database (11804) are still bound to `127.0.0.1`
- [ ] Backups are running and a restore has been tested at least once

### Serving over HTTPS

The stack speaks plain HTTP, which is acceptable on a trusted LAN and not
acceptable over anything else: login credentials and JWTs cross the wire in
clear text.

To publish beyond the LAN, put a TLS-terminating reverse proxy in front of port
11802, set `FRONTEND_ORIGIN` to the `https://` address, and set
`COOKIE_SECURE=true`. The application already sets `trust proxy`, so it reads the
forwarded client address correctly.

Do not set `COOKIE_SECURE=true` before TLS is actually in place. Browsers refuse to
send a secure cookie over plain HTTP, so the refresh cookie would never come back
and every session would end without warning after 15 minutes.
