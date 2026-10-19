---
phase: 03-assinantes-e-controle-de-acesso
plan: 06
subsystem: admin
tags: [dashboard, expiring, security, leak-matrix, graphql]

# Dependency graph
requires:
  - phase: 03-05
    provides: link-senha endpoint, password pages
  - phase: 03-04
    provides: service/endpoints, audit-log, accessUntil maintenance
provides:
  - getExpiringSoon(payload, now, days = 7) in src/lib/assinantes/service.ts
  - "Vencem nos próximos 7 dias" server component at admin.components.beforeDashboard
  - GraphQL disabled (graphQL.disable true; /api/graphql answers 404)
  - Phase-wide e2e leak matrix (tests/e2e/assinantes-seguranca.spec.ts)
affects: [03-07 (staging), every later phase adding gated collections (extend the matrix)]

tech-stack:
  added: []
  patterns:
    - "Subscriber-session API checks run as in-page fetch (same origin), because Payload ignores the auth cookie from clients without Origin/Sec-Fetch-Site when csrf is configured"

key-files:
  created:
    - src/components/admin/assinantes/Vencimentos.tsx
    - tests/int/expiring.int.test.ts
    - tests/e2e/vencimentos.spec.ts
    - tests/e2e/assinantes-seguranca.spec.ts
  modified:
    - src/lib/assinantes/service.ts
    - src/payload.config.ts
    - src/app/(payload)/admin/importMap.js
    - tests/e2e/helpers/api.ts

key-decisions:
  - "A3 confirmed: beforeDashboard server components receive payload and user as server props (no getPayload fallback needed)"
  - "Expiring list reads the denormalised accessUntil, so renewed and ended accounts leave the list without extra logic"
  - "'vence em dd/MM' shows the last valid day (accessUntil minus 1 ms), consistent with 'válida até' elsewhere"
  - "GraphQL route files kept: with graphQL.disable Payload's handler answers 404"

patterns-established:
  - "New gated collections must be added to assinantes-seguranca.spec.ts for both anonymous and subscriber principals"

requirements-completed: [PAINEL-06]

# Metrics
duration: 30min
completed: 2026-10-19
---

# Phase 3 Plan 06: Expiring this week and the leak matrix Summary

**When staff open /admin they now see "Vencem nos próximos 7 dias" (soonest first, end date, days left, "Abrir" and a WhatsApp button with a renewal message). GraphQL is off, and an end-to-end matrix checks that anonymous visitors and subscribers cannot read or change anything that is not theirs.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `getExpiringSoon`: `accessUntil > now AND <= now + 7 days`, sorted by `accessUntil`, limit 100. Int test covers 1 day, the inclusive 7-day limit, 8 days, already expired, renewed, and an ended period inside the window.
- `Vencimentos.tsx` (server component, returns nothing unless the user is staff): rows "vence em dd/MM (N dias)", link "Abrir" to the subscriber page, "WhatsApp" (only when the account has a number) with the text "Olá, {nome}! Sua assinatura do Paraíso vence em {dd/MM}. Quer renovar? …"; empty state "Nenhuma assinatura vence nos próximos 7 dias."; "Ver todos por vencimento" → `/admin/collections/assinantes?sort=accessUntil`.
- Leak matrix (both projects, 8 tests each):
  - Anonymous: assinantes, subscriptions, audit-log and users show no data; create, forgot-password and first-register (with an empty collection) are refused; liberar, encerrar, link-senha and situacao return 403; plans lists active only; GraphQL returns no data.
  - Subscriber (in-page fetch): reads only its own account, without staffNotes. Cannot read another account, patch accessUntil, create periods, call staff endpoints, read audit-log or users, or create parties. Its access is unchanged afterwards, and it cannot open the /admin dashboard.
  - The same cookie sent by a non-browser client is ignored.
  - The sitemap has /assine-ja and none of the members or auth pages. /entrar, /nova-senha and /area-do-assinante answer noindex, and /area-do-assinante also sends no-store.

## Task Commits

1. **Task 1: "Vencem nos próximos 7 dias" on the admin dashboard** - `24450c1` (feat)
2. **Task 2: Leak matrix and GraphQL off** - `1d54a55` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/int/expiring.int.test.ts` | 2 passed |
| `playwright test tests/e2e/vencimentos.spec.ts --project=desktop` | 2 passed |
| `playwright test tests/e2e/assinantes-seguranca.spec.ts` | 16 passed (8 per project); GraphQL test failed before `graphQL.disable` (RED) |
| payload.config.ts `beforeDashboard`, `graphQL: { disable: true }`; importMap has Vencimentos | yes |
| `pnpm test` | vitest 27 files / 148 tests; playwright 132 passed, 32 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| `pnpm build` with no .env, no DATABASE_URI and Postgres stopped | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, test] Subscriber REST checks through Playwright `context.request` were anonymous**
- **Issue:** the plan's Playwright `context.request` sends the cookie without Origin or Sec-Fetch-Site. Because `csrf` is configured (T-03-12), Payload ignores such a cookie, so GET /api/assinantes returned 403 instead of the subscriber's own record.
- **Fix:** the subscriber checks run as `fetch` from the logged-in page (same origin, as a browser does). The non-browser case is kept as an extra assertion: that request gets no data.
- **Commit:** 1d54a55

The matrix found no leaks, so no access rule changed.

## Self-Check: PASSED
