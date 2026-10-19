---
phase: 03-assinantes-e-controle-de-acesso
plan: 01
subsystem: auth
tags: [access-control, payload-auth, assinantes, login, sessions, members-area, noindex]

# Dependency graph
requires:
  - phase: 02
    provides: collections with drafts, Contact global, imageAuthorization field, staff REST e2e helper, buildPageMetadata, nav registry
provides:
  - src/access/roles.ts (isStaff by req.user.collection, isAssinante, staffOrPublished, staffOnlyField) used by every collection/global/field
  - Auth collection `assinantes` (30-day sessions, lockout 5/10 min, staff-only creation, public forgot-password closed, min password 8, mustChangePassword on staff-set passwords)
  - Session DAL getAssinante/requireAssinante; server actions entrar/sair; safeNext
  - /entrar (no client JS), (membros) route group, /area-do-assinante
  - Test helpers seedAssinante, createAssinante (staff REST), loginAsAssinante
affects: [03-02, 03-03, 03-04, 03-05, 03-06, phase 6 (legacy hash fallback in entrar)]

tech-stack:
  added: []
  patterns:
    - "Role = collection of the principal (users = staff); never Boolean(req.user)"
    - "Subscriber login through a server action wrapping payload.login + generatePayloadCookie (payload/shared)"
    - "Members pages: force-dynamic, DAL guard in every page and action, noindex header in every environment"

key-files:
  created:
    - src/access/roles.ts
    - src/collections/Assinantes.ts
    - src/migrations/20261019_122821_assinantes.ts
    - src/lib/assinantes/redirect.ts
    - src/lib/assinantes/session.ts
    - src/lib/assinantes/actions.ts
    - src/components/assinantes/FormField.tsx
    - src/app/(frontend)/entrar/page.tsx
    - src/app/(frontend)/(membros)/layout.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/page.tsx
    - tests/int/access-roles.int.test.ts
    - tests/int/assinantes-auth.int.test.ts
    - tests/unit/safe-next.test.ts
    - tests/e2e/assinante-login.spec.ts
    - tests/e2e/helpers/assinante.ts
  modified:
    - src/collections/{Users,Parties,Pages,SpaceItems,Models,Media,Videos}.ts
    - src/globals/Contact.ts
    - src/fields/imageAuthorization.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/lib/site/nav.ts
    - src/app/robots.ts
    - next.config.ts
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/modelos.spec.ts

key-decisions:
  - "A6 confirmed: beforeOperation receives args.data.password on create/update, so length check and mustChangePassword live there (no beforeChange fallback needed)"
  - "Login maps AuthenticationError and ValidationError to the same generic message; LockedAuth to the lockout message"
  - "csrf allowlist = [NEXT_PUBLIC_SERVER_URL]; Users and Assinantes cookies SameSite=Lax, Secure when the server URL is https"
  - "Form inputs share one server component (FormField) with site tokens; no client JS on /entrar"

patterns-established:
  - "Subscriber principal tests: Local API with user: { ...doc, collection: 'assinantes' } and overrideAccess: false"
  - "e2e: page.locator('main').getByRole('alert') (Next's route announcer is also role=alert)"

requirements-completed: [ASS-01]

# Metrics
duration: 45min
completed: 2026-10-19
---

# Phase 3 Plan 01: Role-safe access and subscriber login Summary

**Every access rule now tells staff from any other logged-in principal; a staff-only `assinantes` auth collection (30-day sessions, lockout, closed first-register and forgot-password) backs a no-JS `/entrar` login, `Sair`, and a guarded, never-cached, noindex `/area-do-assinante`.**

## Performance

- **Duration:** ~45 min (includes a 4 min e2e baseline and Postgres start)
- **Tasks:** 2
- **Files modified:** 33

## Accomplishments

- T-03-01 closed: the nine `Boolean(req.user)` checks (Parties, Pages, SpaceItems, Models, Media, Videos, Users, Contact, imageAuthorization) now use `isStaff` (collection `users`); drafts-enabled collections read via `staffOrPublished`; Users gets `unlock: isStaff`. A mutation check (reverting `isStaff` to `Boolean(req.user)`) makes 6 of 7 access-roles tests fail.
- `assinantes`: name, whatsapp (55+DDD), staffNotes (staff-only field), mustChangePassword (read-only, sidebar); read self only for subscribers; create/update/delete/unlock staff; `admin: () => false`.
- Guards: `create` without staff or `context.trustedCreate` → Forbidden (first-register path tested with overrideAccess true and no user); `forgotPassword` without `context.staffPasswordLink` → Forbidden; password < 8 → 'A senha precisa ter pelo menos 8 caracteres.'.
- `/entrar` → `/area-do-assinante` ("Olá, {nome}"), cookie `payload-token` httpOnly ≥ 29 days, persists in a new context from storageState; `Sair` revokes; staff sessions are redirected to `/entrar`; `Cache-Control` no-store and `X-Robots-Tag: noindex` asserted.

## Task Commits

1. **Task 1: Role-safe access + assinantes auth collection** - `0537ffd` (feat)
2. **Task 2: /entrar, Sair and the guarded members area** - `72f39d9` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run` access-roles, assinantes-auth, parties-access, models | 4 files, 22 tests passed |
| `grep -rn "Boolean(req.user)" src/collections src/globals src/fields \| wc -l` | 0 |
| Assinantes.ts contains trustedCreate, staffPasswordLink, 2_592_000 | yes |
| migration `20261019_122821_assinantes` in src/migrations/index.ts | yes |
| `vitest run tests/unit/safe-next.test.ts` | 13 passed |
| `playwright test assinante-login.spec.ts shell.spec.ts` | 24 passed, 2 skipped (both projects) |
| `grep -rn "cached(" src/lib/assinantes \| wc -l` | 0 |
| `'use client'` in entrar/page.tsx | 0 |
| `pnpm test` | vitest 18 files / 92 tests; playwright 84 passed, 26 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Phase 2 modelos spec asserted the exact nav list**
- **Found during:** Task 2 (nav gains 'Área do assinante')
- **Fix:** expected list extended with 'Área do assinante'
- **Files modified:** tests/e2e/modelos.spec.ts — **Commit:** 72f39d9

**2. [Rule 3 - Blocking] Local Postgres was not running**
- **Found during:** baseline run
- **Fix:** started the existing cluster (`pg_ctl -D /home/claude/pgdata start` as postgres); no data change.

**3. [Rule 1 - Bug] Type of `args.data` in beforeOperation is a union over all operations**
- **Fix:** read through a narrowed `{ data?: Record<string, unknown> }` view; behaviour unchanged.

Migration applied on `paraiso_test` (getTestPayload runs all committed migrations); the dev DB `paraiso` stays on push mode as in Phase 2.

## TDD Gate Compliance

Tests were written together with the implementation in each task (no separate RED commit); the access-roles regression was verified red by mutation (6/7 failing with the old rule).

## Next Phase Readiness

- 03-02 inserts 'Assine Já' in the nav before 'Área do assinante'; the /entrar page already links to /assine-ja.

## Self-Check: PASSED
