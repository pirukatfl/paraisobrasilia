---
phase: 01-funda-o-e-vitrine-de-festas
plan: 03
subsystem: testing
tags: [vitest, playwright, payload-local-api, postgres, fixtures]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js + Payload scaffold, users collection, paraiso_test database
provides:
  - Vitest 5.0.5 config (unit + int, .env.test, serial files, server-only stub)
  - Playwright 1.64.1 config (mobile Pixel 7 + desktop, webServer pnpm dev on paraiso_test, globalSetup, E2E_BASE_URL override)
  - tests/helpers/seed.ts (getTestPayload, resetDatabase guarded to paraiso_test, seedStaffUser, seedParty stub)
  - tests/helpers/dates.ts (brasiliaAt helper)
  - SFW flyer fixtures 1080x1350 and 1080x1080
  - Red FEST-01 home e2e
affects: [01-04, 01-05, 01-06, 01-07, 01-08, 01-09, 01-10]

# Tech tracking
tech-stack:
  added:
    - vitest 5.0.5
    - "@playwright/test 1.64.1"
  patterns:
    - "Tests import the Payload config lazily after loading .env.test (getTestPayload)"
    - "Playwright runs serially (workers: 1) because e2e shares one seeded database"
    - "PW_CHROMIUM_PATH (optional, .env.test) points Playwright at a preinstalled Chromium"

key-files:
  created:
    - vitest.config.mts
    - playwright.config.ts
    - .env.test.example
    - tests/helpers/seed.ts
    - tests/helpers/dates.ts
    - tests/helpers/server-only-stub.ts
    - tests/e2e/global-setup.ts
    - tests/e2e/home.spec.ts
    - tests/unit/smoke.test.ts
    - tests/fixtures/flyer-portrait.jpg
    - tests/fixtures/flyer-square.jpg
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Playwright browser not downloaded: optional PW_CHROMIUM_PATH env var feeds launchOptions.executablePath (environment ships Chromium build 1194; @playwright/test 1.64.1 expects 1248)"
  - "`server-only` aliased to an empty stub in Vitest (Next resolves it itself; no extra package)"
  - "e2e workers: 1, fullyParallel false — one shared seeded database"

patterns-established:
  - "Every e2e that is not about the age gate sets cookie pb_age_ok=1 before navigation"
  - "Seed dates built with brasiliaAt(days, hh) so tests are independent of the machine time zone"

requirements-completed: []  # FEST-01 is only test-covered here (red); delivered by 01-05/01-07

# Metrics
duration: 3min
completed: 2026-10-17
---

# Phase 1 Plan 03: Test harness Summary

**Vitest 5 (unit + Payload Local API int against `paraiso_test`) and Playwright 1.64 (Pixel 7 + desktop) with Local API seed helpers, SFW flyer fixtures and a FEST-01 home e2e that is red only on the missing party link.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-17T20:15:51Z
- **Completed:** 2026-10-17T20:19:05Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- `pnpm test:unit`, `test:int`, `test:e2e`, `test` scripts; Vitest loads `.env.test` (override) so tests never touch the dev DB
- `resetDatabase` refuses any DATABASE_URI not ending in `/paraiso_test` (T-01-36)
- Global setup resets the DB and seeds the staff user `equipe@teste.local`; party seeding is attempted and skipped with a warning until 01-05
- `home.spec.ts` fails at `getByRole('link', { name: 'Ver detalhes da festa Festa de Teste' })` — server, DB and setup all work

## Task Commits

1. **Task 1: Vitest + Playwright configuration, seed helpers, fixtures, smoke test** - `b12eca9` (test)
2. **Task 2: Global setup and failing FEST-01 home e2e** - `16d059c` (test)

## Verification

| Check | Result |
|---|---|
| `pnpm test:unit` | 1 file, 1 test passed |
| seed.ts exports getTestPayload/resetDatabase/seedStaffUser/seedParty | 4/4 PASS |
| fixture metadata | `1080 1350` PASS (portrait 34 KB, square 32 KB) |
| playwright.config.ts has globalSetup, reuseExistingServer, Pixel 7 | PASS |
| `git check-ignore .env.test` | `.env.test` PASS |
| `playwright test tests/e2e/home.spec.ts --project=desktop` | 1 failed at the "Ver detalhes da festa Festa de Teste" link assertion (expected red); grep of output found the string (4 matches) |
| home.spec.ts contains `pb_age_ok` and `/festas/festa-de-teste` | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `playwright install chromium` not run**
- **Issue:** the environment forbids browser downloads; a Chromium (build 1194) is preinstalled at `/opt/pw-browsers/chromium`, while @playwright/test 1.64.1 expects build 1248.
- **Fix:** playwright.config.ts reads optional `PW_CHROMIUM_PATH` and passes it as `launchOptions.executablePath`; the local `.env.test` sets it. Developers with a normal setup run `pnpm exec playwright install chromium` and leave it unset.

**2. [Rule 2 - Missing critical] `server-only` stub for Vitest**
- Vitest cannot resolve `server-only` (Next bundles its own copy); aliased to `tests/helpers/server-only-stub.ts` so 01-05's query module is testable.

**3. [Rule 2] `tests/helpers/dates.ts`** added for the "23:00 America/Sao_Paulo in N days" seed times (reused by 01-07/01-09).

---

**Total deviations:** 3 (1 environment, 2 small helpers). **Impact:** none on contracts.

## Issues Encountered

- The 01-03 runs used Payload dev-mode schema push on `paraiso_test` (no migrations exist yet). 01-05 switches non-development environments to migrations and must reset the test DB schema once before running `payload migrate`.
- `pnpm add` warns about an unmet optional peer (`vite 8.3.4` wants esbuild ^0.27; found 0.25.12 from another dependency). Vitest runs fine.

## Next Phase Readiness

- Ready for 01-04 and 01-05 (wave 3). `seedParty` must be implemented in 01-05.

## Self-Check: PASSED

- All key files exist; `git log --grep=01-03` returns 2 task commits; acceptance criteria re-run above.

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
