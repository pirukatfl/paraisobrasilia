---
phase: 05-recados-mensagens-e-contos
plan: 12
subsystem: docs
tags: [docs, runbook, staff-guide]
requirements-partial: [REC-01, REC-02, REC-03, REC-04, PREV-02, PREV-03, PREV-04, PAINEL-03]
completed: PARTIAL (docs done 2026-10-20; staging smoke and client checkpoint handled by the orchestrator)
---

# Phase 5 Plan 12: Staff guide and runbook Summary

Staff guide sections for Contos and Mensagens entre assinantes, a one-line placeholder for Recados, and runbook 7.4 (Fase 5 migrations, contos bundle).

## Done
- `docs/painel/GUIA-DA-EQUIPE.md`: `## Contos` (publish, Parágrafos abertos with the ~150 words / 15% cap and one paragraph always reserved, 48 imported contos with 3 auto-generated titles to review), `## Recados` ("Recados: em revisão, seção será atualizada"; the mural is NOT described because the client asked to rework Recados into private recados sent from a paying advertiser's ad), `## Mensagens entre assinantes` (privacy, report flow, urgent "menor de idade" with immediate automatic suspension, Descartar/Resolver/Suspender, releasing via "Mensagens suspensas", testing with two subscribers). Title already said "Fases 2 a 5".
- `docs/deploy/STAGING.md` 7.4: migrations run by the timer, no new volume, bundle migration `20261020_173000_contos_wp_bundle_carga` loading 48 contos from `contos-wp.json`, log check, backups. Recados mural not documented.
- `tests/unit/deploy-files.test.ts`: 2 new tests.

## Not done (by instruction)
- Staging smoke spec (`tests/e2e/staging-smoke.spec.ts`), push, and the client checkpoint (Task 2): orchestrator. Recados sections must be rewritten after the rework.

## Deviations
- Runbook had 7.5 but no 7.4; 7.4 inserted before it.
- Recados content deliberately a placeholder (coordinator instruction).
