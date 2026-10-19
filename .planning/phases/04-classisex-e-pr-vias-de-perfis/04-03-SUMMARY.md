---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 03
subsystem: admin
tags: [moderation, audit, endpoints, admin-ui, dashboard]

requires:
  - phase: 04-02
    provides: ads collection, ServiceError, owner service
  - phase: 04-01
    provides: redactContacts
provides:
  - moderateAd / approveAd / rejectAd / unpublishAd (req, id, …, now) and getModerationCounts, getModerationView in src/lib/classisex/service.ts
  - STAFF_STATUS_LABELS, MOTIVO_MESSAGE, MOTIVO_MAX
  - adEndpoints: GET /api/ads/:id/moderacao, POST /api/ads/:id/aprovar|recusar|despublicar (staff-only)
  - audit actions anuncio-aprovado / anuncio-recusado / anuncio-despublicado (migration classisex_moderation)
  - ModeracaoPanel UI field and FilaClassisex dashboard component
  - staff REST helpers aprovar/recusar/despublicar
affects: [04-08 (reports reuse moderateAd with auditDetails; queue gains denúncias), 04-10 (staff guide)]

tech-stack:
  added: []
  patterns:
    - "Admin panel that changes the document's own fields syncs the Payload form after the action (dispatchFields UPDATE with initialValue + setModified(false)) so a later Salvar cannot send stale values back"

key-files:
  created:
    - src/lib/classisex/endpoints.ts
    - src/components/admin/classisex/ModeracaoPanel.tsx
    - src/components/admin/classisex/FilaClassisex.tsx
    - src/migrations/20261019_191255_classisex_moderation.ts
    - tests/int/ad-moderation.int.test.ts
    - tests/e2e/moderacao.spec.ts
  modified:
    - src/lib/classisex/service.ts
    - src/lib/assinantes/audit.ts
    - src/collections/Ads.ts
    - src/payload.config.ts
    - src/app/(payload)/admin/importMap.js
    - src/components/classisex/OwnerAdCard.tsx
    - tests/e2e/helpers/api.ts

key-decisions:
  - "Transitions: aprovar from pendente/recusado/despublicado; recusar from pendente; despublicar from aprovado/pendente (the panel enables Despublicar only for published ads); wrong state → 409 'Este anúncio já está …'"
  - "Transition is checked before the reason, so a wrong-state call answers 409 even without a reason"
  - "status and motivo are read-only in the admin: changes go only through the audited buttons"
  - "The panel reads a server-built view (GET /api/ads/:id/moderacao) instead of client form state, so the public preview is computed by the same server code as the public DTO"

requirements-completed: [PAINEL-07]

duration: 35min
completed: 2026-10-19
---

# Phase 4 Plan 03: Moderation queue Summary

**Staff see "ClassiSex: N anúncios para aprovar" on the dashboard and, on each ad, a "Moderação" panel with the text exactly as the open area will show it (contacts removed), the contacts, and Aprovar / Recusar / Despublicar with a required reason; each action is staff-only and lands in Registro de ações.**

## Performance
- **Duration:** ~35 min
- **Tasks:** 2 (TDD, 5 commits)

## Task Commits
1. Task 1 RED `dc7aafe` test(04-03): failing moderation service and endpoint tests
2. Task 1 GREEN `58314d4` feat(04-03): staff moderation service, endpoints and audit actions
3. Task 2 RED `7b6feb7` test(04-03): failing moderation panel and queue e2e
4. Task 2 GREEN `490adfc` feat(04-03): Moderação panel on ads and ClassiSex queue on the dashboard
5. `1fa40c4` chore(04-03): regenerate payload types

## Verification
- `vitest run tests/int/ad-moderation.int.test.ts tests/int/ads.int.test.ts tests/int/audit-log.int.test.ts` → 25 passed
- `playwright test tests/e2e/moderacao.spec.ts --project=desktop` → 4 passed
- `pnpm test` → Vitest 237 passed (32 files), Playwright 148 passed; typecheck, lint clean

## Deviations from Plan
1. **[Rule 2 - Correctness] Stale admin form.** The panel changes fields of the document being edited; without syncing, staff clicking "Salvar" afterwards would write the old status back (bypassing the audit). Added `getModerationView` + `GET /api/ads/:id/moderacao` and a form-state sync; made `status`/`motivo` read-only in the admin. E2E covers "Salvar after Aprovar keeps Publicado".
2. **Owner card** now shows "Recusado: {motivo}" on the status line (plan's e2e wording) instead of a separate "Motivo da equipe" box.
3. Migration applied to `paraiso_test` only (dev DB is schema-pushed; see 04-02).

## Self-Check: PASSED
