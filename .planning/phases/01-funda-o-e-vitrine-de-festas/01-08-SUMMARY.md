---
phase: 01-funda-o-e-vitrine-de-festas
plan: 08
subsystem: seo
tags: [open-graph, plugin-seo, robots, sitemap, x-robots-tag, sharp]

# Dependency graph
requires:
  - phase: 01-07
    provides: PartyDetailDTO, getPartyBySlug, party page, date formatting
provides:
  - media `og` image size (1200x630, fit contain on #0B0908, JPEG q82) — native Payload, no fallback hook
  - @payloadcms/plugin-seo on parties (meta.title/description/image), migration 20261017_204209_seo_and_og
  - src/lib/seo/metadata.ts buildPartyMetadata (title/description fallbacks, OG + Twitter, ?v=updatedAt cache-buster)
  - generateMetadata on /festas/[slug]; src/app/robots.ts; src/app/sitemap.ts
  - next.config headers: X-Robots-Tag noindex,nofollow outside production; nosniff; Referrer-Policy; X-Frame-Options SAMEORIGIN
  - PartyCardDTO.updatedAt; PartyDetailDTO.flyerOgUrl (absolute) and meta
affects: [01-09, 01-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page-level openGraph repeats siteName/locale (Next replaces, not merges, the root openGraph object)"
    - "SITE_ENV drives robots.ts, root robots meta and the X-Robots-Tag header"

key-files:
  created:
    - src/lib/seo/metadata.ts
    - src/app/robots.ts
    - src/app/sitemap.ts
    - src/migrations/20261017_204209_seo_and_og.ts
    - src/migrations/20261017_204209_seo_and_og.json
    - tests/unit/metadata.test.ts
    - tests/e2e/seo.spec.ts
  modified:
    - src/collections/Media.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/app/(payload)/admin/importMap.js
    - src/lib/parties/queries.ts
    - src/lib/parties/types.ts
    - src/app/(frontend)/festas/[slug]/page.tsx
    - next.config.ts
    - tests/int/parties.int.test.ts

key-decisions:
  - "Assumption A2 confirmed: Payload 3.91 passes per-size fit/background/formatOptions to sharp — `sizes.og` is a real 1200x630 JPEG; fallback hook not needed"
  - "updatedAt moved onto PartyCardDTO (sitemap lastModified) — PartyDetailDTO inherits it"
  - "Party pages also set alternates.canonical"

patterns-established:
  - "Share image URL = NEXT_PUBLIC_SERVER_URL + sizes.og.url + ?v=<updatedAt epoch>"

requirements-completed: [FEST-03, INST-05]

# Metrics
duration: 5min
completed: 2026-10-17
---

# Phase 1 Plan 08: SEO and share previews Summary

**Each flyer now gets a 1200×630 JPEG share image generated natively by Payload/sharp; party pages emit absolute OG/Twitter tags with staff-editable SEO overrides; robots, sitemap and X-Robots-Tag follow SITE_ENV so staging can never be indexed while production allows public pages and blocks /admin and /api.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-17T20:41:54Z
- **Completed:** 2026-10-17T20:45:55Z
- **Tasks:** 2
- **Files modified:** 16

## Task Commits

1. **Task 1: SEO e2e + metadata unit tests, og image size, SEO plugin fields, metadata builder** - `f46724b` (feat)
2. **Task 2: generateMetadata, robots, sitemap, noindex headers** - `6b1621d` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/metadata.test.ts` | 3 passed |
| Media.ts contains `name: 'og'` | PASS (native size; int test asserts jpeg 1200x630 on disk) |
| payload.config.ts contains `seoPlugin(` with `collections: ['parties']` | PASS |
| `payload migrate:status` (paraiso_test) | initial 1 Yes · party_details 2 Yes · seo_and_og 3 Yes |
| `playwright test tests/e2e/seo.spec.ts` | 6 passed (og:image absolute, 200, image/jpeg, ≤ 300 KB; robots `Disallow: /`; x-robots-tag noindex; sitemap has festa-de-teste, not festa-passada) |
| page.tsx has generateMetadata + buildPartyMetadata | PASS |
| `SITE_ENV=production pnpm build && SITE_ENV=production pnpm start`; `curl /robots.txt` | `Allow: /`, `Disallow: /admin`, `Disallow: /api`, `Sitemap: …/sitemap.xml`; no X-Robots-Tag; `<meta name="robots" content="index, follow"/>` |
| Full e2e suite (dev server, SITE_ENV=staging) | 26 passed |
| Full vitest | 16 passed |
| typecheck / lint | exit 0 |

## Deviations from Plan

**1. [Rule 2] og-size integration assertion** added to tests/int/parties.int.test.ts (the plan asked to "verify after upload" — now a permanent check).

**2. [Rule 2] Page openGraph repeats siteName/locale and adds canonical** — Next replaces the root openGraph object on pages that define their own.

## Issues Encountered

- `pnpm build` prerenders /, /festas/* and /sitemap.xml from the database (11 static pages); the production Docker build in 01-10 needs DATABASE_URI reachable at build time or these routes switched to on-demand generation.

## Next Phase Readiness

- Real WhatsApp/Instagram preview check remains for staging (01-10).

## Self-Check: PASSED

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
