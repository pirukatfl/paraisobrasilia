---
phase: 03-assinantes-e-controle-de-acesso
plan: 03
subsystem: auth
tags: [subscriptions, periods, entitlement, timezone, members-area]

# Dependency graph
requires:
  - phase: 03-01
    provides: assinantes, requireAssinante, members layout, loginAsAssinante
  - phase: 03-02
    provides: plans (durationDays), seed plans, findPlans helper
provides:
  - Pure period rules src/lib/assinantes/periods.ts (spDate, spMidnight, addDaysToDate, renewalWindow, isPeriodActive, accessUntilOf, validUntilLabel, daysLeft) + formatShortDate
  - Collection `subscriptions` (periods + payment, no delete) with hooks maintaining assinantes.accessUntil
  - assinantes.accessUntil and join 'Períodos e pagamentos'; delete cascade of periods
  - getAccessStatus / accessStatusOf, requireActiveSubscription
  - withRequestState helper (restores req.context/user after nested Local API calls)
  - /area-do-assinante status panel, /area-do-assinante/exclusivo placeholder
  - Helpers seedSubscription, createSubscription/endSubscription, expectFieldError (tests/helpers/errors.ts)
affects: [03-04 (service + audit use periods/accessUntil), 03-06 (expiring list), phase 4 (exclusivo content)]

tech-stack:
  added: []
  patterns:
    - "Entitlement computed from periods per request; accessUntil only denormalised for listing"
    - "endsAt exclusive at São Paulo midnight; labels show endsAt − 1 ms"
    - "Nested Local API calls inside hooks wrapped in withRequestState (Payload mutates the shared req)"

key-files:
  created:
    - src/lib/assinantes/periods.ts
    - src/lib/assinantes/access.ts
    - src/lib/assinantes/context.ts
    - src/collections/Subscriptions.ts
    - src/migrations/20261019_125108_subscriptions.ts
    - src/components/assinantes/SubscriptionStatus.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/exclusivo/page.tsx
    - tests/unit/periods.test.ts
    - tests/int/subscriptions.int.test.ts
    - tests/e2e/minha-assinatura.spec.ts
    - tests/helpers/errors.ts
  modified:
    - src/collections/Assinantes.ts
    - src/lib/assinantes/session.ts
    - src/lib/format/date.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/app/(frontend)/(membros)/layout.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/page.tsx
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts
    - tests/int/plans.int.test.ts

key-decisions:
  - "State rules: any active period → ativa; else the latest staff closing after the latest natural end → encerrada; else periods exist → vencida; else sem-assinatura"
  - "Validation errors on periods are ValidationError on field endsAt (admin highlights the field)"
  - "Account deletion removes its periods in beforeDelete (moved forward from 03-04: required FK blocks deletion otherwise)"
  - "Period without plan shows 'Cortesia / outro prazo' in the summary"

patterns-established:
  - "withRequestState(req, fn) around req.payload.* calls made from hooks/services"

requirements-completed: [ASS-03, ASS-04]

# Metrics
duration: 30min
completed: 2026-10-19
---

# Phase 3 Plan 03: Subscription periods and date-based access Summary

**Access now comes from subscription periods evaluated on every request in Brasília time: a period counts while `startsAt <= now < endsAt` with `endsAt` at the São Paulo midnight after the last valid day, subscribers see "Válida até 17 de novembro de 2026 / Faltam N dias", and the restricted page renders no restricted markup once a period expires or staff end it.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments

- TDD period rules (RED `81a7f21`, GREEN `b4f3dc7`): 23:30 BRT edge, exclusive end, renewal from the current end, imported non-midnight ends floored to their São Paulo date, `daysLeft` 1 on the last day; no Payload/Next imports (reused by the admin preview in 03-04).
- `subscriptions` (group Assinantes): endsAt filled from the plan when empty; pt validation on endsAt; summary "Mensal · 19/10/2026 a 17/11/2026"; closedAt when status flips to encerrada; staff-only read/create/update; delete never through the API.
- `assinantes.accessUntil` recomputed after every period change (context `skipAudit`), read-only in the admin; join "Períodos e pagamentos".
- Members area: "Minha assinatura" panel per state and "Conteúdo exclusivo" guarded by `requireActiveSubscription`.

## Task Commits

1. **Task 1: São Paulo date rules** - `81a7f21` (test, RED), `b4f3dc7` (feat, GREEN)
2. **Task 2: subscriptions, accessUntil and the entitlement DAL** - `267a76a` (feat)
3. **Task 3: Minha assinatura and the restricted placeholder** - `b781010` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/periods.test.ts tests/unit/date.test.ts` | 16 passed |
| periods.ts imports payload/next | 0 |
| test(03-03) commit before feat(03-03) for periods | yes |
| `vitest run` subscriptions, assinantes-auth, access-roles | 22 passed (incl. cascade delete) |
| subscriptions migration registered; Subscriptions.ts has `delete: () => false` and `skipAudit` | yes |
| `playwright test minha-assinatura.spec.ts assinante-login.spec.ts` | 24 passed (both projects) |
| `pnpm test` | vitest 22 files / 125 tests; playwright 102 passed, 26 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Payload Local API mutates the shared request**
- **Found during:** Task 2 (reading `createLocalReq` before passing `context: { skipAudit: true }` with `req`)
- **Issue:** `payload.update({ req, context })` merges `context` into `req.context` and sets `req.user` permanently, so `skipAudit` would leak into later hooks of the same request (03-04 audit) and a `user` passed for the self password change (03-05) would stay on the request.
- **Fix:** `withRequestState(req, fn)` (src/lib/assinantes/context.ts) restores both after nested calls; used by the subscription hooks and the delete cascade.
- **Commit:** 267a76a

**2. [Rule 3 - Blocking] Deleting a subscriber with periods failed**
- **Issue:** `subscriptions.assinante` is required but the generated FK is `ON DELETE set null`; e2e cleanup (`deleteAll('assinantes')`) failed once periods existed.
- **Fix:** Assinantes `beforeDelete` deletes the account's periods (overrideAccess, same request, context `skipAudit` + `assinanteBeingDeleted`) and stores `periodosRemovidos` in `req.context` for 03-04's audit entry. Planned for 03-04 Task 1; brought forward. Int test added.
- **Commit:** b781010

**3. [Rule 1 - Bug] Generated types require defaulted fields** — int tests create periods through a small cast helper (`createSub`); runtime unchanged.

## Self-Check: PASSED
