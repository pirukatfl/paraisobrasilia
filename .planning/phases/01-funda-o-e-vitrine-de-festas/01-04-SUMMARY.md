---
phase: 01-funda-o-e-vitrine-de-festas
plan: 04
subsystem: ui
tags: [tailwind4, next-font, branding, metadata, open-graph, sharp]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js app shell, Tailwind 4 PostCSS wiring
  - phase: 01-03
    provides: Playwright harness
provides:
  - scripts/brand/build-logo-assets.mjs (deterministic logo/icon/OG builder)
  - public/brand/logo-320.webp, logo-640.webp, logo-640.png; public/og-default.jpg; src/app/icon.png, apple-icon.png
  - Tailwind @theme tokens (colors, 4 text sizes) + component classes type-display/type-heading/type-label/type-eyebrow/btn-primary/header-line
  - Root metadata (metadataBase, title template, description, OG defaults, robots noindex outside production, rating adult + RTA)
  - Header (logo link, gradient top line), Footer (adults-only notice), not-found, error, catch-all 404 route
affects: [01-05, 01-06, 01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tokens as Tailwind 4 @theme variables; fonts via @theme inline referencing next/font CSS variables"
    - "Text styles via small component classes in globals.css (type-*) and btn-primary; components use token utilities only, no hex"
    - "(frontend)/[...notFound]/page.tsx calls notFound() so unmatched public URLs render the branded 404 (two root layouts)"

key-files:
  created:
    - scripts/brand/build-logo-assets.mjs
    - public/brand/logo-320.webp
    - public/brand/logo-640.webp
    - public/brand/logo-640.png
    - public/og-default.jpg
    - src/app/icon.png
    - src/app/apple-icon.png
    - src/app/(frontend)/globals.css
    - src/app/(frontend)/not-found.tsx
    - src/app/(frontend)/error.tsx
    - src/app/(frontend)/[...notFound]/page.tsx
    - src/components/Header.tsx
    - src/components/Footer.tsx
    - tests/e2e/shell.spec.ts
  modified:
    - src/app/(frontend)/layout.tsx

key-decisions:
  - "Logo background (#010101) blended with `lighten` over #0B0908 so logo boxes are invisible on the page background"
  - "Icon crop height 376 instead of 380: the wordmark starts at row 378 of the original, 380 left a sliver of letters"
  - "Both rating metas emitted via metadata.other.rating = ['adult', 'RTA-…'] (no manual <head>)"
  - "Catch-all (frontend)/[...notFound] route added: with two root layouts Next does not route unmatched URLs to (frontend)/not-found.tsx"

patterns-established:
  - "Page gutters: main is max-w-[1200px], px-4 (16px) mobile, lg:px-8 (32px), pt-12 (48px) below header"

requirements-completed: []  # FEST-01 / INST-05 completed by 01-07 / 01-08

# Metrics
duration: 4min
completed: 2026-10-17
---

# Phase 1 Plan 04: Brand shell Summary

**Dark premium shell from the client's logo: deterministic sharp-built logo/icon/OG assets, Tailwind 4 palette and type tokens, Josefin Sans + Inter via next/font, header with orange→red line, adults-only footer, pt-BR site metadata with noindex outside production, and branded 404/error screens.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-10-17T20:20:02Z
- **Completed:** 2026-10-17T20:24:06Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- `node scripts/brand/build-logo-assets.mjs` → logo-320.webp 15 KB, logo-640.webp 31 KB, logo-640.png 299 KB, icon.png 512² 150 KB, apple-icon.png 180² 26 KB, og-default.jpg 1200×630 28 KB; byte-identical on re-run
- Google fonts downloaded through next/font at dev/build time (self-hosted; no runtime request to Google — T-01-13)
- With SITE_ENV=staging the HTML carries `<meta name="robots" content="noindex, nofollow"/>`, `rating=adult` and the RTA label

## Task Commits

1. **Task 1: Shell e2e test, then logo/icon/OG asset build script** - `da2435d` (feat)
2. **Task 2: Tokens, fonts, header/footer, root metadata, 404/error** - `7cc6202` (feat)

## Verification

| Check | Result |
|---|---|
| asset script + sharp metadata check | `1200x630, 512x512, 180x180` → `ok`; og-default 28392 bytes ≤ 300000 |
| script run twice → md5 identical | PASS (`deterministic`) |
| `playwright test tests/e2e/shell.spec.ts` (mobile + desktop) | 6 passed (11.9s) |
| globals.css has accent/gold/bg tokens | 3/3 PASS |
| `grep -rnE '#[0-9A-Fa-f]{6}' src/components` | empty PASS |
| layout.tsx has Josefin_Sans, Inter, metadataBase, pt_BR, RTA label | PASS |
| staging HTML robots meta | `<meta name="robots" content="noindex, nofollow"/>` PASS |
| Header has no wa.me/whatsapp | 0 matches PASS |
| `/admin` 200, `/api/users` 403 with the catch-all in place | PASS |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| Visual check (scratchpad screenshot of 404 at 390px) | dark background, logo, Josefin uppercase heading, orange button, muted footer |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unmatched URLs did not reach (frontend)/not-found.tsx**
- **Found during:** Task 2 (shell e2e 404 test failed: default Next 404)
- **Fix:** `src/app/(frontend)/[...notFound]/page.tsx` calls `notFound()`; admin/api routes are more specific and unaffected.
- **Commit:** 7cc6202

**2. [Rule 1 - Bug] Icon crop showed the top of the wordmark and the logo's black box**
- **Fix:** crop height 376 (text starts at row 378) and `lighten` blend of the logo over #0B0908 for all derivatives.
- **Commit:** da2435d

---

**Total deviations:** 2 auto-fixed. **Impact:** none on contracts; output assets are cleaner.

## Issues Encountered

None.

## Next Phase Readiness

- 01-05 can use `type-*`, `btn-primary`, `bg-surface`, `border-line`, `text-gold` etc.; 01-06 adds the age gate to layout.tsx.

## Self-Check: PASSED

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
