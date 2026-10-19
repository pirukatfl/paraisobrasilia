---
phase: 02-site-aberto-completo-e-m-dia
plan: 05
subsystem: site
tags: [home, empty-state, seo, sitemap, metadata, performance-budget, fonts, favicon]

# Dependency graph
requires:
  - phase: 02-01
    provides: getContact, whatsappUrl
  - phase: 02-02
    provides: getPageByKey/getPageIntro, pathForKey
  - phase: 02-03
    provides: getSpacePhotos, measureWeight, staff REST e2e helper
  - phase: 02-04
    provides: hasPublishedModels
provides:
  - Home that works without parties (D-10): H1 "Paraíso Brasília", compact empty party section, Conheça o espaço, Quem somos and Como chegar sections (each independent, fail-soft)
  - src/components/home/{SpaceTeaser,AboutTeaser,DirectionsTeaser}.tsx
  - buildPageMetadata() in src/lib/seo/metadata.ts, used by all 7 open-area routes
  - buildSitemap() in src/lib/seo/sitemap.ts (pure, unit-tested); src/app/sitemap.ts gathers data only
  - tests/e2e/perf-galeria.spec.ts budgets (mobile)
  - Smaller shell: favicon 150 KB → 15 KB, fonts preload latin only, age-gate logo lazy
affects: [02-06 (deploy), phase 7 (Lighthouse/LCP work)]

tech-stack:
  added: []
  patterns:
    - "Optional home sections: optional(() => query()) → null hides only that section"
    - "Weight budgets measured with Resource Timing before interaction; JS reported apart in dev"

key-files:
  created:
    - src/components/home/SpaceTeaser.tsx
    - src/components/home/AboutTeaser.tsx
    - src/components/home/DirectionsTeaser.tsx
    - src/lib/seo/sitemap.ts
    - tests/e2e/home-sem-festas.spec.ts
    - tests/e2e/perf-galeria.spec.ts
    - tests/unit/sitemap.test.ts
  modified:
    - src/app/(frontend)/page.tsx
    - src/app/(frontend)/layout.tsx
    - src/app/icon.png
    - src/lib/age-gate/self-declaration.tsx
    - src/lib/seo/metadata.ts
    - src/app/sitemap.ts
    - src/app/(frontend)/contato/page.tsx
    - src/app/(frontend)/espaco/page.tsx
    - src/app/(frontend)/modelos/page.tsx
    - src/app/(frontend)/quem-somos/page.tsx
    - src/app/(frontend)/quem-somos/[secao]/page.tsx
    - src/app/(frontend)/termos-de-uso/page.tsx
    - src/app/(frontend)/politica-de-privacidade/page.tsx
    - tests/e2e/home.spec.ts
    - tests/e2e/seo.spec.ts
    - tests/e2e/helpers/api.ts
    - tests/unit/metadata.test.ts

key-decisions:
  - "Without parties the empty copy sits under an H2 'Próximas festas' (H1 becomes 'Paraíso Brasília'); party errors still use the Phase 1 error screen"
  - "Quem somos teaser falls back to the 02-CONTENT §9 sentence if the page is missing"
  - "Fonts: next/font subsets ['latin'] (Portuguese fully covered); latin-ext faces still load on demand"
  - "Favicon re-encoded to 256×256 palette PNG (15 KB); apple-icon unchanged"

patterns-established:
  - "Every open page uses buildPageMetadata (canonical + og-default share image)"

requirements-completed: [MIDIA-03]

# Metrics
duration: 12min
completed: 2026-10-19
---

# Phase 2 Plan 05: Home without parties, SEO and budgets Summary

**The home now presents the house with or without upcoming parties (space photos, Quem somos and Como chegar sections), every open page has proper titles/descriptions/canonical/share tags and a sitemap built only from public data, and mobile weight budgets hold — after cutting a 150 KB favicon and 100 KB of preloaded fonts found by the new budget tests.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-19T03:33:17Z
- **Completed:** 2026-10-19T03:45:18Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments

- Home: with parties → "Próximas festas" H1 + grid (first flyer still `priority`), then the house sections; without → eyebrow + H1 "Paraíso Brasília", H2 "Próximas festas" with "Nenhuma festa agendada no momento", then Conheça o espaço (≤ 6 lazy photos, "Ver galeria completa"; hidden when none), Quem somos (page intro, "Conheça a casa") and Como chegar (address, gold hours, "Como chegar" → /contato, "Chamar no WhatsApp"); no iframe or video on the home
- `buildPageMetadata` on /quem-somos (+3 sub-pages), legal pages, /espaco, /modelos, /contato: unique `<title>` "… · Paraíso Brasília", description, canonical, og:title/og:image (og-default), twitter card; staging `X-Robots-Tag: noindex` asserted
- `buildSitemap`: home, /espaco, /contato, published institutional pages, /modelos only with published models, upcoming parties

## Budgets (Pixel 7, before interaction)

| Page | dev server, without JS | production build (`next build` + `next start`, gzip) |
|------|------------------------|------------------------------------------------------|
| / (1 party + 6 space photos) ≤ 600 KB | 198 KB | 196 KB + 148 KB JS = 344 KB |
| /contato ≤ 400 KB (OSM iframe excluded) | 140 KB | 138 KB |
| /quem-somos ≤ 250 KB | 141 KB | 146 KB |
| /espaco, 12 photos ≤ 600 KB | — | 228 KB |

Before the fixes the dev numbers were 450 / 391 / 392 KB: the favicon (`src/app/icon.png`, 512 px, 150 KB) was fetched on every first visit, four woff2 files (latin + latin-ext of both fonts, 185 KB) were preloaded, and the hidden age-gate logo was downloaded for returning visitors.

## Task Commits

1. **Task 1: Home that works without parties** - `5ba7670` (feat)
2. **Task 2: Metadata, sitemap and budgets** - `6131ef6` (feat)

## Verification

| Check | Result |
|---|---|
| `playwright test tests/e2e/home-sem-festas.spec.ts tests/e2e/home.spec.ts` | 8 passed (both projects; parties unpublished/republished through the staff REST API) |
| page.tsx contains getSpacePhotos, getContact, "Paraíso Brasília"; no iframe/`<video` in page.tsx or home/* | PASS |
| `vitest run tests/unit` (incl. sitemap.test.ts, metadata.test.ts) | 34 passed |
| `playwright test tests/e2e/seo.spec.ts tests/e2e/perf-galeria.spec.ts --project=mobile` | passed |
| `grep -rl buildPageMetadata src/app` | 7 files (≥ 6) |
| `pnpm test` | vitest 15 files / 61 tests; playwright 70 passed, 22 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| `pnpm build` without .env/DATABASE_URI | exit 0; all new routes dynamic (ƒ) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Performance] Shell assets blew the /quem-somos budget (392 KB > 250 KB)**
- **Found during:** Task 2 budget tests
- **Fix:** favicon re-encoded (256 px palette PNG, 15 KB); `next/font` subsets `['latin']` (stops preloading latin-ext files); age-gate logo `loading="lazy"` (not fetched while the gate is hidden).
- **Files modified:** src/app/icon.png, src/app/(frontend)/layout.tsx, src/lib/age-gate/self-declaration.tsx — **Committed in:** 6131ef6
- **Verification:** age-gate and shell e2e green; budgets above.

**2. [Rule 3] JS measured apart on the dev server** — `next dev` ships ~820 KB of unminified JS; budgets assert non-JS bytes in e2e and the production build was measured once (148 KB JS gzip on the home).

**3. PartyGrid.tsx unchanged** (listed in files_modified; the grid needed no change).

---

**Total deviations:** 3 (1 performance fix in Phase 1 assets, 1 measurement note, 1 scope note). **Impact:** lighter pages for every visitor.

## Issues Encountered

- `next start` warns that standalone output prefers `node .next/standalone/server.js`; used only for the local measurement.

## User Setup Required

None.

## Next Phase Readiness

- 02-01..02-05 done; full suite and DB-less build green → ready for 02-06 (runbook, staff guide, push to main, client check).

## Self-Check: PASSED

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Completed: 2026-10-19*
