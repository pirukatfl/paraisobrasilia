---
phase: 06-migra-o-do-wordpress
plan: 04
subsystem: assinantes
tags: [payload, migration, privacy, admin]
requires: [06-01, 06-02]
provides:
  - "assinantes fields wpUserId, importadoEm, legacyPasswordHash (hidden), revisarAssinaturaAntiga, avisoSemData; origem 'site-antigo'"
  - "M-02 marker 'Assinante antigo sem data de vencimento': list text, record box, dashboard panel, filter, dismiss endpoint, auto-clear on new period"
  - "migration 20261021_121622_migracao_contas"
affects: [06-05, 06-07]
key-files:
  created:
    - src/lib/assinantes/site-antigo.ts
    - src/lib/assinantes/site-antigo-label.ts
    - src/components/admin/assinantes/AvisoSemData.tsx
    - src/components/admin/assinantes/RevisarSiteAntigo.tsx
    - src/migrations/20261021_121622_migracao_contas.ts
    - tests/int/migracao-contas.int.test.ts
    - tests/e2e/revisar-site-antigo.spec.ts
  modified: [src/collections/Assinantes.ts, src/collections/Subscriptions.ts, src/lib/assinantes/audit.ts, src/lib/assinantes/endpoints.ts, src/payload.config.ts, tests/helpers/seed.ts, tests/helpers/rest.ts, src/payload-types.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 04: Imported-account model and the "sem data de vencimento" marker Summary

Assinantes carry the migration fields. The old hash is hidden from REST, where-queries and audit (SECRET_FIELDS); self sign-up strips the four migration fields; any password write erases the old hash. The M-02 marker is visible in the list, on the record, in a dashboard panel and as a filter, clears itself when a subscription period is created, and can be dismissed (audited).

## Commits
- 3031247 model, hooks, migration, endpoint, components
- 1bef931 tests
- fc499ec type fix

## Results
- 21 int tests (tests/int/migracao-contas.int.test.ts) and 5 desktop Playwright tests pass.

## Deviations from Plan
- Implementation and tests were committed close together rather than as a separate RED commit.
- GraphQL is disabled project-wide (T-03-16), so the "hash not in GraphQL" check asserts a 404 instead of a field error.

## Self-Check: PASSED
