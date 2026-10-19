---
phase: 4
slug: classisex-e-pr-vias-de-perfis
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. "Perfis" in ROADMAP/REQUIREMENTS = "anúncios" (04-CONTEXT D-01).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (unit + int against paraiso_test), Playwright 1.64.1 (mobile + desktop projects; Chromium from /opt/pw-browsers via `PW_CHROMIUM_PATH`, never `playwright install`; no H.264 codec → video checked by status/headers/ranges) |
| **Config file** | vitest.config.mts, playwright.config.ts (existing) |
| **Quick run command** | `pnpm exec vitest run tests/unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~20 s quick; ~9–11 min full |

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
| 4-01-01 | 01 | 1 | PREV-01, D-04 | T-04-01 | phones/e-mails/links/@ replaced; short numbers kept; idempotent | unit (TDD) | `pnpm exec vitest run tests/unit/redact-contacts.test.ts` | ❌ created by task | ⬜ pending |
| 4-01-02 | 01 | 1 | CLAS-03, CLAS-06, D-01 | T-04-06, T-04-18 | duration ≤ 60 s readable; location boxes zero-filled; bounded parser | unit (TDD) | `pnpm exec vitest run tests/unit/mp4.test.ts` | ❌ created by task | ⬜ pending |
| 4-02-01 | 02 | 1 | CLAS-03, CLAS-04, D-01 | T-04-04, T-04-20 | /api/ads staff-only; field rules; Eu sou in use not deletable; account deletion cascades | unit + int | `pnpm exec vitest run tests/unit/ad-rules.test.ts tests/int/ads.int.test.ts` | ❌ created by task | ⬜ pending |
| 4-02-02 | 02 | 1 | CLAS-03, CLAS-04, D-02, D-03 | T-04-04, T-04-05 | owner-only writes, 3 active, every write → pendente, inactive cannot create/edit | int + e2e | `pnpm exec vitest run tests/int/ads.int.test.ts && pnpm exec playwright test tests/e2e/meus-anuncios.spec.ts` | ❌ created by task | ⬜ pending |
| 4-03-01 | 03 | 2 | PAINEL-07, CLAS-04, D-03 | T-04-04, T-04-13 | moderation endpoints staff-only; audit rows; motivo required | int | `pnpm exec vitest run tests/int/ad-moderation.int.test.ts` | ❌ created by task | ⬜ pending |
| 4-03-02 | 03 | 2 | PAINEL-07 | T-04-01 | panel shows the redacted public text before approval | e2e (desktop) | `pnpm exec playwright test tests/e2e/moderacao.spec.ts --project=desktop` | ❌ created by task | ⬜ pending |
| 4-04-01 | 04 | 3 | CLAS-01, CLAS-02, D-06, D-07 | T-04-14, T-04-22 | visible = aprovado AND author active (midnight edge); DTO without author/filenames | unit + int | `pnpm exec vitest run tests/unit/ad-dto.test.ts tests/int/ad-visibility.int.test.ts` | ❌ created by task | ⬜ pending |
| 4-04-02 | 04 | 3 | CLAS-01, CLAS-02, D-05 | T-04-05, T-03-05 | inactive viewers get no ad/contact markup; no-store + noindex | e2e | `pnpm exec playwright test tests/e2e/classisex-assinante.spec.ts tests/e2e/minha-assinatura.spec.ts` | ❌ created by task | ⬜ pending |
| 4-05-01 | 05 | 4 | CLAS-06 | T-04-03, T-04-09, T-04-16 | private dir outside MEDIA_DIR/public; own volume; Caddy cap; uploads refused without config | unit | `pnpm exec vitest run tests/unit/private-storage.test.ts tests/unit/deploy-files.test.ts` | ❌ created by task (deploy-files ✅ extended) | ⬜ pending |
| 4-05-02 | 05 | 4 | CLAS-06, CLAS-03, D-01, D-04 | T-04-02, T-04-06, T-04-10, T-04-11 | ad-media read staff-only; EXIF/MP4 scrub; limits; irreversible blur | unit + int | `pnpm exec vitest run tests/unit/blur.test.ts tests/int/ad-media.int.test.ts` | ❌ created by task | ⬜ pending |
| 4-05-03 | 05 | 4 | CLAS-06, D-05 | T-04-02, T-04-05, T-04-08 | protected route: staff/owner/active+visible only; ranges; private headers | unit + e2e | `pnpm exec vitest run tests/unit/range.test.ts tests/unit/media-access.test.ts && pnpm exec playwright test tests/e2e/midia-protegida.spec.ts` | ❌ created by task | ⬜ pending |
| 4-06-01 | 06 | 5 | CLAS-03, D-01, D-03 | T-04-04, T-04-15, T-04-09 | upload only into own ad; cross-origin POST anonymous; size checked before parsing | int + e2e | `pnpm exec vitest run tests/int/ad-media.int.test.ts && pnpm exec playwright test tests/e2e/anuncio-midia.spec.ts` | ✅ (extended) / ❌ spec created | ⬜ pending |
| 4-06-02 | 06 | 5 | CLAS-01, CLAS-02 | T-04-07, T-04-05 | media only through /area-do-assinante/midia; no next/image | unit + e2e | `pnpm exec vitest run tests/unit/ad-dto.test.ts && pnpm exec playwright test tests/e2e/anuncio-midia.spec.ts` | ✅ (extended) | ⬜ pending |
| 4-07-01 | 07 | 6 | PREV-01, D-04, D-06 | T-04-01, T-04-11, T-04-14 | public DTO without contacts/author; blur route only for visible photos; cache expiry on subscription changes | unit + int | `pnpm exec vitest run tests/unit/public-ad-dto.test.ts tests/int/ad-visibility.int.test.ts` | ❌ created by task | ⬜ pending |
| 4-07-02 | 07 | 6 | PREV-01, D-04, D-07 | T-04-01 | raw HTML/RSC without contacts; Assine CTA; nav/sitemap | unit + e2e | `pnpm exec vitest run tests/unit/sitemap.test.ts && pnpm exec playwright test tests/e2e/classisex-publico.spec.ts tests/e2e/shell.spec.ts` | ❌ created by task | ⬜ pending |
| 4-08-01 | 08 | 7 | CLAS-05, D-08 | T-04-12, T-04-24, T-04-13 | reports staff-only; dedupe; 10/day; resolutions audited; survive deletions | int | `pnpm exec vitest run tests/int/ad-reports.int.test.ts` | ❌ created by task | ⬜ pending |
| 4-08-02 | 08 | 7 | CLAS-05, PAINEL-07 | T-04-17 | urgent reports first; unpublish closes all open reports | e2e | `pnpm exec playwright test tests/e2e/denuncia.spec.ts` | ❌ created by task | ⬜ pending |
| 4-09-01 | 09 | 8 | CLAS-06 | T-04-02, T-04-03, T-04-07, T-04-24 | file/API matrix for anonymous, expired, viewer, owner, staff | e2e | `pnpm exec playwright test tests/e2e/classisex-seguranca.spec.ts` | ❌ created by task | ⬜ pending |
| 4-09-02 | 09 | 8 | PREV-01, CLAS-06 | T-04-01, T-04-08 | page/RSC/header matrix | e2e | `pnpm exec playwright test tests/e2e/classisex-seguranca.spec.ts` | ✅ (extended) | ⬜ pending |
| 4-10-01 | 10 | 9 | all | T-04-16 | guide/runbook present; staging smoke | unit | `pnpm exec vitest run tests/unit/deploy-files.test.ts` | ✅ (extended) | ⬜ pending |
| 4-10-02 | 10 | 9 | CLAS-06 | T-04-16 | private_media volume on the VPS | manual (client terminal) | checkpoint | n/a | ⬜ pending |
| 4-10-03 | 10 | 9 | all | — | — | manual (client on staging) | checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers the phase (Vitest, Playwright, `tests/helpers/seed.ts`, isolated `paraiso_test`, staff REST helpers). Each slice's first task writes its own failing tests before implementation (Phase 2/3 convention). Helpers grow per slice: 04-01 `buildMp4` (tests/helpers/mp4-fixtures.ts); 04-02 `seedAdCategories`, `seedAd`, `createAd`/`updateAd`/`findAdCategories`, RESET_ORDER prefix `ad-reports, ad-media, ads, ad-categories`, global setup seeds Eu sou; 04-03 `aprovar`/`recusar`/`despublicar`; 04-04 `seedVisibleAd`; 04-05 `seedAdMedia`, `uploadAdMedia`, global setup clears `./private-media`; 04-08 `resolverDenuncia`, `findReports`; 04-09 `buildClassisexScenario`, `fetchAs`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Video recorded on a real iPhone/Android plays for another subscriber | CLAS-02, D-01 | test Chromium has no H.264/HEVC; no transcoding in this phase | 04-10 Task 3 step 3 |
| Copied photo address does not open in a fresh private window / other browser | CLAS-06 | real browser cookie behaviour | 04-10 Task 3 step 5 |
| Public /classisex on a phone shows no contact, only blurred photos | PREV-01, D-04 | visual check of blur strength | 04-10 Task 3 step 4 |
| Staff moderate and resolve reports alone with the guide | PAINEL-07, D-08 | real staff, real admin | 04-10 Task 3 steps 2 and 6 |
| private_media volume exists on the VPS | CLAS-06 | no SSH from our environment | 04-10 Task 2 |
| Ads hide at midnight when a subscription expires | D-06 | real date passage | test subscriber with 1-day access: the next day after 00:10 Brasília their ads are gone from both lists |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (plan-phase orchestrator)
