---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 09
subsystem: classisex-security
tags: [leak-matrix, e2e, access-control, headers, media]

requires:
  - phase: 04-08
    provides: ad-reports collection and resolve endpoint
  - phase: 04-07
    provides: public preview and blurred route
provides:
  - tests/e2e/helpers/classisex.ts (buildClassisexScenario, fetchAs)
  - tests/e2e/classisex-seguranca.spec.ts (17 tests, 5 principals x all ClassiSex surfaces)
  - ad-media hook no longer decodes uploads from non-staff REST callers before the access check
affects: [04-10]

key-files:
  created:
    - tests/e2e/helpers/classisex.ts
    - tests/e2e/classisex-seguranca.spec.ts
  modified:
    - src/collections/AdMedia.ts
    - tests/e2e/helpers/api.ts

key-decisions:
  - "Scenario: owner with an ad in every status, active viewer with a pending ad of their own, expired subscriber with an approved (therefore hidden) ad, 2 photos+1 video on visible/pending ads, one report"
  - "The bare stored file name is not tried against /api/media/file/: the fixture name also exists in the public media folder (not a leak)"

requirements-completed: [CLAS-06, PREV-01, CLAS-01, CLAS-02, CLAS-05, PAINEL-07]

duration: ~50min
completed: 2026-10-19
---

# Phase 4 Plan 09: ClassiSex leak matrix Summary

**One end-to-end matrix pins that anonymous visitors, expired subscribers and non-owner viewers never get original photos/videos or contacts through the protected route, Payload's file routes, traversal paths, the image optimizer, REST, page bodies or the RSC payload, that reports are staff-only, and that private responses carry private/no-store/noindex headers while only the blurred preview is public.**

## Task Commits
1. `2fb5880` test(04-09): leak matrix (both tasks: one spec file, committed together)
2. `2b5addb` fix(04-09): ad-media hook skips decoding for non-staff REST callers

## Coverage (17 tests, desktop; the matrix is request-level and also ran on mobile in the full run)
- Anonymous: protected route for photo/pending photo/video x 3 variants (403/404, no image/video bytes); `/api/ad-media/file/*` for original, card, blurred twin and video; `/api/media/file/` and `/api/videos/file/` with `../private-media/…`, `..%2F…`, `private-media/…`, `%2e%2e%2f…`; `/_next/image` with private and API URLs; `/classisex/previa/{video|pending|expired-author}` 404 and visible photo 200; GET `/api/ads|ad-media|ad-reports` no data and no scenario contact; POST ads/ad-media/ad-reports 403; moderation and `/api/ad-reports/:id/resolver` 403; `/api/ad-categories` 200 names only
- Expired subscriber: every media 403/404, REST no data, report writes 403, upload redirected with `inativo` and nothing stored, page bodies free of other people's contacts/texts/private URLs
- Active non-owner: pending photo 404, visible photo 200 image, expired-author photo 404, Payload file route 403, optimizer not 200 image, PATCH ad 403 and unchanged, moderation 403, resolver 403 (report stays open), upload to someone else's ad 404 and nothing stored, hidden ads and other people's editors 404; same cookie without browser headers gets nothing
- Owner: own pending photo 200, another owner's pending photo 404. Staff control: protected route and Payload file route 200
- Pages/headers: `/classisex` raw body and RSC payload (with filters and page 2) hold no contact, author, hidden text or `/area-do-assinante/midia/`; anonymous members pages redirect to `/entrar?next=`; protected media `private`, no `public`, `Vary: Cookie`, `noindex`, `nosniff`; members pages `no-store` + `noindex`; blurred route `public`; robots (staging: `Disallow: /`; production: `Disallow: /area-do-assinante`); sitemap has `/classisex`, no `/area-do-assinante`; ending a subscription removes its ad from `/classisex` on the next request and the blurred route answers 404

## Verification
- `playwright test tests/e2e/classisex-seguranca.spec.ts` -> 17 passed (desktop run)
- `pnpm test` -> Vitest 318 passed (41 files); Playwright 228 passed, 44 skipped (desktop-only admin flows on mobile and the staging smoke, as before)
- `pnpm typecheck`, `pnpm lint` clean; `pnpm build` with `.env` moved aside and Postgres stopped: exit 0 (`.env` restored)

## Deviations from Plan
1. **[Rule 2 - Hardening] Pre-auth decoding of uploads (src/collections/AdMedia.ts):** an anonymous multipart POST to `/api/ad-media` was answered 400 "Não conseguimos ler esta foto" instead of 403, because the `beforeOperation` hook ran sharp / MP4 parsing before Payload's access check. No data leaked and nothing was stored, but anonymous bytes were being decoded. The hook now returns early for non-staff calls that do not set `overrideAccess: true` (REST), so the access rule answers 403 first; Local API calls validate as before. Regression line: the anonymous upload assertion in the matrix.
2. Test expectation fixed: the traversal case with the bare file name was dropped (the fixture name exists in the public media folder, so a 200 there is not a leak).
3. `fetchAs` also accepts a JSON body or a file (needed for the upload and PATCH checks); `api.ts` gained `createReport`.
4. Tasks 1 and 2 share one spec file and were committed together.

## Known Stubs
None.

## Self-Check: PASSED
