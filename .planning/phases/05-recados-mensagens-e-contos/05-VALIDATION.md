---
phase: 5
slug: recados-mensagens-e-contos
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Tests never use the real WordPress dump; the import is proven on tests/fixtures/wp-contos-mini.sql and run on the real dump only by the orchestrator (05-04 Task 3).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (unit + int against paraiso_test), Playwright 1.64.1 (mobile + desktop projects; Chromium from /opt/pw-browsers via `PW_CHROMIUM_PATH`, never `playwright install`) |
| **Config file** | vitest.config.mts, playwright.config.ts (existing) |
| **Quick run command** | `pnpm exec vitest run tests/unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~25 s quick; ~12–15 min full |

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
| 5-01-01 | 01 | 1 | PAINEL-03, D-03 | T-05-14, T-05-15, T-05-16 | wanted tables only; chunk-safe escapes; no author data | unit (TDD) | `pnpm exec vitest run tests/unit/wp-dump.test.ts` | ❌ created by task | ⬜ pending |
| 5-01-02 | 01 | 1 | PAINEL-03, D-03 | T-05-13 | text-only Lexical nodes; scripts/shortcodes/Elementor removed | unit (TDD) | `pnpm exec vitest run tests/unit/html-to-lexical.test.ts` | ❌ created by task | ⬜ pending |
| 5-02-01 | 02 | 1 | PAINEL-03, PREV-03 | T-05-01, T-05-20 | split leaves ≥ 1 block; /api/contos (+versions/drafts) staff-only | unit + int | `pnpm exec vitest run tests/unit/conto-excerpt.test.ts tests/int/contos.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-02-02 | 02 | 1 | PAINEL-03 | T-05-20 | admin preview equals the public rule | e2e (desktop) | `pnpm exec playwright test tests/e2e/painel-contos.spec.ts --project=desktop` | ❌ created by task | ⬜ pending |
| 5-03-01 | 03 | 2 | PREV-03 | T-05-01 | public DTO without restricted blocks; members reads never cached | unit + int | `pnpm exec vitest run tests/unit/conto-dto.test.ts tests/int/contos-reads.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-03-02 | 03 | 2 | PREV-03, PREV-04 | T-05-01, T-05-06, T-05-22 | sentinel absent from public HTML/RSC/meta; members guard; noindex | unit + e2e | `pnpm exec vitest run tests/unit/sitemap.test.ts && pnpm exec playwright test tests/e2e/contos.spec.ts tests/e2e/shell.spec.ts` | ❌ created by task (sitemap/shell ✅ extended) | ⬜ pending |
| 5-04-01 | 04 | 3 | PAINEL-03, D-03 | T-05-14, T-05-15, T-05-23 | bylines/contacts stripped; report without text; idempotent; staff edits kept | unit + int | `pnpm exec vitest run tests/unit/contos-import.test.ts tests/int/contos-import.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-04-02 | 04 | 3 | PAINEL-03 | T-05-15 | CLI dry-run writes nothing; export refused inside repo; bundle loader idempotent | int | `pnpm exec vitest run tests/int/contos-import.int.test.ts` | ✅ (extended) | ⬜ pending |
| 5-04-03 | 04 | 3 | PAINEL-03 | T-05-14, T-05-24 | real-dump run + carrier decision | manual (ORCHESTRATOR) | checkpoint | n/a | ⬜ pending |
| 5-05-01 | 05 | 4 | REC-01, D-01 | T-05-03, T-05-04, T-05-12 | contacts never stored; /api/recados staff-only; cascade; expiry hides | unit + int | `pnpm exec vitest run tests/unit/recado-rules.test.ts tests/int/recados.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-05-02 | 05 | 4 | REC-01, D-01 | T-05-02, T-05-04, T-05-25 | board only for active; 3 active; owner-only delete; REST 403 in-page | int + e2e | `pnpm exec vitest run tests/int/recados.int.test.ts && pnpm exec playwright test tests/e2e/recados.spec.ts` | ❌ created by task | ⬜ pending |
| 5-06-01 | 06 | 5 | REC-04 | T-05-04, T-05-11, T-05-26 | moderation endpoints staff-only; audit; status not editable outside the service | int | `pnpm exec vitest run tests/int/recados-moderation.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-06-02 | 06 | 5 | REC-04 | T-05-26 | panel shows members' view; Salvar after Aprovar keeps status | e2e (desktop) | `pnpm exec playwright test tests/e2e/moderacao-recados.spec.ts --project=desktop` | ❌ created by task | ⬜ pending |
| 5-07-01 | 07 | 6 | PREV-02, D-05 | T-05-03, T-05-19 | teaser without apelido/id/contact | unit + int | `pnpm exec vitest run tests/unit/recado-teaser.test.ts tests/int/recados.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-07-02 | 07 | 6 | PREV-02, PREV-04 | T-05-19, T-05-27 | /recados HTML/RSC clean; Assine Já on every preview | unit + e2e | `pnpm exec vitest run tests/unit/sitemap.test.ts && pnpm exec playwright test tests/e2e/previas.spec.ts tests/e2e/shell.spec.ts` | ❌ created by task | ⬜ pending |
| 5-08-01 | 08 | 7 | REC-02 | T-05-09, T-05-12 | conversations/messages closed to REST for everybody; cascade | unit + int | `pnpm exec vitest run tests/unit/mensagens-rules.test.ts tests/int/mensagens.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-08-02 | 08 | 7 | REC-02, D-04 | T-05-05, T-05-06, T-05-08, T-05-10 | participant-only; both active; limits; recipient derived server-side; unread count | int | `pnpm exec vitest run tests/int/mensagens.int.test.ts` | ✅ (extended) | ⬜ pending |
| 5-09-01 | 09 | 8 | REC-02, D-02 | T-05-05, T-05-06, T-05-10 | compose/inbox/thread guarded; third party 404; no own-content button | e2e | `pnpm exec playwright test tests/e2e/mensagens.spec.ts` | ❌ created by task | ⬜ pending |
| 5-09-02 | 09 | 8 | D-04 | T-05-18 | unread route private/no-store/401; badge clears on client navigation | e2e | `pnpm exec playwright test tests/e2e/mensagens.spec.ts tests/e2e/minha-assinatura.spec.ts` | ✅ (extended) | ⬜ pending |
| 5-10-01 | 10 | 9 | REC-03 | T-05-07, T-05-09, T-05-29 | blocks both ways; suspension; reports staff-only with snapshot | int | `pnpm exec vitest run tests/int/mensagens-seguranca.int.test.ts` | ❌ created by task | ⬜ pending |
| 5-10-02 | 10 | 9 | REC-03 | T-05-07, T-05-11, T-05-28 | block/report UI; staff resolve/suspend audited; no admin entries for private collections | e2e | `pnpm exec playwright test tests/e2e/bloqueio-denuncia.spec.ts` | ❌ created by task | ⬜ pending |
| 5-11-01 | 11 | 10 | REC-01..04 | T-05-02, T-05-05, T-05-07, T-05-09, T-05-17 | matrix: pages, RSC, REST, action replay, Origin, headers | e2e | `pnpm exec playwright test tests/e2e/fase5-seguranca.spec.ts --project=desktop` | ❌ created by task | ⬜ pending |
| 5-11-02 | 11 | 10 | PREV-02..04 | T-05-01, T-05-19 | contos/previews matrix; sitemap; expiry | e2e | `pnpm exec playwright test tests/e2e/fase5-seguranca.spec.ts` | ✅ (extended) | ⬜ pending |
| 5-12-01 | 12 | 11 | all | T-05-30 | guide/runbook present; staging smoke | unit | `pnpm exec vitest run tests/unit/deploy-files.test.ts` | ✅ (extended) | ⬜ pending |
| 5-12-02 | 12 | 11 | all | T-05-31 | — | manual (client on staging) | checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers the phase (Vitest, Playwright, `tests/helpers/seed.ts`, isolated `paraiso_test`, staff REST helpers, `fetchAs`). Each slice's first task writes its own failing tests before implementation (Phase 2–4 convention). Helpers grow per slice: 05-01 `tests/fixtures/wp-contos-mini.sql` (plain text) + `tests/helpers/wp-dump-fixture.ts`; 05-02 `seedConto`, `lexicalParagraphs`, RESET_ORDER `contos`; 05-03 `createConto`/`updateConto` (staff REST); 05-05 `seedRecado`, `seedVisibleRecado`, `setRecadoStatus`, RESET_ORDER `recados`; 05-06 `aprovarRecado`/`recusarRecado`/`despublicarRecado`; 05-08 `seedConversation`, `seedMessage`, RESET_ORDER `messages`, `conversations`; 05-10 `seedBlock`, `resolverDenunciaMensagem`, RESET_ORDER `message-reports`, `blocks`; 05-11 `buildFase5Scenario`, `SENTINELS`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Import of the real 50 contos (counts, flags, carrier decision) | PAINEL-03, D-03 | real dump lives outside git; only the orchestrator may read it | 05-04 Task 3 |
| Two real phones exchange messages; unread number appears and clears | REC-02, D-04 | real devices and sessions | 05-12 Task 2 step 3 |
| Staff moderate recados, resolve a message report and publish a conto alone with the guide | REC-04, REC-03, PAINEL-03 | real staff, real admin | 05-12 Task 2 steps 2, 4, 6 |
| Imported contos read naturally (bylines/contacts gone, excerpt sensible) | PREV-03, D-03 | editorial judgement | 05-04 Task 3 step 3 and 05-12 Task 2 step 7 |
| Recados of an expired author disappear at midnight | D-01 | real date passage | test subscriber with 1-day access: the next day after 00:10 Brasília their recado is gone from the board and /recados |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (plan-phase orchestrator)
