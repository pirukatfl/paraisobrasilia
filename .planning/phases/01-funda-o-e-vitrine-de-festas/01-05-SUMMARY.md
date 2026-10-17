---
phase: 01-funda-o-e-vitrine-de-festas
plan: 05
subsystem: database
tags: [payload, postgres, migrations, sharp, next-image, isr]

# Dependency graph
requires:
  - phase: 01-03
    provides: test harness, seed helpers
  - phase: 01-04
    provides: tokens and type classes used by the cards
provides:
  - media collection (alt required, jpeg/png/webp only, card/square/portrait WebP derivatives)
  - parties collection (title, slug auto from title, startsAt, endsAt default +10h, flyer, flyerFormat)
  - src/migrations/20261017_202602_initial (users, media, parties); push only when SITE_ENV=development
  - src/lib/parties/{types,visibility,queries}.ts (PartyCardDTO, isUpcoming, defaultEndsAt, getUpcomingParties, toPartyCard)
  - Home flyer grid (PartyGrid/PartyCard) with ISR revalidate 600 and empty state
  - seedParty implemented (uploads fixture flyer + creates party); getTestPayload runs migrations
affects: [01-07, 01-08, 01-09, 01-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migrations-first: test/staging/prod run `payload migrate`; dev DB keeps push"
    - "Tests migrate the test DB via payload.db.migrate({ migrations }) from src/migrations/index.ts"
    - "Each imageSize carries its own formatOptions (Payload applies top-level formatOptions to the original only)"

key-files:
  created:
    - src/collections/Media.ts
    - src/collections/Parties.ts
    - src/migrations/20261017_202602_initial.ts
    - src/migrations/20261017_202602_initial.json
    - src/migrations/index.ts
    - src/lib/parties/types.ts
    - src/lib/parties/visibility.ts
    - src/lib/parties/queries.ts
    - src/components/PartyCard.tsx
    - src/components/PartyGrid.tsx
    - tests/unit/visibility.test.ts
    - tests/int/parties.int.test.ts
  modified:
    - src/payload.config.ts
    - src/payload-types.ts
    - src/app/(frontend)/page.tsx
    - tests/helpers/seed.ts
    - eslint.config.mjs

key-decisions:
  - "migrationDir src/migrations; `push: process.env.SITE_ENV === 'development'`"
  - "paraiso_test schema was dropped and recreated once (it had been dev-pushed in 01-03), then migrated"
  - "Generated src/migrations/** excluded from ESLint (unused-arg warnings in generated code)"
  - "Draft-party case of the int test moved to 01-09 (drafts do not exist before that plan)"

patterns-established:
  - "Pages call src/lib/parties/queries.ts (server-only) and pass DTOs to components"

requirements-completed: []  # FEST-01 completed with the card date line in 01-07; FEST-04 completed in 01-09

# Metrics
duration: 5min
completed: 2026-10-17
---

# Phase 1 Plan 05: Parties skeleton slice Summary

**Media + Parties collections on Postgres with a committed initial migration, a pure time-based visibility rule (default end = start + 10 h), a server-only `getUpcomingParties` query returning DTOs, and the home flyer grid rendering 1:1 / 4:5 cards soonest-first — the FEST-01 e2e is now green.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-17T20:25:03Z
- **Completed:** 2026-10-17T20:30:48Z
- **Tasks:** 3
- **Files modified:** 17

## Task Commits

1. **Task 1: Visibility rule and upcoming-party query, test first** - `1fca829` (feat)
2. **Task 2: Media and Parties collections + migration + query** - `94ea6a6` (feat)
3. **Task 3: Home flyer grid** - `f93e8ee` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/visibility.test.ts` | 3 passed |
| `vitest run tests/int/parties.int.test.ts tests/unit` | 3 files, 5 tests passed |
| `payload migrate:status` (paraiso_test) | `20261017_202602_initial · batch 1 · Ran Yes` |
| `ls src/migrations/*.ts \| wc -l` | 2 (initial + index) |
| Media.ts has mimeTypes, no `image/svg` | PASS |
| Parties.ts has defaultEndsAt, flyerFormat | PASS |
| queries.ts first line `import 'server-only'`, contains greater_than | PASS |
| `playwright test tests/e2e/home.spec.ts` | 2 passed (mobile + desktop) |
| `playwright test tests/e2e/shell.spec.ts` (regression) | 6 passed |
| page.tsx revalidate 600 / getUpcomingParties / empty-state copy | PASS |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

**1. [Rule 3 - Blocking] Test DB had been dev-pushed** — Payload's `migrate` prompts interactively when it finds a dev push (batch -1). Dropped and recreated the `public` schema of `paraiso_test` once, then migrated. The dev DB `paraiso` keeps push (SITE_ENV=development) and is not migrated.

**2. [Rule 2] Per-size `formatOptions`** — Payload 3.91 types state that top-level `formatOptions` only formats the original; each derivative got `formatOptions: webp q82` too.

**3. [Rule 2] getTestPayload runs migrations** so a fresh clone's test DB is ready without a manual `payload migrate`.

**4. [Scope] Draft case of the int test** (plan behavior "one draft party") is covered in 01-09, which introduces drafts.

**5. Manual admin check** (create a party in /admin with flyer-square.jpg) replaced by the int test that seeds a square party through the Local API; the admin flow is automated in 01-09.

## Issues Encountered

- `pnpm build` now queries the database while prerendering `/` (ISR page). Builds need DATABASE_URI reachable — relevant for the Docker build in 01-10.
- The /mnt/project-files mount rewrites committed image files (logo, icons, fixtures) ~30 s after they are written, leaving the canonical working tree "modified"; the sync step restores them; blobs in git are correct.

## Next Phase Readiness

- 01-06 (age gate) and 01-07 (party page) can start; `getPartyBySlug` is added in 01-07.

## Self-Check: PASSED

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
