---
phase: 06-migra-o-do-wordpress
plan: 07
subsystem: migration
tags: [loader, idempotent, local-api]
requires: [06-02, 06-04, 06-06]
provides:
  - "src/lib/migracao/load.ts: MIGRATION_PLAN_NAME, ensureMigrationPlan, importAccounts, importLegacyAds, formatLoadLines"
affects: [06-08, 06-10]
key-files:
  created: [src/lib/migracao/load.ts, tests/int/migracao-load.int.test.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 07: Idempotent loader Summary

Accounts are found by wpUserId, then by e-mail. A confirmed account with the same e-mail is linked (keeps its password, gains the period); an unconfirmed self sign-up is skipped and counted as `conflitoEmail`. Periods use the inactive plan "Migrado do site antigo" and are never shortened. Re-runs never overwrite name, apelido or a converted password, and only refresh a still-pending legacy hash. Ads become drafts; photos are read with realpath containment (symlinks and `..` counted as outside the folder), an extension allowlist and a sharp format check, and only added to a still-`rascunho` draft with no media. Output is counts only.

## Commits
- 07946e8 loader and tests

## Results
- 13 int tests (7 accounts, 6 ads).

## Deviations from Plan
- Containment is checked before the extension allowlist, so `../../etc/passwd` is counted as `fotosForaDaPasta` as the plan's behavior states.
- Plan was committed as one task commit for both tasks (tests and implementation together).

## Self-Check: PASSED
