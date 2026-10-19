---
phase: 3
slug: assinantes-e-controle-de-acesso
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (unit + int against paraiso_test), Playwright 1.64.1 (mobile + desktop projects; Chromium from /opt/pw-browsers via `PW_CHROMIUM_PATH`, never `playwright install`) |
| **Config file** | vitest.config.mts, playwright.config.ts (existing) |
| **Quick run command** | `pnpm exec vitest run tests/unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 s quick; ~6–8 min full |

---

## Sampling Rate

- **After every task commit:** `pnpm exec vitest run tests/unit` plus the task's own int/e2e file
- **After every plan wave:** `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds (single e2e spec)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | ASS-01, D-01 | T-03-01, T-03-02, T-03-03, T-03-07 | subscriber principal never passes staff checks; first-register/forgot-password/create blocked for non-staff; subscriber reads only self | int | `pnpm exec vitest run tests/int/access-roles.int.test.ts tests/int/assinantes-auth.int.test.ts` | ❌ created by task | ⬜ pending |
| 3-01-02 | 01 | 1 | ASS-01 | T-03-04, T-03-05, T-03-08 | generic login error; lockout; 30-day httpOnly cookie; members pages private/no-store/noindex; `?next=` allowlist | unit + e2e | `pnpm exec vitest run tests/unit/safe-next.test.ts && pnpm exec playwright test tests/e2e/assinante-login.spec.ts` | ❌ created by task | ⬜ pending |
| 3-02-01 | 02 | 2 | ASS-05, D-02, D-03 | T-03-13 | inactive plans hidden from anonymous; `paymentUrl` must be https; seed idempotent | unit + int | `pnpm exec vitest run tests/unit/plans-format.test.ts tests/int/plans.int.test.ts` | ❌ created by task | ⬜ pending |
| 3-02-02 | 02 | 2 | ASS-05 | T-03-13 | outbound links `rel="noopener noreferrer"` | e2e | `pnpm exec playwright test tests/e2e/assine-ja.spec.ts tests/e2e/shell.spec.ts` | ❌ created by task | ⬜ pending |
| 3-03-01 | 03 | 3 | ASS-03, ASS-04, D-05 | T-03-15 | exclusive end at SP midnight; renewal from max(now, end) | unit (TDD) | `pnpm exec vitest run tests/unit/periods.test.ts` | ❌ created by task | ⬜ pending |
| 3-03-02 | 03 | 3 | ASS-03, ASS-04 | T-03-06 | subscriber cannot read/write periods or own accessUntil; entitlement from periods only | int | `pnpm exec vitest run tests/int/subscriptions.int.test.ts` | ❌ created by task | ⬜ pending |
| 3-03-03 | 03 | 3 | ASS-03, ASS-04, D-01 | T-03-05 | expired/no-subscription HTML has no restricted marker | e2e | `pnpm exec playwright test tests/e2e/minha-assinatura.spec.ts` | ❌ created by task | ⬜ pending |
| 3-04-01 | 04 | 4 | PAINEL-08, D-06 | T-03-09, T-03-10 | audit append-only (REST create/update/delete 403); no secrets in details | unit + int | `pnpm exec vitest run tests/unit/audit-diff.test.ts tests/int/audit-log.int.test.ts` | ❌ created by task | ⬜ pending |
| 3-04-02 | 04 | 4 | PAINEL-05, D-05, D-06 | T-03-06, T-03-09 | endpoints staff-only; server recomputes dates | int | `pnpm exec vitest run tests/int/staff-actions.int.test.ts` | ❌ created by task | ⬜ pending |
| 3-04-03 | 04 | 4 | PAINEL-05, PAINEL-08 | — | — | e2e (desktop) | `pnpm exec playwright test tests/e2e/painel-assinatura.spec.ts --project=desktop` | ❌ created by task | ⬜ pending |
| 3-05-01 | 05 | 5 | ASS-01, ASS-02 (D-04 substitute), PAINEL-08 | T-03-04, T-03-11 | self change needs current password; other sessions revoked; current kept | int + e2e | `pnpm exec vitest run tests/int/passwords.int.test.ts && pnpm exec playwright test tests/e2e/senhas.spec.ts` | ❌ created by task | ⬜ pending |
| 3-05-02 | 05 | 5 | ASS-02 (D-04 substitute), PAINEL-08 | T-03-11, T-03-03 | link single-use, 48 h, staff-only; token never in audit | int + e2e | `pnpm exec vitest run tests/int/passwords.int.test.ts && pnpm exec playwright test tests/e2e/senhas.spec.ts` | ✅ (extended) | ⬜ pending |
| 3-06-01 | 06 | 6 | PAINEL-06 | — | dashboard only for staff | int + e2e (desktop) | `pnpm exec vitest run tests/int/expiring.int.test.ts && pnpm exec playwright test tests/e2e/vencimentos.spec.ts --project=desktop` | ❌ created by task | ⬜ pending |
| 3-06-02 | 06 | 6 | all | T-03-05, T-03-07, T-03-16, T-03-17 | anonymous/subscriber REST matrix; GraphQL disabled; subscriber cannot open /admin | e2e | `pnpm exec playwright test tests/e2e/assinantes-seguranca.spec.ts` | ❌ created by task | ⬜ pending |
| 3-07-01 | 07 | 7 | all | T-03-18 | runbook/guide present; staging smoke | unit | `pnpm exec vitest run tests/unit/deploy-files.test.ts` | ✅ (extended) | ⬜ pending |
| 3-07-02 | 07 | 7 | all | — | — | manual (client on staging) | checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers the phase (Vitest, Playwright, `tests/helpers/seed.ts`, isolated `paraiso_test`). Each slice's first task writes its own failing tests before implementation (Phase 2 convention). Helpers grow per slice: 03-01 adds `seedAssinante`, `createAssinante`, `loginAsAssinante`; 03-02 `seedPlan`/`createPlan`; 03-03 `seedSubscription`/`createSubscription`; 03-04 `liberar`/`encerrar`. RESET_ORDER gains the new collections children-first.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staff create a subscriber, liberar with payment, renovar, encerrar, read the log — alone | PAINEL-05, PAINEL-08 | real staff, real admin | Follow docs/painel/GUIA-DA-EQUIPE.md "Assinantes" on staging |
| Subscriber login on a real phone stays logged in after closing the browser | ASS-01 | device cookie behaviour | Log in on /entrar, close the browser, reopen /area-do-assinante the next day |
| Temporary password / link sent by WhatsApp works on the phone | ASS-02 substitute (D-04) | WhatsApp delivery | Staff generate a link, send it, subscriber sets a new password |
| PagBank links and durations | ASS-05, D-02, D-03 | client business decision (prices confirmed 2026-10-19) | Client pastes the four new PagBank links into the plans and checks that 'Pagar' appears; confirms durations 30/90/180/365 days |
| Expiry on the day | ASS-04 | real date passage | A test subscriber with 1-day access loses /area-do-assinante/exclusivo the next day at 00:00 Brasília |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (plan-phase orchestrator)
