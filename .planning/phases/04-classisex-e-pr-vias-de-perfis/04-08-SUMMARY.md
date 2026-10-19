---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 08
subsystem: classisex-reports
tags: [reports, moderation, audit, minors, staff-only-rest]

requires:
  - phase: 04-03
    provides: unpublishAd, moderation endpoints, FilaClassisex
  - phase: 04-07
    provides: visibility rules, public preview
provides:
  - Collection 'ad-reports' (staff-only REST) + migration ad_reports
  - reportAd / resolveReport / getModerationCounts({ pendentes, denunciasAbertas, urgentes })
  - POST /api/ad-reports/:id/resolver (staff only)
  - denunciarAnuncio server action, ReportForm on the full ad, DenunciaPanel, dashboard report line
  - audit action 'denuncia-resolvida'
affects: [04-09 (leak matrix includes /api/ad-reports), 04-10 (guide: minor reports hide the ad at once)]

tech-stack:
  added: []
  patterns:
    - "Reports keep a text snapshot and null relations so they outlive a deleted ad or account"
    - "Server actions that take the page down (urgent report) redirect to the board with a flag instead of returning state"

key-files:
  created:
    - src/collections/AdReports.ts
    - src/lib/classisex/report-rules.ts
    - src/components/classisex/ReportForm.tsx
    - src/components/admin/classisex/DenunciaPanel.tsx
    - src/migrations/20261019_211202_ad_reports.ts
    - tests/int/ad-reports.int.test.ts
    - tests/e2e/denuncia.spec.ts
  modified:
    - src/lib/classisex/service.ts
    - src/lib/classisex/endpoints.ts
    - src/lib/classisex/actions.ts
    - src/lib/classisex/queries.ts
    - src/collections/Ads.ts
    - src/collections/Assinantes.ts
    - src/lib/assinantes/audit.ts
    - src/components/admin/classisex/FilaClassisex.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/classisex/page.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx
    - tests/e2e/helpers/api.ts

key-decisions:
  - "Orchestrator decision: a report with reason 'Pessoa menor de idade' sets the ad to 'despublicado' immediately (reason shown to the owner: 'Denúncia urgente: pessoa menor de idade. A equipe vai analisar.') and writes an 'anuncio-despublicado' audit row (actor Sistema, details automatico: true, denuncia, denunciante). The report stays open and urgent for staff; 'Descartar' leaves the ad hidden until staff press Aprovar."
  - "Report createdAt is set from the service clock so the São Paulo daily limit is testable and consistent"
  - "Hidden ads answer 404 to reporters (same visibility as the board)"

requirements-completed: [CLAS-05, PAINEL-07]

duration: ~75min
completed: 2026-10-19
---

# Phase 4 Plan 08: Reports Summary

**Subscribers report an ad (six reasons, once while open, 10 per day, never their own), staff see "N denúncias abertas · M urgente" and resolve with "Despublicar o anúncio" (closes every open report of the ad) or "Descartar", all audited; a report of a minor hides the ad immediately.**

## Task Commits
1. Task 1 `6635384` feat(04-08): ad-reports collection, report/resolve services, staff endpoint, cascades (migration included)
2. Task 2 `21cee06` feat(04-08): Denunciar on the full ad and the staff report queue/panel

## Verification
- `vitest run tests/int/ad-reports.int.test.ts ad-moderation ads` -> 32 passed (12 new)
- `playwright test tests/e2e/denuncia.spec.ts` -> 6 passed, 2 desktop-only skipped on mobile (member steps on both projects, admin steps on desktop)
- `pnpm test` -> Vitest 318 passed (41 files), Playwright 194 passed, 44 skipped (desktop-only admin flows on mobile and the staging smoke, as before); typecheck, lint clean
- 0 `formData.get('reporter'|'author')` in actions.ts; DenunciaPanel in importMap.js

## Deviations from Plan
1. **Orchestrator addition (T-04-17):** automatic hide on 'menor-de-idade' (above), with int test "menor de idade hides the ad at once and writes the audit log; other reasons do not" and an e2e step.
2. **[Rule 1 - Bug] Confirmation lost on urgent reports:** the auto-hide plus tag expiry made the ad page 404 on the action's re-render, so the reporter never saw the confirmation. `reportAd` now returns `{ hidden }`; the action redirects to `/area-do-assinante/classisex?denuncia=enviada` and the board shows "Denúncia enviada. A equipe vai analisar."
3. **TDD:** test and implementation of Task 1 are in one commit (no separate RED commit).
4. **Dev database not migrated:** `pnpm payload migrate` on the local dev DB `paraiso` stops at the "dev mode" prompt because that DB was created by schema push. Not touched; the test DB runs the committed migrations (verified) and `generate:types`/`generate:importmap` ran.
5. Default sort `-urgente,createdAt` is set as an array (`defaultSort`), cast for the type; the join on the ad uses the same order.
6. Resolving 'despublicar' on an ad that is already hidden (e.g. by the minor rule) skips the unpublish and just closes the reports; the audit row says so.
7. Playwright: `staffApi(page.request)` logs the page's own staff session out on dispose; the spec uses the separate `request` fixture.

## Known Stubs
None.

## Self-Check: PASSED
