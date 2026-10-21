---
phase: 06-migra-o-do-wordpress
plan: 06
subsystem: classisex
tags: [ads, drafts, migration]
requires: [06-04]
provides:
  - "Ads status 'rascunho' (private to author and staff, no moderation transition); fields wpCommentId, importadoEm, criadoNoSiteAntigoEm"
  - "AdMedia legacyImport bypass of the photo-count limit (server-only context flag with overrideAccess)"
  - "Owner UI 'Revisar e enviar'; migration 20261021_123416_migracao_anuncios"
affects: [06-07]
key-files:
  created: [src/migrations/20261021_123416_migracao_anuncios.ts, tests/int/anuncios-rascunho.int.test.ts, tests/e2e/anuncios-site-antigo.spec.ts]
  modified: [src/collections/Ads.ts, src/collections/AdMedia.ts, src/lib/classisex/rules.ts, src/lib/classisex/dto.ts, src/lib/classisex/service.ts, src/components/admin/classisex/ModeracaoPanel.tsx, src/components/classisex/OwnerAdCard.tsx, tests/e2e/helpers/api.ts, src/payload-types.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 06: Old ads as private drafts Summary

Old ClassiSex ads exist as `rascunho`: invisible to everyone but the author and staff, not approvable, with no contact required. The author reviews and submits through updateAd; the ad then follows the normal moderation queue.

## Commits
- 4f7592b model, service, UI, migration
- 6a4e35a tests

## Results
- 11 int tests, 5 mobile Playwright tests pass.

## Deviations from Plan
- [Rule 2] Added a draft guard in `backToModeration` and in `attachMedia` (photo limit skipped for drafts), not in the plan, to keep drafts from entering the queue or being blocked by tier limits.
- The e2e does not rely on a character counter; the server error is shown on submit.

## Self-Check: PASSED
