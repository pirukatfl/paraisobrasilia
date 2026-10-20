---
phase: 05-recados-mensagens-e-contos
plan: 06
subsystem: recados
tags: [recados, moderation, audit, admin-panel]
requires: [05-05]
provides:
  - moderateRecado, getRecadoModerationView, countPendingRecados (src/lib/recados/service.ts)
  - staff-only endpoints GET /api/recados/:id/moderacao and POST /:id/aprovar|recusar|despublicar
  - audit actions recado-aprovado/recusado/despublicado (migration 20261020_133947_recados_moderation)
  - RecadoModeracaoPanel and the "Recados: N para aprovar" dashboard line
affects: [05-07, 05-11]
key-files:
  created:
    - src/lib/recados/endpoints.ts
    - src/components/admin/recados/RecadoModeracaoPanel.tsx
    - tests/int/recado-moderation.int.test.ts
    - tests/e2e/moderacao-recados.spec.ts
  modified:
    - src/lib/recados/service.ts
    - src/collections/Recados.ts
    - src/lib/assinantes/audit.ts
    - src/components/admin/classisex/FilaClassisex.tsx
    - tests/e2e/helpers/api.ts
    - tests/e2e/recados.spec.ts
    - tests/int/recados.int.test.ts
key-decisions:
  - "Same transitions as ads (aprovar from pendente/recusado/despublicado, recusar from pendente, despublicar from aprovado/pendente); motivo 3-300 chars required for recusar/despublicar."
  - "status/motivo/moderation dates are admin readOnly and a beforeChange guard keeps stored values for signed-in writes without context.moderation (Local API without a user is unaffected)."
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 5 Plan 06: Recados moderation Summary

Staff approve, refuse or unpublish recados from a panel in /admin (or the audited endpoints); each action writes an audit row, the dashboard shows the queue, and the author sees the refusal reason in Recados.

## Deviations from Plan

- [Rule 1] The Despublicar button is enabled for pending as well as approved recados (matches the service transition; the ads panel it was copied from was stricter).
- [Rule 1] tests/int/recados.int.test.ts staff-update check now edits `apelido` (status/motivo are guarded by design).
- Payload appends its own default endpoints to the shared endpoints array, so the int test filters to the four moderation paths.
- The e2e `setRecadoStatus` helper was replaced by `aprovarRecado`/`recusarRecado`/`despublicarRecado`.
- Down migration is the Payload-generated enum rebuild.

## Self-Check: PASSED
