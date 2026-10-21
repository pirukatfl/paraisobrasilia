---
phase: 06-migra-o-do-wordpress
plan: 03
subsystem: routing
tags: [redirects, seo, wordpress]
requires: []
provides:
  - "src/lib/redirects/build.ts generator; committed src/lib/redirects/legacy-redirects.ts (134 entries, 301)"
  - "next.config.ts redirects() spreads LEGACY_REDIRECTS after the two existing entries"
affects: [06-10]
key-files:
  created:
    - src/lib/redirects/build.ts
    - src/lib/redirects/legacy-redirects.ts
    - tests/unit/legacy-redirects.test.ts
    - tests/e2e/redirects-site-antigo.spec.ts
  modified: [next.config.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 03: Old links redirect map Summary

Redirect map generated from 06-OLD-URLS.md plus the contos bundle (wpSlug to slug), committed for review and served as 301s by Next. Wildcard rules cover BuddyPress/UM/Youzify, feeds, wp-admin/wp-login, categories, ImagePress and old sitemaps.

## Commits
- 382183a generator, map, next.config wiring, unit tests
- f2eaef8 e2e spec

## Results
- 7 unit tests (inventory counts 20/100/4, destinations exist, nothing shadowed, map up to date, next.config wiring). 16 Playwright tests on the mobile project (desktop skipped by design) pass: sampled old links end in the right page with 301/308 hops; /beijo-grego/ 404; /classisex 200; /admin not redirected.
- 10 Dicas Hot posts and /o-que-e-dogging land in LEGACY_SEM_DESTINO (404 by design; client question open).

## Deviations from Plan
- E2E skip uses `isMobile` (the `testInfo` form from the plan does not work as a skip callback in this Playwright version).
- Importing the TS map from next.config.ts worked; no JSON fallback needed.

## Self-Check: PASSED
