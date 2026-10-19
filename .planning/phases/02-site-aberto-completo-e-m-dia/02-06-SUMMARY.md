---
phase: 02-site-aberto-completo-e-m-dia
plan: 06
subsystem: deploy
tags: [staging, runbook, staff-guide, smoke-test, ghcr, checkpoint]
status: awaiting-client-check

# Dependency graph
requires:
  - phase: 02-05
    provides: complete open area, DB-less build, full suite green
  - phase: 01-10
    provides: pull-based deploy (GitHub Actions → GHCR → VPS timer → migrate → app)
provides:
  - docs/deploy/STAGING.md §7.1 (videos in /app/media/videos, 100 MB / 15 MB caps, df -h + docker system df, snapshots) and §4 note (seeds only when missing)
  - docs/painel/GUIA-DA-EQUIPE.md (pt staff guide incl. "Remoção de imagem" with Excluir within 24 h)
  - tests/unit/deploy-files.test.ts guards for both docs and the media volume mount
  - tests/e2e/staging-smoke.spec.ts: Phase 2 pages 200 + H1, /contato WhatsApp link; home H1 with or without parties
  - Phase 2 pushed to main: 93fcccdd170f91abdc82f4e24afba7078d47d311, deploy-staging run 39198530631 green
affects: [phase 7 (backups, legal review before production)]

tech-stack:
  added: []
  patterns:
    - "Admin e2e that re-publish wait for the PATCH response, not for a status text already on screen"

key-files:
  created:
    - docs/painel/GUIA-DA-EQUIPE.md
    - docs/screens/home-sem-festas-mobile-390.png
    - docs/screens/contato-mobile-390.png
    - docs/screens/quem-somos-mobile-390.png
    - docs/screens/regras-mobile-390.png
    - docs/screens/espaco-vazio-mobile-390.png
  modified:
    - docs/deploy/STAGING.md
    - tests/unit/deploy-files.test.ts
    - tests/e2e/staging-smoke.spec.ts
    - tests/e2e/admin-party.spec.ts
    - tests/e2e/institucional.spec.ts

key-decisions:
  - "Staging smoke matches the stable word of CMS titles (/Regras/i …) so staff edits do not break it"
  - "Guide: Excluir the Mídia/Vídeo file first (Despublicar keeps the file), then the gallery/model entry"

requirements-completed: []  # MIDIA-01..03, INST-01/02/03/06, PAINEL-02/04 are code-complete in 02-01..02-05; the client check (Task 2) is still open

# Metrics
duration: 35min
completed: null  # Task 2 (client checkpoint) pending
---

# Phase 2 Plan 06: Staging hand-off Summary

**Phase 2 is on `main` and the staging images are built (run 39198530631 green); the runbook covers videos and disk space, the team has a Portuguese guide for photos, videos, models, texts, contact and image-removal requests, and the read-only staging smoke test now covers every new page. The client check on a phone (Task 2) has not happened yet.**

## Performance

- **Duration:** ~35 min (Task 1, incl. screenshots and two e2e race fixes)
- **Started:** 2026-10-19T03:46:00Z
- **Task 1 completed:** 2026-10-19T04:18:00Z
- **Tasks:** 1 of 2 (Task 2 is a blocking human checkpoint)

## Accomplishments

- **Runbook (docs/deploy/STAGING.md):** the `media` volume row now mentions models and videos; new §7.1 "Vídeos e espaço em disco": `/app/media/videos`, video ≤ **100 MB** / photo ≤ 15 MB, export as MP4 H.264 720p ~2 min, `df -h /` and `docker system df -v | grep media`, warn at ~80% disk, Hostinger snapshots include the volume. §4 notes that the Phase 2 migrations seed Contato and the six texts **only when missing**. §9 lists the new smoke checks.
- **Staff guide (docs/painel/GUIA-DA-EQUIPE.md):** Publicar / Salvar rascunho / Despublicar / Excluir; Fotos e vídeos do espaço (alt text, required capa for videos, optional authorization); Modelos (1–3 photos, 4th rejected, menu appears only when published); Textos (drafts, Versões, [VALIDAR] markers for the lawyer, updates never overwrite edits); Contato e endereço (incl. fixing the map pin from Google Maps right-click → Latitude/Longitude); Remoção de imagem (channels, confirmation, "na dúvida, remova", note in Observação if the item stays, **Excluir** the file — Despublicar is not enough — then the entry, check on the phone, reply).
- **Smoke test:** `/quem-somos`, `/quem-somos/{normas,regras,dicas}`, `/termos-de-uso`, `/politica-de-privacidade`, `/contato`, `/espaco` → 200 with their H1; `/contato` main has `https://wa.me/5561999889772`. The Phase 1 age-gate check expected H1 "Próximas festas", which is wrong since 02-05 when no party is published; it now accepts "Paraíso Brasília" as well (staging likely has no upcoming party).
- **Dry run:** the smoke spec (all but the 5432 check, which is meaningless on a dev box with Postgres) passed against a local **production** build (`next start`, SITE_ENV=staging) on a **fresh database migrated from scratch by the CLI** (all 8 migrations + seeds) — the same path the VPS `migrate` image takes.
- **Screenshots (390 px, full page, production build, empty data):** docs/screens/home-sem-festas-mobile-390.png, contato-mobile-390.png, quem-somos-mobile-390.png, regras-mobile-390.png, espaco-vazio-mobile-390.png. The map on contato shows a grey placeholder because our sandbox cannot reach openstreetmap.org; on a phone the map loads.

## Deploy

| Item | Value |
|---|---|
| Pushed | `git push github master:main` — `e40db7d..93fcccd` |
| Commit | 93fcccdd170f91abdc82f4e24afba7078d47d311 (`git ls-remote github refs/heads/main` matches local HEAD) |
| Workflow | deploy-staging run **39198530631** — success (images job 2m39s: migrate + runner images pushed, staging tags moved) |
| VPS | the `paraiso-update.timer` pulls within ~5 min and runs `migrate` (contact_global, pages + seed, space_gallery, models) before restarting the app — **not observable from here** (egress proxy blocks the host) |

## Task Commits

1. **Screenshots** - `682eae0` (docs)
2. **Task 1: runbook, staff guide, smoke checks (+ e2e race fixes)** - `93fcccd` (docs)
3. **Task 2: client check** - pending

## Verification

| Check | Result |
|---|---|
| `pnpm exec vitest run tests/unit/deploy-files.test.ts` | 9 passed |
| GUIA-DA-EQUIPE.md contains `Remoção de imagem` and `Excluir` | PASS |
| STAGING.md contains `/app/media/videos` and `df -h` | PASS |
| `pnpm test` | vitest 15 files / 65 tests; playwright 70 passed, 26 skipped (project-specific and staging-only) |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| `pnpm build` without .env/DATABASE_URI | exit 0 |
| `E2E_BASE_URL=http://localhost:3002 playwright test staging-smoke.spec.ts --project=mobile --grep-invert 5432` (production build, fresh migrated DB) | 6 passed |
| github/main == local HEAD | PASS (93fcccd) |
| `gh run watch 39198530631 --exit-status` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Staging smoke expected H1 "Próximas festas" on the home**
- **Found during:** Task 1 (reading the spec before extending it)
- **Issue:** since 02-05 the home H1 is "Paraíso Brasília" when no party is published; the smoke would fail on an empty staging.
- **Fix:** accept either heading. **Committed in:** 93fcccd

**2. [Rule 1 - Bug] Re-publish race in two admin e2e specs (admin-party from Phase 1, institucional from 02-02)**
- **Found during:** full `pnpm test` before the push (desktop project; reproducible around midnight load)
- **Issue:** after a second "Publicar alterações", "Status: Publicado" is already visible, so the spec checked the public page before the save (and the cache expiry) finished.
- **Fix:** wait for the `PATCH /api/{parties|pages}/{id}` response before checking the site. Each spec then passed 3 runs in a row; full suite green.
- **Committed in:** 93fcccd

**3. Staging smoke H1 matchers are partial (/Regras/i, …)** — the institutional titles are editable by staff; an exact seed title would break the smoke after the first edit.

---

**Total deviations:** 3 (2 test bugs fixed, 1 test design note). **Impact:** none on the site; the smoke test now matches Phase 2 behaviour.

## Task 2 — client checkpoint (BLOCKING, pending)

Not executed: our environment cannot reach https://novo.swingbrasilia.com.br. To send to the client (from 02-06-PLAN Task 2):

1. On a phone: https://novo.swingbrasilia.com.br → confirm 18+ → "Menu": Festas, Quem somos (Normas, Regras, Dicas), Espaço, Contato.
2. Read Quem somos, Normas, Regras, Dicas — tone OK? Days/audiences (sexta só casais e mulheres; homens só com reserva) and 22h–5h still right?
3. Contato: map pin at the gate? "Como chegar — Google Maps", "— Waze", "Chamar no WhatsApp".
4. Footer: Termos de Uso and Política de Privacidade → forward to the lawyer ([VALIDAR …] markers).
5. Staff alone, with docs/painel/GUIA-DA-EQUIPE.md: 2 photos + 1 short MP4 with capa in "Galeria do espaço" → /espaco, play/seek; a model with 1–3 photos (4th → error) → "Modelos" in the menu; edit Regras and the address detail → change live.
6. Remove the test model with Excluir → gone from the site.

Also: run the staging smoke from a network that reaches the host:
`E2E_BASE_URL=https://novo.swingbrasilia.com.br pnpm exec playwright test tests/e2e/staging-smoke.spec.ts --project=mobile`

**Open questions for the client:** Instagram handle; razão social, CNPJ and DPO (and a privacy e-mail?); lawyer review of Termos/Política; WordPress `wp-content/uploads` backup for the space/model photos (D-07); review of the texts merged from the WordPress originals (02-02-SUMMARY table); map pin and days/hours above.

**Resume signal:** "aprovado" or a change list. Text changes are made by staff in the panel; code/label changes become follow-up tasks.

## User Setup Required

- Hostinger: confirm automatic backups/snapshots are on (now also holds videos).
- No new environment variables.

## Next Phase Readiness

- Phase 2 closes when the client approves on staging (or the change list is recorded here and in STATE.md).

## Self-Check: PASSED (Task 1); Task 2 pending

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Task 1 completed: 2026-10-19 — awaiting client check*
