---
phase: 03-assinantes-e-controle-de-acesso
plan: 04
subsystem: admin
tags: [audit-log, staff-actions, endpoints, admin-ui, payload-ui-field]

# Dependency graph
requires:
  - phase: 03-03
    provides: subscriptions, periods.ts, accessUntil, withRequestState, delete cascade
  - phase: 03-02
    provides: plans (price, promoPrice, durationDays)
provides:
  - Collection `audit-log` (append-only) + writeAudit/diffForAudit/auditActorOf (src/lib/assinantes/audit.ts)
  - Audit hooks on assinantes (conta-criada/editada/excluida) and subscriptions (acesso-liberado/renovado/encerrado, periodo-corrigido)
  - Service grantOrRenew / endAccess / getSituacao + ServiceError (src/lib/assinantes/service.ts)
  - Staff-only endpoints GET /api/assinantes/:id/situacao, POST /:id/liberar, POST /:id/encerrar
  - status.ts (entitlement with an explicit Payload instance, safe for the Payload CLI)
  - Admin UI field "Assinatura" (src/components/admin/assinantes/AssinaturaPanel.tsx) and joins Períodos / Histórico
  - e2e helpers liberar/encerrar
affects: [03-05 (password actions audited, link-senha endpoint, panel section), 03-06 (dashboard + leak matrix)]

tech-stack:
  added: []
  patterns:
    - "Staff actions = service function (int-tested) + thin collection endpoint (403 unless isStaff) + thin client panel"
    - "Audit rows written in the same request with overrideAccess; bookkeeping writes carry context.skipAudit"

key-files:
  created:
    - src/collections/AuditLog.ts
    - src/lib/assinantes/audit.ts
    - src/lib/assinantes/service.ts
    - src/lib/assinantes/endpoints.ts
    - src/lib/assinantes/status.ts
    - src/components/admin/assinantes/AssinaturaPanel.tsx
    - src/migrations/20261019_130455_audit_log.ts
    - tests/unit/audit-diff.test.ts
    - tests/int/audit-log.int.test.ts
    - tests/int/staff-actions.int.test.ts
    - tests/e2e/painel-assinatura.spec.ts
  modified:
    - src/collections/Assinantes.ts
    - src/collections/Subscriptions.ts
    - src/lib/assinantes/access.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/app/(payload)/admin/importMap.js
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts

key-decisions:
  - "A1 confirmed: custom collection endpoints get req.routeParams.id; the body is not pre-parsed (readBody uses req.data or req.json())"
  - "A2 confirmed: a type 'ui' field with admin.components.Field gets the document id from useDocumentInfo (no beforeDocumentControls fallback needed); placed right after 'Nome ou apelido'"
  - "endAccess with nothing open → 400 'Não há acesso ativo para encerrar.' (no empty audit row)"
  - "Renewal detection for periods created directly in the collection: another non-ended period covering the new start, or active now"
  - "Payment details keys in Portuguese: plano, valor, forma, data, observação"
  - "Test resets pass context.skipAudit so cleanup never writes log rows"

patterns-established:
  - "Modules reachable from payload.config (collections, endpoints, services) never import 'server-only'"

requirements-completed: [PAINEL-05, PAINEL-08]

# Metrics
duration: 35min
completed: 2026-10-19
---

# Phase 3 Plan 04: Release, renew, end and the action log Summary

**Staff release, renew and end subscriptions from an "Assinatura" panel on the subscriber page; the server computes every date (renewal from the later of today and the current end), records the payment, and every account/period change lands in an append-only "Registro de ações" with who, when, what and no secrets.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- `audit-log` (group Assinantes): read staff only; create/update/delete `() => false` (no "Criar novo", no Salvar/Excluir in the panel, REST 403); `diffForAudit` drops password/hash/salt/sessions/reset tokens/lock fields, joins and timestamps; staffNotes logged as "alterada".
- Hooks: account create/edit/delete (delete keeps the "Nome <e-mail>" snapshot and `periodosRemovidos`), period grant/renew with `pagamento { plano, valor, forma, data, observação }`, end, correction (de/para). `accessUntil` recomputes do not log.
- Service + endpoints: grantOrRenew (default amount promo or price; cortesia needs days), endAccess (all open periods, one log row with the reason), getSituacao (state, active plans, last 10 periods). Request dates are ignored (int test posts a 2099 end and gets the computed one).
- Panel: "Situação: Ativa — válida até … (faltam N dias)", plan select, amount, method, payment date, note, preview "Acesso até …", "Liberar acesso"/"Renovar", "Encerrar acesso agora" (prompt + confirm). Joins "Períodos e pagamentos" and "Histórico" on the same page.

## Task Commits

1. **Task 1: Append-only audit log fed by hooks** - `9eeb6b8` (feat)
2. **Task 2: Release/renew/end service and staff-only endpoints** - `f55ccbb` (feat)
3. **Task 3: Assinatura panel in /admin** - `9c1b491` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/audit-diff.test.ts tests/int/audit-log.int.test.ts tests/int/subscriptions.int.test.ts` | 17 passed |
| AuditLog.ts create/update/delete `() => false`; migration `audit_log` registered | yes |
| `vitest run tests/int/staff-actions.int.test.ts tests/int/audit-log.int.test.ts` | 12 passed |
| endpoints.ts contains isStaff and `status: 403`; `grep -n startsAt endpoints.ts` | yes; 0 |
| `playwright test painel-assinatura.spec.ts --project=desktop` | 3 passed |
| importMap.js contains AssinaturaPanel | yes |
| `pnpm test` | vitest 25 files / 141 tests; playwright 105 passed, 29 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 'server-only' modules cannot be reached from the Payload config**
- **Issue:** endpoints → service would import access.ts (`import 'server-only'`), which throws when the Payload CLI (migrate, generate:types) loads the config in plain Node.
- **Fix:** entitlement moved to `status.ts` (takes a Payload instance, no server-only); `access.ts` keeps the server-only DAL wrapper for pages. CLI checked with `pnpm generate:types` after wiring the endpoints.
- **Commit:** f55ccbb

**2. [Rule 1 - Bug] e2e log assertions polluted by other specs**
- **Issue:** in a full run, minha-assinatura also writes "Acesso liberado" rows (the log is never cleaned within a run).
- **Fix:** the log spec searches Bia's rows (`?search=bia%40teste.local`, rows filtered by name).
- **Commit:** 9c1b491

**3. [Rule 1 - Bug] ESLint react-hooks/set-state-in-effect** — panel loads the situation in a promise-based effect with a reload counter.

The delete cascade listed in this plan's Task 1 was delivered in 03-03 (commit b781010); this plan added the `conta-excluida` row with `periodosRemovidos`.

## Self-Check: PASSED
