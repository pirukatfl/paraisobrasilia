---
phase: 01-funda-o-e-vitrine-de-festas
plan: 10
subsystem: infra
tags: [docker, ghcr, github-actions, caddy, systemd, hostinger, staging]

# Dependency graph
requires:
  - phase: 01-02
    provides: Hosting choice (Hostinger VPS), media-on-disk decision
  - phase: 01-09
    provides: Staff publishing, cached published-only queries
provides:
  - Multi-stage Dockerfile (deps, builder, migrate, runner) with Next standalone output
  - docker-compose.staging.yml (build on server) and docker-compose.staging.ghcr.yml (pull images) with db (no published ports), app, migrate, caddy; named volumes pgdata, media, caddy_data
  - Caddyfile with automatic HTTPS and HSTS for STAGING_DOMAIN
  - .github/workflows/deploy-staging.yml — builds runner + migrate images and pushes to ghcr.io/pirukatfl/paraisobrasilia on push to main/master
  - scripts/deploy/bootstrap-vps.sh — one-time VPS setup run by the client (Docker, ufw, .env.staging with secrets generated on the server, systemd timer paraiso-update.timer pulling new images every 5 min and running migrations)
  - scripts/deploy/deploy-staging.sh — SSH/rsync alternative
  - docs/deploy/STAGING.md — Portuguese runbook (first deploy, first staff user, redeploy, logs, rollback, backups)
  - tests/e2e/staging-smoke.spec.ts — read-only smoke checks against E2E_BASE_URL
  - Staging live at https://novo.swingbrasilia.com.br (client-confirmed 2026-10-19)
affects: [phase-2 onward (every push to main redeploys staging), phase-7 backups and production cut-over]

# Tech tracking
tech-stack:
  added: [GitHub Actions, GHCR, Caddy 2, postgres:16-alpine image, systemd timer]
  patterns:
    - "Pull-based deploy: CI pushes images, the VPS pulls them; nobody needs SSH to deploy"
    - "Secrets generated on the server only; .env.staging never committed"
    - "Build without a database: DB-backed routes render on request"
    - "Media under MEDIA_DIR (/app/media in the container) on a named volume, served by Payload's file route"

key-files:
  created:
    - Dockerfile
    - .dockerignore
    - docker-compose.staging.yml
    - docker-compose.staging.ghcr.yml
    - Caddyfile
    - .env.staging.example
    - .github/workflows/deploy-staging.yml
    - scripts/deploy/bootstrap-vps.sh
    - scripts/deploy/deploy-staging.sh
    - docs/deploy/STAGING.md
    - tests/e2e/staging-smoke.spec.ts
    - tests/unit/deploy-files.test.ts
  modified:
    - next.config.ts
    - src/payload.config.ts
    - src/collections/Media.ts
    - src/app/(frontend)/page.tsx
    - src/app/(frontend)/festas/[slug]/page.tsx
    - src/app/sitemap.ts
    - src/lib/parties/queries.ts
    - .gitignore

key-decisions:
  - "Pull-based deploy (GHCR + systemd timer) instead of SSH push: our environment cannot SSH to the VPS"
  - "Media on the VPS disk (named volume media), no Backblaze B2 — client decision 2026-10-17"
  - "STAGING_URL defaults to https://novo.swingbrasilia.com.br in the workflow when the repo variable is unset"
  - "bootstrap-vps.sh ships with GHCR_IMAGE=ghcr.io/pirukatfl/paraisobrasilia"

patterns-established:
  - "Pushing to main on github.com/pirukatfl/paraisobrasilia redeploys staging within ~5 minutes"

requirements-completed: [FEST-01, FEST-02, FEST-03, FEST-04, PAINEL-01, INST-04, INST-05]

# Metrics
duration: multi-day (client checkpoints)
completed: 2026-10-19
---

# Phase 1 Plan 10: Staging deploy Summary

**Staging is live at https://novo.swingbrasilia.com.br on the client's Hostinger VPS: GitHub Actions builds the site and migration images into GHCR, and a systemd timer installed by bootstrap-vps.sh pulls them, runs migrations and restarts behind Caddy with automatic HTTPS; media and Postgres live in named volumes on the VPS disk.**

## Performance

- **Duration:** build/deploy work ~1 h (2026-10-18); then waited on the client to run the bootstrap
- **Started:** 2026-10-18T19:40:00Z
- **Completed:** 2026-10-19
- **Tasks:** 3 (Task 1 and Task 2 done; Task 3 human checks partly pending — see below)
- **Files modified:** 20

## Accomplishments
- Client provisioned Hostinger VPS (IP 187.77.246.132, Ubuntu 24.04), created DNS A record `novo` in hPanel, and ran scripts/deploy/bootstrap-vps.sh
- GitHub repo pirukatfl/paraisobrasilia (branch main); workflow deploy-staging built and pushed images to GHCR successfully (run 39162346021)
- Client confirmed on 2026-10-19: "site já está em produção e podendo ser acessado" at https://novo.swingbrasilia.com.br
- Database has no published ports; ufw allows only 22/80/443; staging sends noindex and robots.txt "Disallow: /" (enforced by code from 01-08)

## Task Commits

1. **Task 1: Client provisions VPS and DNS** - client action (no commit); recorded 2026-10-19
2. **Task 2: Container build, compose, deploy, runbook, smoke spec** - `a4fa533` (fix), `f179c77` (feat), `0c5e1da` (feat), `d04c9ad` (feat), `06aec74` (test), `8ef28bc` (docs), `da7d3d9` (chore)
3. **Task 3: Phase acceptance (human checks)** - partly pending; recorded in the phase-close commit

## Files Created/Modified
- `Dockerfile` - deps / builder / migrate / runner stages, non-root runner, TZ America/Sao_Paulo
- `docker-compose.staging.yml` / `docker-compose.staging.ghcr.yml` - db, migrate, app, caddy; volumes pgdata, media, caddy_data
- `Caddyfile` - reverse_proxy app:3000 with HTTPS and HSTS
- `.github/workflows/deploy-staging.yml` - build and push images to GHCR
- `scripts/deploy/bootstrap-vps.sh` - one-time VPS setup plus systemd update timer
- `scripts/deploy/deploy-staging.sh` - SSH/rsync alternative
- `docs/deploy/STAGING.md` - runbook in Portuguese
- `tests/e2e/staging-smoke.spec.ts` - read-only smoke checks
- `next.config.ts`, `src/payload.config.ts`, `src/collections/Media.ts` - standalone output, MEDIA_DIR
- `src/app/(frontend)/page.tsx`, `festas/[slug]/page.tsx`, `src/app/sitemap.ts`, `src/lib/parties/queries.ts` - build without a database

## Decisions Made
See key-decisions above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No SSH from our environment → pull-based deploy**
- **Found during:** Task 1/2
- **Issue:** The plan assumed the developer would SSH into the VPS and run deploy-staging.sh; this environment cannot open SSH to the VPS (and has no Docker daemon)
- **Fix:** GitHub Actions builds and pushes images to GHCR; the client runs bootstrap-vps.sh once; a systemd timer (paraiso-update.timer, every 5 min) pulls new images, runs migrations and restarts. deploy-staging.sh kept as the SSH alternative
- **Files modified:** .github/workflows/deploy-staging.yml, docker-compose.staging.ghcr.yml, scripts/deploy/bootstrap-vps.sh, docs/deploy/STAGING.md
- **Verification:** workflow run 39162346021 pushed images; client confirmed the site is reachable
- **Committed in:** d04c9ad, 8ef28bc

**2. [Client decision] Media on the VPS disk instead of Backblaze B2**
- **Issue:** Original plan stored media in B2 via @payloadcms/storage-s3
- **Fix:** Local upload storage at MEDIA_DIR on the named volume `media`; backups must include pgdata and media (Phase 7)
- **Committed in:** 9a259c6, f179c77, 0c5e1da

**3. [Rule 3 - Blocking] STAGING_URL defaulted in the workflow**
- **Issue:** The workflow failed when the repo variable STAGING_URL was not set
- **Fix:** `vars.STAGING_URL || 'https://novo.swingbrasilia.com.br'`
- **Committed in:** da7d3d9

**4. [Rule 3 - Blocking] bootstrap GHCR_IMAGE set to ghcr.io/pirukatfl/paraisobrasilia**
- **Issue:** Script shipped with a CHANGE-ME placeholder
- **Fix:** Default set to the real repo image so the client runs it unchanged
- **Committed in:** da7d3d9

**5. [Rule 3 - Blocking] Build without a database**
- **Issue:** `pnpm build` prerendered DB-backed routes, impossible in CI
- **Fix:** Home and sitemap render per request over the tagged data cache; party pages ISR on first request
- **Committed in:** a4fa533

---

**Total deviations:** 5 (4 blocking fixes, 1 client decision)
**Impact on plan:** Same outcome (HTTPS staging, migrations, persistent media, closed DB) with a deploy path that does not need developer SSH.

## Issues Encountered
- `docker build` could not run locally (no Docker daemon); the first real build ran in GitHub Actions and succeeded
- **Staging smoke tests NOT run by us:** this environment's egress proxy blocks novo.swingbrasilia.com.br, so `E2E_BASE_URL=https://novo.swingbrasilia.com.br pnpm exec playwright test tests/e2e/staging-smoke.spec.ts` is a pending verification, not a pass

## Human acceptance (Task 3) — status 2026-10-19
- Site reachable over HTTPS on the phone: confirmed by the client ("site já está em produção e podendo ser acessado")
- WhatsApp/Instagram share preview (flyer + title + "Paraíso Brasília"): **pending client confirmation** (date of check not reported)
- Staff member creates, edits, unpublishes a party alone; past party gone from home: **pending client confirmation** (no label feedback reported yet)
- Visual feel (D-04) and logo sharpness: not explicitly reported
- Any issue reported later becomes a gap via `/gsd:plan-phase 1 --gaps`

## User Setup Required
- Create the first staff user at https://novo.swingbrasilia.com.br/admin (runbook: docs/deploy/STAGING.md)
- Turn on Hostinger VPS backups/snapshots now (full automated backup of pgdata + media is Phase 7)

## Next Phase Readiness
- Every push to main on pirukatfl/paraisobrasilia redeploys staging automatically
- Open: smoke run from a network that can reach the host; WhatsApp-preview and staff-usability confirmations

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-19*
