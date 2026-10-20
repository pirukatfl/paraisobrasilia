---
phase: 05-recados-mensagens-e-contos
plan: 02
subsystem: contos-admin
tags: [payload, collection, drafts, lexical, admin-panel]
requires: [05-01]
provides:
  - src/lib/contos/excerpt.ts (splitConto, plainTextOf, wordCount, chamadaOf, slugify, SLUG_RE, DEFAULT_OPEN_BLOCKS)
  - src/collections/Contos.ts (slug 'contos', drafts, every REST op staff-only incl. versions)
  - migration 20261020_131108_contos
  - src/components/admin/contos/TrechoAbertoPanel.tsx
  - tests/helpers/seed.ts lexicalParagraphs / seedConto, RESET_ORDER 'contos'
affects: [05-03, 05-04, 05-11]
tech-stack:
  added: []
  patterns: ["one pure excerpt rule shared by admin preview, public DTO and import report"]
key-files:
  created:
    - src/lib/contos/excerpt.ts
    - src/lib/contos/revalidate.ts
    - src/collections/Contos.ts
    - src/components/admin/contos/TrechoAbertoPanel.tsx
    - src/migrations/20261020_131108_contos.ts
    - tests/unit/conto-excerpt.test.ts
    - tests/int/contos.int.test.ts
    - tests/e2e/painel-contos.spec.ts
  modified:
    - src/payload.config.ts
    - src/payload-types.ts
    - src/lib/cache/expire.ts
    - src/migrations/index.ts
    - src/app/(payload)/admin/importMap.js
    - tests/helpers/seed.ts
key-decisions:
  - "Single-block conto: 60 words when longer than 60, otherwise half of its words, always with an ellipsis, so something always remains for subscribers"
  - "Slug and range errors are thrown from beforeValidate so the pt messages also apply to drafts"
requirements-completed: [PAINEL-03, PREV-03]
duration: 30min
completed: 2026-10-20
---

# Phase 5 Plan 02: Contos collection and open-excerpt panel Summary

Contos exist as a staff-only drafts collection (read/readVersions/create/update/delete all isStaff, verified for anonymous and subscriber principals), with a pure excerpt rule and an admin panel that shows exactly what visitors will read.

## Tasks
1. Excerpt rule + collection + migration - commit c6c4101
2. Trecho aberto panel + desktop e2e - commit f82b951

## Deviations from Plan
- `.env` in this checkout is a directory, so `payload migrate:create` / `generate:*` were run with `.env.test` exported into the environment (migration applied to paraiso_test automatically by `getTestPayload`).
- Single-block rule for texts of 60 words or fewer is half of the words (plan only specified the over-60 case).

## Known Stubs
None.

## Self-Check: PASSED
