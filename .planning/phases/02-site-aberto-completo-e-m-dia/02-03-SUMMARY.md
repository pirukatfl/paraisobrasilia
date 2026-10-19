---
phase: 02-site-aberto-completo-e-m-dia
plan: 03
subsystem: media
tags: [payload-upload, video, mp4, byte-range, lightbox, dialog, gallery, image-authorization]

# Dependency graph
requires:
  - phase: 02-02
    provides: nav/footer/sitemap registries, .btn-secondary
provides:
  - Collection `videos` (Vídeos, group Arquivos): mp4 only, staticDir MEDIA_DIR/videos, required poster (media)
  - Collection `space-items` (Galeria do espaço, group Site): photo|video, caption ≤ 80, order, drafts, imageAuthorization
  - src/fields/imageAuthorization.ts (non-blocking group, staff-only read)
  - Media: `gallery` size (1600 px WebP), 15 MB image cap hook (pt message), afterChange/afterDelete expire 'space' + 'models'
  - payload.config upload limit 104_857_600 (100 MB)
  - Migration 20261019_031103_space_gallery
  - src/lib/gallery/{types,queries,revalidate,use-hydrated}.ts — getSpaceItems() / getSpacePhotos(limit) (tag 'space'), toGalleryImage()
  - src/components/{Gallery,Lightbox,EmptyState}.tsx; /espaco page
  - tests/e2e/helpers/api.ts (staff REST seeding: photos, videos, models, deleteAll) and helpers/weight.ts (transfer budget)
  - tests/fixtures/espaco.mp4 (3285 bytes, ffmpeg)
affects: [02-04 (models reuse Lightbox, imageAuthorization, toGalleryImage), 02-05 (home teaser, perf), 02-06 (runbook: videos on disk)]

tech-stack:
  added: []
  patterns:
    - "e2e data changes go through the staff REST API so Payload hooks expire the server's cache tags"
    - "Global e2e setup clears .next/dev/cache/{fetch-cache,images} after the DB reset"
    - "Tiles are links before hydration (no-JS) and buttons after (useSyncExternalStore, no effect)"

key-files:
  created:
    - src/collections/Videos.ts
    - src/collections/SpaceItems.ts
    - src/fields/imageAuthorization.ts
    - src/lib/gallery/types.ts
    - src/lib/gallery/queries.ts
    - src/lib/gallery/revalidate.ts
    - src/lib/gallery/use-hydrated.ts
    - src/components/EmptyState.tsx
    - src/components/Gallery.tsx
    - src/components/Lightbox.tsx
    - src/app/(frontend)/espaco/page.tsx
    - src/migrations/20261019_031103_space_gallery.ts
    - src/migrations/20261019_031103_space_gallery.json
    - tests/int/space-gallery.int.test.ts
    - tests/e2e/espaco.spec.ts
    - tests/e2e/helpers/api.ts
    - tests/e2e/helpers/weight.ts
    - tests/fixtures/espaco.mp4
  modified:
    - src/collections/Media.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/lib/site/nav.ts
    - src/components/Footer.tsx
    - src/app/sitemap.ts
    - tests/helpers/seed.ts
    - tests/e2e/global-setup.ts

key-decisions:
  - "Payload 3.91's file route serves Range requests (206, Content-Range, Accept-Ranges) — verified by e2e; the fallback /video/[file] route was NOT created"
  - "Lightbox shows the `gallery` derivative via next/image (sizes 100vw); tiles use `card` (640 px)"
  - "Media changes also expire 'space' and 'models' so deleted/edited files leave the galleries at once (removal requests)"
  - "Budget measured on the dev server without JavaScript (dev JS is unminified); production JS checked in 02-05"

patterns-established:
  - "Gallery DTOs never expose raw Payload docs; imageAuthorization never leaves the admin"

requirements-completed: [MIDIA-01, PAINEL-02]  # PAINEL-02 also covers models (02-04); MIDIA-03 finished in 02-05

# Metrics
duration: 12min
completed: 2026-10-19
---

# Phase 2 Plan 03: Space gallery Summary

**Staff publish venue photos and MP4 videos (with cover) in "Galeria do espaço", with a recommended but non-blocking image authorization; visitors get /espaco — a light 2/3/4-column grid with a native-dialog lightbox, videos that only load when opened and seek through 206 byte ranges — or an elegant empty state.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-19T03:09:40Z
- **Completed:** 2026-10-19T03:21:48Z
- **Tasks:** 2
- **Files modified:** 27

## Accomplishments

- `videos` (mp4 allowlist, MEDIA_DIR/videos) and `space-items` (published-only for anonymous, drafts, order then newest) collections; authorization group readable by staff only — anonymous REST/Local API responses do not contain it (int test)
- Images > 15 MB rejected with "A imagem passa de 15 MB. Reduza o tamanho e envie de novo." while the global upload limit is 100 MB for videos; a text file renamed .mp4 is rejected ("File type text/plain … is not allowed")
- /espaco: eyebrow "Nosso espaço", H1 "Conheça o Paraíso", tiles with alt-text names, video tile with "Vídeo" chip and play icon ("Assistir vídeo: …"), first two images eager, rest lazy; empty state "Fotos do espaço em breve" with Como chegar / Ver próximas festas
- Lightbox: `dialog[aria-label="Galeria de fotos"]`, "n de total" counter (visible + aria-live), Anterior/Próxima/Fechar, ←/→, swipe ≥ 48 px, `<video controls playsinline preload="metadata" poster>` rendered only for the active slide (no mp4 request before it), focus back to the opening tile
- Espaço in header menu, mobile menu, footer and sitemap

## Task Commits

1. **Task 1: Space gallery slice end to end** - `0e3d0b0` (feat) — also contains the Lightbox, written together with the grid
2. **Task 2: Lightbox, byte ranges, mobile budget** - `421e82f` (test)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/int/space-gallery.int.test.ts` | 6 passed (migration space_gallery ran on the test DB) |
| `playwright test tests/e2e/espaco.spec.ts` | 5 passed (empty state, tiles, menu, lightbox 1→2→3→4 de 4, Escape + focus, `Range: bytes=0-99` → 206 `bytes 0-99/3285` + `Accept-Ranges: bytes`, budget) |
| Budget, Pixel 7, 12 photos | 480 KB without JS (document 11 KB, images 105 KB, CSS/fonts 218 KB, other 146 KB) ≤ 600 KB |
| Videos.ts has `'video/mp4'`; payload.config has `104_857_600` and `videos` | PASS |
| imageAuthorization.ts has `access`, no `required: true` | PASS |
| migration `space_gallery` registered | PASS |
| tests/fixtures/espaco.mp4 ≤ 307200 bytes | 3285 bytes — PASS |
| Lightbox.tsx has `'use client'`, `showModal`, `aria-live` | PASS |
| Fallback route absent and Payload serves 206 | PASS |
| `pnpm test` | vitest 13 files / 53 tests; playwright 52 passed, 18 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] e2e seeding could not expire the dev server's cache**
- **Found during:** Task 1 e2e
- **Issue:** seeding with the Local API from the Playwright process runs hooks outside Next, so `revalidateTag` is a no-op; the dev server also persists its data cache in `.next/dev/cache/fetch-cache` across runs, so a previous run's gallery was served after the global reset.
- **Fix:** gallery e2e data is created/deleted through the staff REST API (hooks run inside the server); global setup deletes `.next/dev/cache/fetch-cache` and `.next/dev/cache/images` after the DB reset.
- **Files modified:** tests/e2e/helpers/api.ts, tests/e2e/global-setup.ts — **Committed in:** 0e3d0b0

**2. [Rule 1 - Bug] Focus returned to the last slide's tile** — the opener index is kept separately from the current slide. (0e3d0b0)

**3. [Rule 3] Weight budget measured without JavaScript** — the local e2e server is `next dev` (unminified JS with dev tooling); `measureWeight()` reports scripts separately. Production JS weight is checked in 02-05.

**4. Fixture generated with ffmpeg** (available in the environment): `ffmpeg -f lavfi -i color=c=0x17120F:s=640x360:d=2 -c:v libx264 -pix_fmt yuv420p -movflags +faststart`.

**5. No-JS fallback tiles** use `useSyncExternalStore` to switch link → button after hydration (lint forbids setState in effects).

---

**Total deviations:** 5 (2 blocking, 1 bug, 2 notes). **Impact:** none on the plan's contracts.

## Issues Encountered

- `next dev` logs "internal image response failed … 500" when a test deletes media whose optimized copies were already requested — expected for deleted files.

## User Setup Required

None. Staff upload videos as MP4 (H.264, 720p, ≤ 100 MB); runbook update in 02-06.

## Next Phase Readiness

- Ready for 02-04 (models reuse Lightbox, imageAuthorization, toGalleryImage, api.createModel).

## Self-Check: PASSED

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Completed: 2026-10-19*
