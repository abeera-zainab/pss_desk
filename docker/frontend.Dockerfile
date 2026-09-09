# syntax=docker/dockerfile:1
#
# CaseDesk web UI: builds the React bundle, then serves it from nginx and proxies
# /api and /socket.io through to the API container.
# Build context is the repository root because the build needs src/shared as well
# as src/frontend.

# ---------------------------------------------------------------- build stage
FROM node:20-alpine AS build

WORKDIR /app/frontend

COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm ci

# The shared types live outside the frontend directory and are referenced through
# the @shared alias, so they must sit alongside it in the image too.
COPY src/shared /app/shared
COPY src/frontend ./

# Left empty on purpose: the app then calls the API at the relative path /api and
# the bundle works on any hostname without a rebuild. Set it only when the API is
# served from a different origin.
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# -------------------------------------------------------------- runtime stage
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
