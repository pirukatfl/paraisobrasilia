# syntax=docker/dockerfile:1
#
# Paraíso Brasília — imagem do site (Next.js standalone + Payload).
#
# Targets:
#   runner  — the site (node server.js), non-root, ~200 MB
#   migrate — full dependencies + source; runs `payload migrate` once per deploy
#
# The build needs NO database: pages that read parties render on request (plan 01-10).
# Build args are public values only (they end up in the browser bundle); secrets come
# from .env.staging at runtime and never enter the image (.dockerignore excludes .env*).

ARG NODE_IMAGE=node:22-bookworm-slim

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm \
    COREPACK_HOME=/corepack \
    NEXT_TELEMETRY_DISABLED=1
ENV PATH=$PNPM_HOME:$PATH
# pnpm version comes from package.json "packageManager"
COPY package.json ./
RUN corepack enable && corepack install && chmod -R a+rX /corepack

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM base AS builder
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_AGE_GATE_PROVIDER=self-declaration
# SITE_ENV is read at build time by next.config.ts (X-Robots-Tag) and robots.ts:
# staging images are never indexable.
ARG SITE_ENV=staging
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_AGE_GATE_PROVIDER=$NEXT_PUBLIC_AGE_GATE_PROVIDER \
    SITE_ENV=$SITE_ENV \
    TZ=America/Sao_Paulo
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -n "$NEXT_PUBLIC_SERVER_URL" || (echo "Build arg NEXT_PUBLIC_SERVER_URL is required (e.g. https://novo.swingbrasilia.com.br)" >&2; exit 1)
RUN pnpm build

# ---------------------------------------------------------------------------
# One-shot migrations: `docker compose run --rm migrate`
FROM base AS migrate
ENV NODE_ENV=production \
    NODE_OPTIONS=--no-deprecation \
    TZ=America/Sao_Paulo
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
CMD ["node_modules/.bin/payload", "migrate"]

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=America/Sao_Paulo \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/app/media

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Upload directories: the named volumes `media` and `private_media` are mounted here. A new,
# empty volume takes the directory's owner (node), so Payload can write files and derivatives.
# PRIVATE_MEDIA_DIR is set by the compose file together with the volume (never here): without
# it, production refuses ClassiSex uploads instead of writing into the container layer.
RUN mkdir -p /app/media /app/private-media && chown node:node /app/media /app/private-media

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
