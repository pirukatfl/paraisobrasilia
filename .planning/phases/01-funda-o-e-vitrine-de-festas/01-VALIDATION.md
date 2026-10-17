---
phase: 1
slug: funda-o-e-vitrine-de-festas
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (unit + Payload Local API integration), Playwright 1.64.1 (e2e, projects `mobile` Pixel 7 and `desktop`) |
| **Config file** | none yet — plan 01-03 Task 1 creates `vitest.config.mts` and `playwright.config.ts` |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test` (requires `docker compose up -d db`; uses database `paraiso_test`) |
| **Estimated runtime** | unit ~5 s; int ~20 s; e2e ~90 s per project |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit` plus the task's own `<automated>` command
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green, plus staging smoke (`E2E_BASE_URL=https://{staging} pnpm exec playwright test tests/e2e/staging-smoke.spec.ts`)
- **Max feedback latency:** 60 seconds for unit/int; e2e single-spec runs ~30-60 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PAINEL-01 | T-01-SC | Only human-approved packages installed | manual gate | — (checkpoint) | n/a | ⬜ pending |
| 1-01-02 | 01 | 1 | PAINEL-01 | T-01-01..04 | Login lockout, no self sign-up, secrets untracked, DB loopback | build | `pnpm typecheck && pnpm build` | ❌ (01-01 T2) | ⬜ pending |
| 1-02-01 | 02 | 1 | INST-04 | T-01-06 | No credentials in docs | doc check | `test -f docs/discovery/WORDPRESS.md && grep -q "Decreto 12.880/2026" docs/discovery/AGE-GATE-LEGAL.md` | ❌ (01-02) | ⬜ pending |
| 1-02-02 | 02 | 1 | INST-04 | T-01-08 | Dated legal status | manual gate | — (checkpoint) | n/a | ⬜ pending |
| 1-03-01 | 03 | 2 | FEST-01 | T-01-36 | resetDatabase refuses any DB other than paraiso_test | unit | `pnpm test:unit` | ❌ W0 (01-03 T1) | ⬜ pending |
| 1-03-02 | 03 | 2 | FEST-01 | — | N/A | e2e (red by design) | `pnpm exec playwright test tests/e2e/home.spec.ts --project=desktop` (fails only on the party link) | ❌ W0 (01-03 T2) | ⬜ pending |
| 1-04-01 | 04 | 3 | INST-05 | — | N/A | script + e2e written | `node scripts/brand/build-logo-assets.mjs` + size checks | ❌ (01-04 T1) | ⬜ pending |
| 1-04-02 | 04 | 3 | INST-05, FEST-01 | T-01-12..14 | Staging noindex meta, no stack traces | e2e | `pnpm exec playwright test tests/e2e/shell.spec.ts --project=mobile` | ❌ (01-04 T1) | ⬜ pending |
| 1-05-01 | 05 | 3 | FEST-04 | — | N/A | unit (tdd) | `pnpm exec vitest run tests/unit/visibility.test.ts` | ❌ (01-05 T1) | ⬜ pending |
| 1-05-02 | 05 | 3 | FEST-01, FEST-04 | T-01-09..11 | Image-only uploads, auth for writes | int | `pnpm exec vitest run tests/int/parties.int.test.ts tests/unit` | ❌ (01-05 T1) | ⬜ pending |
| 1-05-03 | 05 | 3 | FEST-01 | — | N/A | e2e | `pnpm exec playwright test tests/e2e/home.spec.ts` | ❌ W0 (01-03 T2) | ⬜ pending |
| 1-06-01 | 06 | 4 | INST-04 | T-01-16 | No redirect / UA sniffing | unit (tdd) | `pnpm exec vitest run tests/unit/age-gate.test.ts` | ❌ (01-06 T1) | ⬜ pending |
| 1-06-02 | 06 | 4 | INST-04 | T-01-15..17 | Full HTML served without cookie | e2e | `pnpm exec playwright test tests/e2e/age-gate.spec.ts` | ❌ (01-06 T1) | ⬜ pending |
| 1-07-01 | 07 | 4 | FEST-02 | — | N/A | unit (tdd) | `pnpm exec vitest run tests/unit/date.test.ts` | ❌ (01-07 T1) | ⬜ pending |
| 1-07-02 | 07 | 4 | FEST-02, FEST-01 | T-01-18..20 | Escaped rich text; unknown slug 404 | e2e | `pnpm exec playwright test tests/e2e/party.spec.ts tests/e2e/home.spec.ts` | ❌ (01-07 T1) | ⬜ pending |
| 1-08-01 | 08 | 5 | FEST-03, INST-05 | — | N/A | unit (tdd) | `pnpm exec vitest run tests/unit/metadata.test.ts` | ❌ (01-08 T1) | ⬜ pending |
| 1-08-02 | 08 | 5 | FEST-03, INST-05 | T-01-21..24 | X-Robots-Tag noindex on staging; OG image public JPEG ≤ 300 KB | e2e | `pnpm exec playwright test tests/e2e/seo.spec.ts` | ❌ (01-08 T1) | ⬜ pending |
| 1-09-01 | 09 | 6 | PAINEL-01, FEST-04 | T-01-25, T-01-26 | Anonymous sees only published; anonymous writes forbidden | int (tdd) | `pnpm exec vitest run tests/int/parties-access.int.test.ts tests/int/parties.int.test.ts` | ❌ (01-09 T1) | ⬜ pending |
| 1-09-02 | 09 | 6 | PAINEL-01 | T-01-27, T-01-28 | Revalidation only on staff mutations | e2e | `pnpm exec playwright test tests/e2e/admin-party.spec.ts --project=desktop` | ❌ (01-09 T1) | ⬜ pending |
| 1-10-01 | 10 | 7 | all | — | N/A | manual gate | — (checkpoint: VPS/DNS) | n/a | ⬜ pending |
| 1-10-02 | 10 | 7 | all | T-01-29..35 | DB port closed, HTTPS, noindex, drafts hidden on staging | build + remote e2e | `docker build --target runner . && E2E_BASE_URL=https://$STAGING_DOMAIN pnpm exec playwright test tests/e2e/staging-smoke.spec.ts --project=mobile` | ❌ (01-10 T2) | ⬜ pending |
| 1-10-03 | 10 | 7 | FEST-03, PAINEL-01 | — | N/A | manual | — (checkpoint: WhatsApp + staff usability) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.mts`, `playwright.config.ts` — plan 01-03
- [ ] `tests/helpers/seed.ts` (resetDatabase, seedStaffUser, seedParty) and `tests/e2e/global-setup.ts` — plan 01-03 (seedParty completed in 01-05, extended in 01-07)
- [ ] `tests/fixtures/flyer-portrait.jpg`, `tests/fixtures/flyer-square.jpg` — plan 01-03
- [ ] `tests/e2e/home.spec.ts` (FEST-01 happy path, red until 01-05) — plan 01-03
- [ ] Database `paraiso_test` via `docker/initdb/01-test-db.sql` — plan 01-01 Task 2
- Every later plan writes its own failing test in its first task before implementation (MVP test-first order).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WhatsApp / Instagram link preview shows flyer + title | FEST-03 | Preview is rendered by Meta's scrapers and apps; cannot be automated reliably | Plan 01-10 Task 3 step 2 (real phone, staging URL) |
| Staff publishes, edits, unpublishes without help | PAINEL-01 | "Sem ajuda técnica" is a usability outcome with a real staff member | Plan 01-10 Task 3 step 3 |
| Visual feel matches D-04 (escuro, elegante, sem neon), logo sharp | FEST-01 (presentation) | Subjective brand judgement | Plan 01-10 Task 3 step 4 |
| Legal opinion on age gate | INST-04 | Requires a lawyer | Plan 01-02 Task 2 (status recorded; answer gates Phase 7) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are checkpoints
- [x] Sampling continuity: no 3 consecutive implementation tasks without automated verify
- [x] Wave 0 covers all MISSING references (each later test file is created in the first task of its own plan)
- [x] No watch-mode flags (`vitest run`, `playwright test`)
- [x] Feedback latency < 60 s for unit/int
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-17 (plan-phase orchestrator)
