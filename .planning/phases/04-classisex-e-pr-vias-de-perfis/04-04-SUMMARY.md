---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 04
subsystem: classisex
tags: [visibility, members-area, filters, pagination, contacts]

requires:
  - phase: 04-03
    provides: approved ads (publishedAt), moderation
  - phase: 03
    provides: assinantes.accessUntil maintained by subscription hooks, requireActiveSubscription
provides:
  - visibleAdsWhere(now) / isAdVisible(ad, accessUntil, now) in src/lib/classisex/visibility.ts
  - src/lib/classisex/board.ts (parseBoardFilters, boardWhere, findVisibleAdDocs, findVisibleAdDoc, findMemberAds, findMemberAd, PAGE_SIZE)
  - MemberAdDTO / toMemberAdDTO (contact links; fotos/video slots for 04-06)
  - queries listMemberAds / getMemberAd (server-only, never cached)
  - pages /area-do-assinante/classisex and /area-do-assinante/classisex/[id]; /exclusivo → permanent redirect
  - components MemberAdCard, AdFilters, Pagination, ContactLinks; seedVisibleAd helper
affects: [04-05 (canViewMedia uses isAdVisible), 04-06 (cover/gallery in cards), 04-07 (public preview reuses findVisibleAdDocs), 04-08 (report button on the full ad)]

tech-stack:
  added: []
  patterns:
    - "Board reads take (payload, filters, now) so int tests pin the clock; pages wrap them in server-only queries"

key-files:
  created:
    - src/lib/classisex/visibility.ts
    - src/lib/classisex/board.ts
    - src/components/classisex/MemberAdCard.tsx
    - src/components/classisex/AdFilters.tsx
    - src/components/classisex/Pagination.tsx
    - src/components/classisex/ContactLinks.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/classisex/page.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx
    - tests/unit/ad-dto.test.ts
    - tests/int/ad-visibility.int.test.ts
    - tests/e2e/classisex-assinante.spec.ts
  modified:
    - src/lib/classisex/dto.ts
    - src/lib/classisex/queries.ts
    - src/app/(frontend)/(membros)/area-do-assinante/exclusivo/page.tsx
    - src/app/(frontend)/(membros)/layout.tsx
    - tests/e2e/minha-assinatura.spec.ts
    - tests/helpers/seed.ts

key-decisions:
  - "A1 CONFIRMED: Payload's Postgres adapter accepts the nested where 'author.accessUntil' > now; no fallback query needed"
  - "Query string: ?eu-sou=<id>&cidade=<text>&pagina=<n>; cidade matched with `like` on cidadeBusca (accent/case-insensitive)"
  - "Filtered empty state offers 'Ver todos os anúncios' (not a second 'Limpar filtros')"

requirements-completed: [CLAS-01, CLAS-02]

duration: 30min
completed: 2026-10-19
---

# Phase 4 Plan 04: ClassiSex do assinante Summary

**Subscribers with active access browse /area-do-assinante/classisex (newest first, filter by Eu sou and cidade, 20 per page) and open full ads with WhatsApp/Telegram/e-mail buttons; an ad is visible only while it is approved and its author has access, so expiry hides it at midnight and renewal brings it back, with no job.**

## Performance
- **Duration:** ~30 min
- **Tasks:** 2 (TDD, 4 commits)

## Task Commits
1. Task 1 RED `58fb157` test(04-04): failing visibility, board and member DTO tests
2. Task 1 GREEN `ddd0f00` feat(04-04): visibility rule, members board reads and member DTO
3. Task 2 RED `61ef206` test(04-04): failing members ClassiSex e2e; minha-assinatura follows the new nav
4. Task 2 GREEN `fd3dfea` feat(04-04): members ClassiSex list with filters and full ad with contacts

## Verification
- `vitest run tests/unit/ad-dto.test.ts tests/int/ad-visibility.int.test.ts` → 7 passed (incl. midnight edge 02:59:59Z visible / 03:00:00Z hidden)
- `playwright test tests/e2e/classisex-assinante.spec.ts tests/e2e/minha-assinatura.spec.ts` → 24 passed (both projects)
- `pnpm test` → Vitest 244 passed (34 files), Playwright 162 passed; typecheck, lint clean

## Deviations from Plan
1. Core reads live in a new `src/lib/classisex/board.ts` (payload + now parameters) instead of only in `queries.ts`, so int tests can pin the clock and 04-05/04-07 reuse them outside React. `queries.ts` keeps the server-only wrappers named in the plan.
2. minha-assinatura.spec's restricted-content marker changed to the ClassiSex intro sentence; the redirect from `/exclusivo` is asserted for both an active subscriber and an anonymous visitor.

## Self-Check: PASSED
