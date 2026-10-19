---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 05
subsystem: classisex-media
tags: [private-media, upload, exif, mp4, blur, range, deploy]

requires:
  - phase: 04-01
    provides: readMp4Info / scrubMp4Metadata
  - phase: 04-04
    provides: isAdVisible
provides:
  - src/lib/classisex/storage.ts (privateMediaDir, assertOutsidePublicMedia, privateStorageConfigured)
  - ad-media upload collection (staff-only REST/file URLs; validation, EXIF/MP4 scrub, 5 photos + 1 video, blurred twin)
  - src/lib/classisex/blur.ts makeBlurredPreview
  - src/lib/classisex/range.ts parseRange; src/lib/classisex/media-access.ts canViewMedia, MEDIA_VARIANTS
  - GET /area-do-assinante/midia/[id]/[foto|miniatura|video] protected route with byte ranges
  - private_media Docker volume at /app/private-media (Dockerfile, both compose files, bootstrap heredoc), Caddy body limit 110MB
  - test helpers seedAdMedia, uploadAdMedia
affects: [04-06 (owner upload UI + member gallery), 04-07 (public preview uses the blurred twin), 04-09 (leak matrix), deploy]

tech-stack:
  added: []
  patterns:
    - "Upload validation in collection beforeOperation, rewriting req.file.data (scrubbed MP4) before Payload stores it"
    - "Protected file route: one access decision (canViewMedia) then fs stream; errors are private, no-store; successes private, max-age=600, Vary Cookie"

key-files:
  created:
    - src/lib/classisex/storage.ts
    - src/lib/classisex/blur.ts
    - src/lib/classisex/range.ts
    - src/lib/classisex/media-access.ts
    - src/collections/AdMedia.ts
    - src/migrations/20261019_194154_ad_media.ts
    - src/app/(frontend)/(membros)/area-do-assinante/midia/[id]/[variante]/route.ts
    - tests/e2e/midia-protegida.spec.ts
  modified:
    - src/collections/Ads.ts
    - src/payload.config.ts
    - Dockerfile
    - docker-compose.staging.yml, docker-compose.staging.ghcr.yml, scripts/deploy/bootstrap-vps.sh heredoc, Caddyfile
    - .env.example files, .gitignore, .dockerignore
    - tests/helpers/seed.ts, tests/e2e/helpers/api.ts, e2e global setup

key-decisions:
  - "A2 CONFIRMED: replacing req.file.data in beforeOperation changes the stored bytes (scrubbed MP4 is what lands on disk)"
  - "A3 CONFIRMED: one upload collection holds both WebP photos and MP4 videos (imageSizes only apply to images)"
  - "A5 CONFIRMED: afterChange can write the blurred twin <name>-previa.webp next to the original; afterDelete removes it"
  - "Anonymous request for an unknown id answers 403 (same as a known id) so anonymous probing cannot enumerate ids; logged-in callers get 404"
  - "Without PRIVATE_MEDIA_DIR in production, uploads answer 503 instead of writing inside the container"

requirements-completed: [CLAS-06]

duration: 70min
completed: 2026-10-19
---

# Phase 4 Plan 05: Private ad media Summary

**Ad photos and videos live in their own private volume, are cleaned on upload (photos re-encoded to WebP without EXIF, MP4 location/metadata boxes removed, 60 s / 15 MB / 100 MB / 5+1 limits in Portuguese), each photo gets a server-side blurred twin, and files open only through /area-do-assinante/midia/{id}/{variante} for staff, the owner or an active subscriber of a visible ad, with byte ranges for video.**

## Performance
- **Duration:** ~70 min
- **Tasks:** 3 (TDD, 6 commits)

## Task Commits
1. Task 1 RED `d9e4378` test(04-05): failing private storage and deploy-file tests
2. Task 1 GREEN `cf6f6fc` feat(04-05): private media storage outside MEDIA_DIR with its own volume
3. Task 2 RED `b8a78c5` test(04-05): failing ad-media and blur tests
4. Task 2 GREEN `db86414` feat(04-05): private ad-media collection with validation, scrub and blurred twin
5. Task 3 RED `6b00e10` test(04-05): failing range, access-decision and protected media e2e tests
6. Task 3 GREEN `6825f42` feat(04-05): protected media route with one auth check, byte ranges and private headers

## Verification
- Unit: range + media-access, 27 passed. Int: ad-media + blur passed.
- `playwright test tests/e2e/midia-protegida.spec.ts` → 10 passed (both projects)
- `pnpm test` → Vitest 293 passed (39 files); Playwright 172 passed on two consecutive full reruns (the first full run had 1 failure that did not reproduce, see Deviations); typecheck, lint clean
- Env-less `pnpm build` passed after Task 1

## Deviations from Plan
1. Migration applied to `paraiso_test` only (dev DB is schema-pushed; see 04-02).
2. e2e in-page fetches use `cache: 'no-store'`: the full 200 is cacheable for the viewer (`private, max-age=600`), and Chromium answered the out-of-range request from its cache (200 instead of 416). The test now reaches the server; the route itself was correct.
3. Anonymous + unknown id → 403 (plan left it open between 403/404); chosen so anonymous probing learns nothing.
4. The first full Playwright run had 1 failure that did not reproduce on the next full run (172 passed). It is tracked as possibly flaky and is checked again at the final gate.

## Client notes
- **The VPS bootstrap must be re-run** (scripts/deploy/bootstrap-vps.sh) so the server compose file gains `PRIVATE_MEDIA_DIR=/app/private-media` and the `private_media` volume, and Caddy accepts 110 MB uploads. Until then ad uploads answer 503.
- Backups must include the `private_media` volume as well as `media`.

## Self-Check: PASSED
