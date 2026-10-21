---
phase: 06-migra-o-do-wordpress
plan: 02
subsystem: migration
tags: [wordpress, importer, fixtures]
requires: [06-01]
provides:
  - "src/lib/migracao/{php-serialized,wp-accounts,wp-classisex,report}.ts"
  - "tests/fixtures/wp-migracao-mini.sql + tests/helpers/wp-migracao-fixture.ts (synthetic)"
affects: [06-07, 06-08]
key-files:
  created:
    - src/lib/migracao/php-serialized.ts
    - src/lib/migracao/wp-accounts.ts
    - src/lib/migracao/wp-classisex.ts
    - src/lib/migracao/report.ts
    - tests/fixtures/wp-migracao-mini.sql
    - tests/helpers/wp-migracao-fixture.ts
    - tests/unit/migracao-extract.test.ts
  modified: [src/lib/contos/wp-dump.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 02: WordPress extraction layer Summary

Account classification (M-01/M-02: pagante, revisar, vencida, sem-data; endsAt rounded up to São Paulo midnight), old ClassiSex ad extraction with wpDiscuz key discovery (M-04) and aggregate-only inspect/dry-run reports, all on a synthetic fixture (13 accounts, 11 comments).

## Commits
- 77fa86a Task 1 (fixture, php-serialized, wp-accounts, wp-dump header comment)
- 94627e8 Task 2 (wp-classisex, report, tests)

## Results
- 14 unit tests in migracao-extract.test.ts (+ 10 existing wp-dump tests still pass). LEAK test: no fixture sentinel, '@', full hash or WordPress ID in any report.
- php-serialized.ts is a bounded, length-aware reader (no eval), per T-06-07.

## Deviations from Plan
- The fixture and Task 1 tests were written together and the implementation immediately after; there was no separate RED commit for this plan (plan type is `execute`, not `tdd`).
- apelidoFrom: user 12 ("Ana ... 61 99999-8888") has apelido null as the plan requires, so the nicename fallback applies only when display_name is empty (as 06-RESEARCH §4 says), not when it is rejected.
- Fixture hash counts differ from the narrative in the plan inspect example (8 `$wp$`, 4 `$P$B`, 1 other); the tests assert the real fixture numbers.

## Self-Check: PASSED
