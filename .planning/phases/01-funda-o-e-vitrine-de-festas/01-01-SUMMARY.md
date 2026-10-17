---
phase: 01-funda-o-e-vitrine-de-festas
plan: 01
subsystem: infra
tags: [nextjs, payload, postgres, tailwind, pnpm, docker-compose, i18n]

# Dependency graph
requires: []
provides:
  - Next.js 16.4.2 + Payload 3.91.0 app in the repo root (src/app/(frontend), src/app/(payload))
  - Payload config with postgres adapter (DATABASE_URI), sharp, pt/en admin i18n (pt fallback), dark theme
  - Staff `users` auth collection (maxLoginAttempts 5, lockTime 10 min, no anonymous create)
  - docker-compose `db` service (postgres:16-alpine, 127.0.0.1:5432) + initdb creating `paraiso_test`
  - .env.example contract (DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL, SITE_ENV, AGE_GATE_PROVIDER, TZ)
  - Tailwind 4 PostCSS plugin wired (postcss.config.mjs); stylesheet comes in 01-04
  - pnpm scripts dev/build/start/generate:types/generate:importmap/payload/lint/typecheck
affects: [01-03, 01-04, 01-05, 01-08, 01-09, 01-10]

# Tech tracking
tech-stack:
  added:
    - payload 3.91.0
    - "@payloadcms/next, db-postgres, richtext-lexical, translations, plugin-seo, storage-s3, ui 3.91.0"
    - next 16.4.2
    - react / react-dom 19.3.1
    - sharp 0.35.5
    - graphql 16.14.2 (^16.8.1)
    - typescript 5.9.3 (~5.9.3)
    - tailwindcss + @tailwindcss/postcss 4.3.3
    - "template extras: cross-env ^7.0.3, dotenv 16.4.7, eslint ^9.16.0, eslint-config-next 16.4.2, prettier ^3.4.2, @types/node 22.19.9, @types/react 19.2.14, @types/react-dom 19.2.3"
  patterns:
    - "All @payloadcms/* pinned to the same exact version as payload"
    - "Env var for the DB is DATABASE_URI (template default DATABASE_URL renamed)"
    - "Template test harness removed; plan 01-03 owns vitest/playwright configs"

key-files:
  created:
    - package.json
    - pnpm-lock.yaml
    - src/payload.config.ts
    - src/collections/Users.ts
    - src/app/(frontend)/layout.tsx
    - src/app/(frontend)/page.tsx
    - src/app/(payload)/ (generated)
    - src/payload-types.ts
    - postcss.config.mjs
    - eslint.config.mjs
    - docker-compose.yml
    - docker/initdb/01-test-db.sql
    - .env.example
    - .gitignore
    - AGENTS.md
  modified: []

key-decisions:
  - "Template test tooling (vitest 4.0.18, @playwright/test 1.58.2, jsdom, @testing-library/react, @vitejs/plugin-react, vite-tsconfig-paths, tsx, tests/, configs) removed: versions differ from the approved vitest 5.0.5 / playwright 1.64.1 and plan 01-03 owns the harness"
  - "Template Media collection removed; plan 01-05 creates src/collections/Media.ts"
  - "ESLint config rewritten to eslint-config-next 16 native flat config (template FlatCompat import of @eslint/eslintrc fails under pnpm)"
  - "AGENTS.md (auto-written by `next dev` in Next 16.4) committed so the tree stays clean"
  - ".claude/ is gitignored (local GSD tooling)"

patterns-established:
  - "Route groups by trust level: (frontend) public, (payload) generated admin/API"
  - "Collections in src/collections/*, registered in src/payload.config.ts"

requirements-completed: [PAINEL-01]  # partial: staff admin + login foundation only; PAINEL-01 is also covered by 01-09/01-10, so REQUIREMENTS.md was NOT marked complete

# Metrics
duration: 6min
completed: 2026-10-17
---

# Phase 1 Plan 01: Scaffold Next.js + Payload + Postgres Summary

**Next.js 16.4.2 + Payload 3.91.0 app on PostgreSQL 16 with a Portuguese, dark-theme staff admin, locked-down staff `users` auth, Tailwind 4 PostCSS wiring and a one-command local run (`docker compose up -d db && pnpm dev`).**

## Performance

- **Duration:** 6 min (Task 2 execution; Task 1 approval happened earlier)
- **Started:** 2026-10-17T20:06:48Z
- **Completed:** 2026-10-17T20:12:30Z
- **Tasks:** 2 (Task 1 approval gate, Task 2 scaffold)
- **Files modified:** 32 created

## Accomplishments

- Scaffolded from `create-payload-app@3.91.0 -t blank --db postgres` in the scratchpad, demo content stripped, moved into the repo root without touching `.planning/`, `brand/`, `CLAUDE.md`, `.claude/`, `.git/`
- Exact version pins per plan (8 × `"3.91.0"` in package.json, next 16.4.2, react 19.3.1, sharp 0.35.5, graphql ^16.8.1 → 16.14.2, typescript ~5.9.3); `packageManager: pnpm@10.28.0`, `engines.node >=22`
- Admin in Portuguese (`<html lang="pt">`, title "Painel de Controle — Paraíso Brasília", "Criar primeiro usuário" screen), dark theme
- Staff auth hardened: anonymous `POST /api/users` → 403 before and after the first user; first user only through `/api/users/first-register` (second attempt → 403); anonymous `GET /api/users` → 403
- Home `/` renders `<html lang="pt-BR">` with heading "Próximas festas"

## Task Commits

1. **Task 1: Confirm dependency list** — no commit (human approved exactly the planned list; packages verified on npm)
2. **Task 2: Scaffold Next.js + Payload + Postgres** —
   - `d1775ad` feat(01-01): scaffold Next.js 16 + Payload 3.91 app with Portuguese staff admin
   - `1453e2d` chore(01-01): add local Postgres 16 compose service and env example
   - `f32a33f` chore(01-01): commit AGENTS.md generated by next dev

**Plan metadata:** see the `docs(01-01)` commit that adds this file.

## Files Created/Modified

- `package.json`, `pnpm-lock.yaml` — pinned deps, scripts incl. `typecheck`
- `src/payload.config.ts` — postgres adapter (DATABASE_URI), sharp, i18n pt/en (fallback pt), dark theme, titleSuffix, 15 MB upload limit, types → `src/payload-types.ts`
- `src/collections/Users.ts` — staff auth, Portuguese labels, `name` field, access requires `req.user`
- `src/app/(frontend)/layout.tsx`, `page.tsx` — pt-BR shell, "Próximas festas" heading
- `src/app/(payload)/**` — template-generated admin/API routes, regenerated importMap
- `postcss.config.mjs` — `@tailwindcss/postcss`
- `eslint.config.mjs` — native flat config from eslint-config-next 16
- `docker-compose.yml`, `docker/initdb/01-test-db.sql` — Postgres 16 on loopback, `paraiso_test` DB
- `.env.example` — env contract + local run comment; `.gitignore` — `.env`/`.env.*` (examples allowed), `/media`, `node_modules`, `.next`, `playwright-report`, `test-results`, `.claude/`
- Template files kept as-is: `README.md`, `Dockerfile`, `.npmrc`, `.yarnrc`, `.prettierrc.json`, `.vscode/`, `next.config.ts`, `tsconfig.json`

## Acceptance Checks

| Check | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm build` | exit 0 (Next 16.4.2 Turbopack; `/` static, admin/api dynamic) |
| package.json pins (payload, @payloadcms/next 3.91.0, next 16.4.2, graphql ^16.8.1, typescript ~5.9.3) | PASS |
| `grep -c '"3.91.0"' package.json` | 8 (≥ 7) PASS |
| payload.config has `supportedLanguages` and `@payloadcms/translations/languages/pt` | PASS |
| Users.ts has `maxLoginAttempts: 5` | PASS |
| docker-compose has `postgres:16-alpine` and `127.0.0.1:5432:5432` | PASS |
| `git check-ignore .env` → `.env`; `git ls-files \| grep '^\.env$'` → empty | PASS |
| `curl /` with dev server + DB | 200 PASS |
| `curl /admin` | 200 PASS |
| `pnpm lint` (extra) | exit 0 |

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No Docker daemon in the execution environment**
- **Found during:** Task 2 verification
- **Issue:** `docker compose up -d db` cannot run here.
- **Fix:** docker-compose.yml and docker/initdb were written as specified, but local verification used PostgreSQL 16 from `/usr/lib/postgresql/16/bin` (initdb/pg_ctl as user `postgres`, data in `/home/claude/pgdata`, listening 127.0.0.1:5432) with role `paraiso`/`paraiso_dev` and databases `paraiso` and `paraiso_test` created by hand. The compose file itself was not exercised.
- **Verification:** dev server connected, Payload pushed its schema (`users`, `users_sessions`, `payload_*` tables), curl checks passed.

**2. [Rule 3 - Blocking] Template ESLint config fails under pnpm**
- **Found during:** Task 2 (`pnpm lint`)
- **Issue:** template `eslint.config.mjs` imports `@eslint/eslintrc` (FlatCompat), which is not a direct dependency → `ERR_MODULE_NOT_FOUND`.
- **Fix:** use `eslint-config-next/core-web-vitals` + `/typescript` native flat configs (no new package); ignore `.claude/`, `.planning/`, generated `(payload)` routes and `payload-types.ts`.
- **Files modified:** eslint.config.mjs — **Committed in:** d1775ad

**3. [Scope] Template test harness and demo content removed**
- **Issue:** the blank template ships vitest 4.0.18, @playwright/test 1.58.2, jsdom, @testing-library/react, @vitejs/plugin-react, vite-tsconfig-paths, tsx plus `tests/`, configs, `test.env`, a demo `my-route`, a `Media` collection and `styles.css`.
- **Fix:** removed; plan 01-03 installs the approved vitest 5.0.5 / @playwright/test 1.64.1 and writes its own configs; 01-05 creates Media; 01-04 creates globals.css. `dotenv` kept (template dep, needed by 01-03).
- **Committed in:** d1775ad

**4. [Rule 3] `AGENTS.md` auto-generated by `next dev`**
- **Issue:** Next 16.4 writes `AGENTS.md` on every `next dev` run (disable with `agentRules: false` in next.config).
- **Fix:** committed it (file's own advice) rather than editing next.config.ts. **Committed in:** f32a33f

**5. Vitest/Playwright not installed in this plan**
- The approved list includes vitest 5.0.5 and @playwright/test 1.64.1, but Task 2's action does not install them; plan 01-03 does.

---

**Total deviations:** 5 (2 blocking environment/tooling fixes, 3 scope clarifications). **Impact:** none on the plan's contracts; compose file untested against a real Docker daemon.

## Issues Encountered

- Repo on the network mount is owned by another uid; `git clone` needed `safe.directory` for `/mnt/project-files/paraiso-site`. Work done in a local clone (`/home/claude/paraiso-site`) for install speed and merged back.
- Payload warns "No email adapter provided" in dev (expected until an email provider is chosen).

## User Setup Required

None - no external service configuration required. Developers need Docker (or a local Postgres 16) and `cp .env.example .env` with a strong `PAYLOAD_SECRET`.

## Next Phase Readiness

- Ready for 01-02 / 01-03 (test harness on `paraiso_test`) and 01-04 (globals.css + brand shell).
- PAINEL-01 only has its foundation (staff login in Portuguese); party publishing arrives in 01-05/01-09.
- Concern: compose file not exercised in this environment; first developer run with Docker should confirm the initdb script creates `paraiso_test`.

## Self-Check: PASSED

- key files exist on disk; `git log --grep=01-01` returns 3 commits; all acceptance criteria re-run and passing (table above).

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
