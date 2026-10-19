---
phase: 2
slug: site-aberto-completo-e-m-dia
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (unit + int against paraiso_test), Playwright 1.64.1 (mobile + desktop projects) |
| **Config file** | vitest.config.mts, playwright.config.ts (existing) |
| **Quick run command** | `pnpm exec vitest run tests/unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 s quick; ~4–6 min full |

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
| 2-01-01 | 01 | 1 | INST-02, INST-03, PAINEL-04 | T-02-01, T-02-02 | anonymous can read but not update `contact`; whatsapp/instagram/lat/lng validated | unit + int | `pnpm exec vitest run tests/unit/contact-links.test.ts tests/int/contact.int.test.ts` | ❌ created by task | ⬜ pending |
| 2-01-02 | 01 | 1 | INST-02, INST-03 | T-02-03 | outbound links `rel="noopener noreferrer"`; iframe only openstreetmap.org | e2e | `pnpm exec playwright test tests/e2e/contato.spec.ts tests/e2e/shell.spec.ts` | ❌ created by task | ⬜ pending |
| 2-02-01 | 02 | 2 | INST-01, INST-06, PAINEL-04 | T-02-04 | drafts of pages invisible to anonymous; seed idempotent | unit + int | `pnpm exec vitest run tests/unit/pages-seed.test.ts tests/int/pages.int.test.ts` | ❌ created by task | ⬜ pending |
| 2-02-02 | 02 | 2 | INST-01, INST-06 | — | — | e2e | `pnpm exec playwright test tests/e2e/institucional.spec.ts` | ❌ created by task | ⬜ pending |
| 2-03-01 | 03 | 3 | MIDIA-01, PAINEL-02 | T-02-05, T-02-06, T-02-07 | drafts hidden; authorization note staff-only; mp4 only; video 206 | int | `pnpm exec vitest run tests/int/space-gallery.int.test.ts` | ❌ created by task | ⬜ pending |
| 2-03-02 | 03 | 3 | MIDIA-01, MIDIA-03 | T-02-08 | fallback route rejects traversal (if built) | e2e | `pnpm exec playwright test tests/e2e/espaco.spec.ts` | ❌ created by task | ⬜ pending |
| 2-04-01 | 04 | 4 | MIDIA-02, PAINEL-02 | T-02-06 | 4th photo rejected; publish without authorization allowed; note not in REST | int | `pnpm exec vitest run tests/int/models.int.test.ts` | ❌ created by task | ⬜ pending |
| 2-04-02 | 04 | 4 | MIDIA-02 | — | — | e2e | `pnpm exec playwright test tests/e2e/modelos.spec.ts` | ❌ created by task | ⬜ pending |
| 2-05-01 | 05 | 5 | MIDIA-03, INST-01, INST-02 | — | — | e2e | `pnpm exec playwright test tests/e2e/home-sem-festas.spec.ts tests/e2e/home.spec.ts` | ❌ created by task | ⬜ pending |
| 2-05-02 | 05 | 5 | MIDIA-03, INST-06 | — | sitemap lists only public routes | unit + e2e | `pnpm exec vitest run tests/unit/sitemap.test.ts && pnpm exec playwright test tests/e2e/perf-galeria.spec.ts tests/e2e/seo.spec.ts --project=mobile` | ❌ created by task | ⬜ pending |
| 2-06-01 | 06 | 6 | all | T-02-09 | runbook covers removal + disk | unit | `pnpm exec vitest run tests/unit/deploy-files.test.ts` | ✅ (extended) | ⬜ pending |
| 2-06-02 | 06 | 6 | all | — | — | manual (client on staging) | checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (Vitest, Playwright, `tests/helpers/seed.ts`, isolated `paraiso_test`). Each slice's first task writes its own failing tests before implementation; `tests/helpers/seed.ts` RESET_ORDER is extended per slice. A small SFW test video fixture (`tests/fixtures/espaco.mp4`, ≤ 300 KB, generated once with ffmpeg if available, else committed from a synthetic source) is created in plan 02-03 Task 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pages, map and buttons on staging phone | INST-01..03, INST-06 | our environment cannot reach staging | Client opens https://novo.swingbrasilia.com.br on a phone: menu → Quem Somos/Normas/Regras/Dicas, Espaço, Contato; taps Como chegar (Google Maps, Waze) and WhatsApp |
| Staff uploads photo + video and edits texts alone | PAINEL-02, PAINEL-04 | real staff, real admin | Staff adds a space photo and a video with poster, fills (or skips) Autorização, edits the Regras page and the address, then sees the changes on the site |
| Map pin position | INST-02 (D-02) | needs local knowledge | Client confirms the pin; if wrong, edits lat/lng in "Contato e endereço" |
| Video plays and seeks on iPhone | MIDIA-01/03 | device-specific | Play the uploaded video on an iPhone, drag the progress bar |
| Client reviews revised texts | D-05 | content approval | Client reads 02-CONTENT.md / the pages and edits in the panel |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-19 (plan-phase orchestrator)
