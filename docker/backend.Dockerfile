# syntax=docker/dockerfile:1
#
# CaseDesk API. Build context is the repository root so that the build can reach
# src/backend without a second context.
#   docker compose build backend

# ---------------------------------------------------------------- build stage
FROM node:20-alpine AS build

# Prisma links against OpenSSL to pick its query engine; without it here, generate
# guesses the wrong binary target.
RUN apk add --no-cache openssl

WORKDIR /app

# Dependencies first: this layer is cached until package.json/lock actually change.
COPY src/backend/package.json src/backend/package-lock.json ./
RUN npm ci

# The Prisma client is generated from the schema, so it has to exist before tsc runs.
COPY src/backend/prisma ./prisma
RUN npx prisma generate

COPY src/backend/tsconfig.json ./
COPY src/backend/src ./src
RUN npm run build

# -------------------------------------------------------------- runtime stage
FROM node:20-alpine AS runtime

# tini gives us a real init process, so SIGTERM reaches node and the server can
# drain in-flight requests instead of being killed outright. openssl is what
# Prisma probes to choose its query engine at start-up.
RUN apk add --no-cache tini openssl

WORKDIR /app
ENV NODE_ENV=production

# Copied as node:node, not root: `prisma migrate deploy` writes into
# node_modules/@prisma/engines on start-up and cannot do so from a root-owned tree.
# node_modules is copied whole rather than pruned because that Prisma CLI is a
# devDependency yet is needed at run time to apply migrations.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --chown=node:node docker/backend-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The stock `node` user is uid/gid 1000, matching the owner of /data on the host,
# so the bind-mounted storage and log directories are writable without chowning.
USER node

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/index.js"]
