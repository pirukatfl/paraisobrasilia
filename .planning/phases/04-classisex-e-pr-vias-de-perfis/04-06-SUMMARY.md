---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 06
subsystem: classisex-media
tags: [upload, route-handler, gallery, video, members-area]

requires:
  - phase: 04-05
    provides: ad-media collection (hooks, limits, scrub), protected media route
  - phase: 04-04
    provides: members board, MemberAdDTO
provides:
  - POST /area-do-assinante/meus-anuncios/[id]/midia (multipart, 303 back with ?midia=…&codigo=…)
  - service attachMedia / removeMedia / setCover / mediaByAd / getOwnAdMedia
  - actions removerMidia / definirCapa
  - src/lib/classisex/media-messages.ts (limits, MIME lists, hook messages, upload codes → Portuguese texts)
  - dto mediaUrl, durationLabel, OwnerMediaDTO, MemberPhotoDTO {miniatura, foto, …}, MemberVideoDTO {src, durationLabel}
  - components OwnerMediaManager, MediaGallery; Lightbox `plainImages` + `label` props
affects: [04-07 (public preview: cover photo blurred), 04-09 (leak matrix covers the upload route and gallery HTML)]

tech-stack:
  added: []
  patterns:
    - "Uploads outside server actions: plain multipart form → route handler with cheap checks first (session, access, ownership, Content-Length) and the body last"
    - "Redirect target carries only a code; the page maps it to a fixed text"

key-files:
  created:
    - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/[id]/midia/route.ts
    - src/lib/classisex/media-messages.ts
    - src/components/classisex/OwnerMediaManager.tsx
    - src/components/classisex/MediaGallery.tsx
    - tests/e2e/anuncio-midia.spec.ts
  modified:
    - src/lib/classisex/service.ts
    - src/lib/classisex/actions.ts
    - src/lib/classisex/dto.ts
    - src/lib/classisex/queries.ts
    - src/lib/classisex/board.ts
    - src/collections/AdMedia.ts
    - src/components/Lightbox.tsx
    - src/components/classisex/OwnerAdCard.tsx
    - src/components/classisex/MemberAdCard.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/[id]/editar/page.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx
    - tests/int/ad-media.int.test.ts
    - tests/unit/ad-dto.test.ts
    - tests/e2e/helpers/api.ts

key-decisions:
  - "Adding media to a refused/unpublished ad counts as resubmitting: refused with 'limite-anuncios' when the owner already has 3 active ads; removing media never fails on the limit (the ad just stays off the board)"
  - "Upload and video forms stay visible at the limit; the server answers with the limit message"
  - "Read errors split into foto-ilegivel / video-ilegivel codes so the page shows the right text without putting messages in the URL"
  - "303 Location is a relative path (works behind Caddy without trusting request.url's host)"

requirements-completed: [CLAS-03, CLAS-01, CLAS-02]

duration: 45min
completed: 2026-10-19
---

# Phase 4 Plan 06: Photos and video of ads Summary

**On "Editar anúncio" owners add up to 5 photos and 1 video (plain forms, no JavaScript needed), choose the cover and remove items, with clear Portuguese errors; every change sends the ad back to moderation. Members see the cover on each card and the full gallery (lightbox) plus a video player on the full ad, always through /area-do-assinante/midia/…**

## Performance
- **Duration:** ~45 min
- **Tasks:** 2 (TDD, 4 commits)

## Task Commits
1. Task 1 RED `03e5be0` test(04-06): failing owner media service and upload e2e tests
2. Task 1 GREEN `b733b43` feat(04-06): owners upload, order and remove photos and the video of their ads
3. Task 2 RED `ce2a53b` test(04-06): failing member gallery DTO and e2e tests
4. Task 2 GREEN `001e4cf` feat(04-06): photos and video in the members board and the full ad

## Verification
- `vitest run tests/int/ad-media.int.test.ts` → 11 passed; `tests/unit/ad-dto.test.ts` → 6 passed
- `playwright test tests/e2e/anuncio-midia.spec.ts tests/e2e/classisex-assinante.spec.ts` → 20 passed (both projects)
- `pnpm test` → Vitest 300 passed (39 files), Playwright 178 passed; typecheck, lint clean
- Gates: route.ts has `content-length` and `attachMedia`; no `bodySizeLimit` in next.config.ts; OwnerMediaManager has no 'use client'; `next/image` appears 0 times under src/components/classisex and the members route group

## Deviations from Plan
1. **[Rule 2] Active-ads limit on media changes.** Adding a photo to a refused ad resubmits it, so it follows the same 3-active-ads rule as an edit (new code `limite-anuncios`); removals never fail on it.
2. Upload constants and messages moved from AdMedia.ts to a pure `media-messages.ts` (AdMedia re-exports them) so the page and route can import them without loading the collection.
3. The shared `Lightbox` gained `plainImages` and `label` props instead of a second lightbox: ClassiSex photos render as `<img>`, other galleries are unchanged.
4. `MemberPhotoDTO` also carries `thumbWidth/thumbHeight` (sizes for the `<img>` tags, no layout shift).
5. Redirects use a relative `Location` instead of `Response.redirect(new URL(..., NEXT_PUBLIC_SERVER_URL ?? request.url))`.
6. e2e alert assertions are scoped to `main` (Next's route announcer also has role=alert).

## Self-Check: PASSED
