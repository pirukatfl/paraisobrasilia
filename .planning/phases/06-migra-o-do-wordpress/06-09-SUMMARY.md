---
phase: 06-migra-o-do-wordpress
plan: 09
subsystem: docs
tags: [docs, runbook, smoke]
requires: [06-08, 06-03]
provides:
  - "docs/painel/GUIA-DA-EQUIPE.md section 'Site antigo (migração)'"
  - "docs/deploy/STAGING.md section 7.6 (backup, inspect, dry-run, import, uploads, dump deletion, rollback, Fase 7 rules)"
  - "Read-only 'Fase 6' staging smoke"
affects: [06-10]
key-files:
  modified: [docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md, tests/unit/deploy-files.test.ts, tests/e2e/staging-smoke.spec.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 09: Guide, runbook and smoke Summary

## Commits
- f948ab8 guide section, runbook 7.6, document checks
- a8007fa staging smoke Fase 6

## Results
- deploy-files unit tests: 33 pass. Local smoke run against the dev server on the test DB: 6 passed, 1 skipped (the /4384-2/ conto page needs the contos bundle, absent in the test DB; the redirect chain itself is asserted).

## Deviations from Plan
- The staging run of the smoke (needs network access to the staging host) was skipped by instruction; it happens in 06-10.

## Self-Check: PASSED
