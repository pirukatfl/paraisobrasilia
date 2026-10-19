---
phase: 02-site-aberto-completo-e-m-dia
plan: 04
subsystem: media
tags: [payload-collection, models, array-maxrows, lightbox, conditional-navigation]

# Dependency graph
requires:
  - phase: 02-03
    provides: imageAuthorization, Lightbox, toGalleryImage, staff REST e2e helper
provides:
  - Collection `models` (Modelos, group Site): name, photos array 1–3 (pt error), order, drafts, imageAuthorization; no slug
  - Migration 20261019_032314_models
  - getPublishedModels() / hasPublishedModels() / toModelDTO() in src/lib/gallery/queries.ts (tag 'models')
  - src/components/ModelGrid.tsx; /modelos page (404 when none published)
  - Async Header; getNavItems({ hasModels }) inserts Modelos between Espaço and Contato; Footer and sitemap conditional
affects: [02-05 (sitemap refactor), 02-06 (staff guide)]

tech-stack:
  added: []
  patterns:
    - "Custom array validate replaces Payload's generic min/max message with the pt staff message"
    - "Section visibility (nav, footer, sitemap, route) driven by one cached query and one tag"

key-files:
  created:
    - src/collections/Models.ts
    - src/migrations/20261019_032314_models.ts
    - src/migrations/20261019_032314_models.json
    - src/components/ModelGrid.tsx
    - src/app/(frontend)/modelos/page.tsx
    - tests/int/models.int.test.ts
    - tests/e2e/modelos.spec.ts
  modified:
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/lib/gallery/queries.ts
    - src/lib/site/nav.ts
    - src/components/Header.tsx
    - src/components/Footer.tsx
    - src/app/sitemap.ts
    - tests/helpers/seed.ts

key-decisions:
  - "Model card accessible name 'Ver fotos de {nome}'; lightbox label = artistic name"
  - "Header/Footer catch hasPublishedModels() errors (static 404 prerender has no database)"

patterns-established:
  - "Secondary sections hide everywhere (route 404, nav, footer, sitemap) when empty"

requirements-completed: [MIDIA-02, PAINEL-02]

# Metrics
duration: 9min
completed: 2026-10-19
---

# Phase 2 Plan 04: Models gallery Summary

**Staff publish house models with an artistic name and up to three photos (authorization recommended, not required); visitors browse them at /modelos in a 2/4-column grid with the shared lightbox, and the whole section — route, menu, footer and sitemap — exists only while a model is published.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-19T03:23:10Z
- **Completed:** 2026-10-19T03:31:55Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- `models` collection: a 4th photo fails with "Cada modelo pode ter no máximo 3 fotos.", zero photos fails, 3 photos without authorization publish; anonymous reads return published models only and never the authorization group
- /modelos: eyebrow "Modelos da casa", H1 "Modelos", intro, cards (4:5 cover, name, "{n} fotos" when > 1), lightbox "1 de 3" → "2 de 3"; no `/modelos/{slug}` links or routes
- Without published models: /modelos → 404 and no Modelos link in the header, mobile menu, footer or sitemap; Despublicar in the panel removes it on the next request

## Task Commits

1. **Task 1: Models slice end to end** - `25f3f7e` (feat)
2. **Task 2: Hide the section when empty; fast removal** - `2f26e4b` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/int/models.int.test.ts` | 5 passed (migration models ran on the test DB) |
| `playwright test tests/e2e/modelos.spec.ts tests/e2e/shell.spec.ts` | 17 passed (incl. nav order Festas · Quem somos · Espaço · Modelos · Contato and staff Despublicar → 404) |
| Models.ts has `maxRows: 3` and `imageAuthorization`; `name: 'slug'` count 0 | PASS |
| migration `models` registered in index.ts | PASS |
| `find src/app -path '*modelos*' -name page.tsx` | only src/app/(frontend)/modelos/page.tsx |
| Header.tsx contains `hasPublishedModels` | PASS |
| `pnpm test` | vitest 14 files / 58 tests; playwright 59 passed, 19 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ValidationError message is generic** — Payload throws "O campo a seguir está inválido: Fotos"; the pt field message is in `error.data.errors[].message` (what the admin shows next to the field). The int test asserts the field message there.

**2. `maxRows` written as the literal `3`** (with a comment naming MAX_MODEL_PHOTOS) so the plan's grep acceptance matches.

---

**Total deviations:** 2 (1 test adaptation, 1 cosmetic). **Impact:** none.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Ready for 02-05 (home without parties, metadata/sitemap refactor, budgets).

## Self-Check: PASSED

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Completed: 2026-10-19*
