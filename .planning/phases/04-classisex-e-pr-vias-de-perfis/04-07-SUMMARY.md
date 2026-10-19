---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 07
subsystem: classisex-public
tags: [public-preview, redaction, blur, cache, nav, sitemap]

requires:
  - phase: 04-06
    provides: media DTO helpers, mediaByAd
  - phase: 04-05
    provides: blurred twin (`previa`) per photo, privateMediaDir
  - phase: 04-01
    provides: redactContacts
provides:
  - PublicAdDTO / toPublicAdDTO / previewUrl in src/lib/classisex/dto.ts
  - findPublicAds (board.ts, select id/kind/order/previa only)
  - src/lib/classisex/public.ts getPublicAds / getPublicAdFilters (cached, tag 'ads')
  - GET /classisex/previa/[id] (blurred twin of a visible ad's photo; else 404 no-store)
  - /classisex page + PublicAdCard; ClassiSex in menu, footer and sitemap
  - expire(['ads']) on subscription create/update/delete and on assinantes.accessUntil changes
affects: [04-08 (report link on the full ad only; public page has none), 04-09 (leak matrix for /classisex and /classisex/previa), 04-10 (client decision: keep /classisex in the sitemap?)]

tech-stack:
  added: []
  patterns:
    - "Public read model separate from the members one: different DTO built from redacted text; the page never imports the members reads"

key-files:
  created:
    - src/lib/classisex/public.ts
    - src/app/(frontend)/classisex/page.tsx
    - src/app/(frontend)/classisex/previa/[id]/route.ts
    - src/components/classisex/PublicAdCard.tsx
    - tests/unit/public-ad-dto.test.ts
    - tests/e2e/classisex-publico.spec.ts
  modified:
    - src/lib/classisex/dto.ts
    - src/lib/classisex/board.ts
    - src/collections/Subscriptions.ts
    - src/collections/Assinantes.ts
    - src/lib/site/nav.ts
    - src/components/Footer.tsx
    - src/lib/seo/sitemap.ts
    - tests/int/ad-visibility.int.test.ts
    - tests/unit/sitemap.test.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/modelos.spec.ts

key-decisions:
  - "Public filters reuse parseBoardFilters and AdFilters (its existing `action` prop is the base path), so no component change was needed"
  - "Blurred previews are `Cache-Control: public, max-age=600` (fine behind Cloudflare): they are already public by design; a hidden ad's preview may stay in a CDN cache up to 10 minutes, the route itself answers 404 at once"
  - "Cidade is also redacted (a phone typed in the city field would otherwise leak)"
  - "/classisex is in the sitemap as planned; whether the client wants it indexed stays an open question for 04-10"

requirements-completed: [PREV-01]

duration: 35min
completed: 2026-10-19
---

# Phase 4 Plan 07: Public ClassiSex preview Summary

**Visitors with no login open /classisex (menu "ClassiSex") and see the published ads of active subscribers with every phone, e-mail, link and @ replaced by "[contato só para assinantes]", only server-blurred photos, the same Eu sou/cidade filters and pagination, and "Assine para ver o contato" on each card; any moderation, media, owner or subscription change refreshes the page on the next request.**

## Performance
- **Duration:** ~35 min
- **Tasks:** 2 (TDD, 4 commits)

## Task Commits
1. Task 1 RED `34285a0` test(04-07): failing public preview DTO, read model and cache-expiry tests
2. Task 1 GREEN `1df9b0e` feat(04-07): public preview read model, blurred photo route and cache expiry
3. Task 2 RED `d6d2541` test(04-07): failing public ClassiSex page, nav and sitemap tests
4. Task 2 GREEN `a9aca4b` feat(04-07): public /classisex preview with blurred photos and Assine para ver o contato

## Verification
- `vitest run tests/unit/public-ad-dto.test.ts tests/int/ad-visibility.int.test.ts tests/int/subscriptions.int.test.ts` → passed (18)
- `playwright test tests/e2e/classisex-publico.spec.ts tests/e2e/shell.spec.ts tests/e2e/modelos.spec.ts` → passed (both projects)
- `pnpm test` → Vitest 306 passed (40 files), Playwright 188 passed; typecheck, lint clean
- Gates: previa route has 0 `filename`; `expire(['ads'])` in Subscriptions.ts; public page never references the members read model; 0 `next/image` under src/components/classisex

## Deviations from Plan
1. **Test data:** the plan's example phone "61 99988-9772" is the house's own WhatsApp (5561999889772), which the footer shows on every page, so the e2e leak check used another number (61 98877-6655). The unit test keeps the plan's text (DTO only).
2. The unit JSON check looks for the `"contato"` key rather than the word "contato", because the redaction label itself reads "[contato só para assinantes]".
3. The leak list checks "-6655" instead of a bare 4-digit string, which could match a build hash in the HTML.
4. **[Rule 2]** `cidade` is redacted too (D-04: no contact in the open area, whatever the field).
5. The public read lives in `findPublicAds` (board.ts, pinned clock for tests) with `public.ts` as the cached wrapper, mirroring 04-04.

## Self-Check: PASSED
