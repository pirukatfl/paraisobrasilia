---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 06.1-03-PLAN.md
last_updated: "2026-10-23T04:35:51.861Z"
last_activity: 2026-10-23
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 59
  completed_plans: 57
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-19)

**Core value:** Quem chega ao site entende rapidamente o que é a casa, vê as próximas festas e consegue chegar até ela; quem é assinante encontra perfis e consegue fazer contato.
**Current focus:** Phase 06.1 — galeria de modelos com página por modelo (planned, 4 plans) · depois Phase 7

## Current Position

Phase: 06.1 (galeria de modelos com página por modelo, inserida antes da 7)
Plan: 3 of 4 complete (next: 06.1-04)
Status: Ready to execute
Last activity: 2026-10-23

Progress: [██████████] 98%

## Performance Metrics

**Velocity:**

- Total plans completed: 61
- Average duration: 6 min
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 10/10 | ~43 min executor time (+ client waits) | ~5 min |
| 2 | 6 | - | - |
| 3 | 7 | - | - |
| 4 | 10 | - | - |
| 5 | 12 | - | - |
| 6 | 10 | - | - |

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 6 min | 2 tasks | 32 files |
| Phase 01 P03 | 3 min | 2 tasks | 13 files |
| Phase 01 P04 | 4 min | 2 tasks | 15 files |
| Phase 01 P05 | 5 min | 3 tasks | 17 files |
| Phase 01 P06 | 3 min | 2 tasks | 9 files |
| Phase 01 P07 | 6 min | 2 tasks | 16 files |
| Phase 01 P08 | 5 min | 2 tasks | 16 files |
| Phase 01 P09 | 15 min | 2 tasks | 17 files |
| Phase 01 P02 | ~10 min (+ client wait) | 2 tasks | 4 files |
| Phase 01 P10 | ~60 min (+ client wait) | 3 tasks | 20 files |
| Phase 02 P01 | 18 min | 2 tasks | 32 files |
| Phase 02 P02 | 11 min | 2 tasks | 33 files |
| Phase 02 P03 | 12 min | 2 tasks | 27 files |
| Phase 02 P04 | 9 min | 2 tasks | 16 files |
| Phase 02 P05 | 12 min | 2 tasks | 24 files |
| Phase 02 P06 | ~35 min (Task 1; + client wait) | 1/2 tasks | 11 files |
| Phase 03 P01 | 45 min | 2 tasks | 33 files |
| Phase 03 P02 | 20 min | 2 tasks | 25 files |
| Phase 03 P03 | 30 min | 3 tasks | 22 files |
| Phase 03 P04 | 35 min | 3 tasks | 20 files |
| Phase 03 P05 | 40min | 2 tasks | 15 files |
| Phase 03 P06 | 30min | 2 tasks | 8 files |
| Phase 04 P01 | 12 min | 2 tasks | 5 files |
| Phase 04 P02 | 45 min | 2 tasks | 26 files |
| Phase 04 P03 | 35 min | 2 tasks | 13 files |
| Phase 04 P04 | 30 min | 2 tasks | 17 files |
| Phase 04 P05 | 70min | 3 tasks | 22 files |
| Phase 04 P06 | 45min | 2 tasks | 19 files |
| Phase 04 P07 | 35min | 2 tasks | 17 files |
| Phase 06.1 P01 | 12 min | 3 tasks | 14 files |
| Phase 06.1 P02 | 10 min | 2 tasks | 13 files |
| Phase 06.1 P03 | 8min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [Phase 01]: Template test tooling removed; plan 01-03 installs approved vitest 5.0.5 / @playwright/test 1.64.1 — Template versions differ from the approved list; 01-03 owns the harness
- [Phase 01]: DB env var is DATABASE_URI; @payloadcms/* pinned 3.91.0 incl. @payloadcms/ui from template — Matches .env.example contract; mismatched Payload versions break the admin
- [Phase 01]: Migrations-first: schema push only when SITE_ENV=development; tests/staging/prod run src/migrations — Reproducible schema; payload migrate prompts if a DB was dev-pushed
- [Phase 01]: Public queries cached with unstable_cache tags parties / party:{slug}; Payload hooks call revalidateTag(tag, { expire: 0 }) — Publish/edit/unpublish visible on the next request; 600 s window keeps time-based expiry
- [Phase 01]: Client chose Hostinger VPS for staging/production (2026-10-17) — Recorded in docs/discovery/PROVIDERS-AUP.md
- [Phase 01]: Pull-based deploy: GitHub Actions pushes images to ghcr.io/pirukatfl/paraisobrasilia, VPS systemd timer pulls every 5 min — no SSH from our environment
- [Phase 01]: Media on the VPS disk (named volume media), no Backblaze B2 — client decision 2026-10-17
- [Phase 01]: Staging live at https://novo.swingbrasilia.com.br (Hostinger VPS 187.77.246.132, Ubuntu 24.04), client-confirmed 2026-10-19
- [Phase 02]: Shared cache helpers in src/lib/cache (cached, expire); tags contact, pages/page:{key}, space, models
- [Phase 02]: Seed data in src/migrations/seed/* applied by migrations only when missing (staff edits never overwritten)
- [Phase 02]: 02-WP-TEXTS.md original wording merged into Quem somos/Normas/Regras seeds; Termos/Privacidade drafts keep [VALIDAR markers
- [Phase 02]: Payload 3.91 file route serves byte ranges (206): videos use /api/videos/file/*, no fallback route
- [Phase 02]: e2e data changes go through the staff REST API (cache tags expire); global setup clears .next/dev/cache
- [Phase 02]: Modelos section (route, nav, footer, sitemap) exists only while a model is published (hasPublishedModels, tag models)
- [Phase 02]: Home works without parties (D-10); budgets: home 344 KB incl. JS in production, /contato 138 KB, /quem-somos 146 KB
- [Phase 02]: Fonts preload latin subset only; favicon 15 KB
- [Phase 02]: Phase 2 on main at 93fcccd; staff guide docs/painel/GUIA-DA-EQUIPE.md; image removal = Excluir the file (Despublicar keeps it)
- [Phase 03]: Roles by principal collection (src/access/roles.ts): users = staff; assinantes never pass staff checks
- [Phase 03]: assinantes accounts only by staff or trusted context; public first-register/forgot-password closed; 30-day sessions
- [Phase 03]: Plans seeded by migration (Mensal 30, Trimestral 75, Semestral 135, Anual 240), paymentUrl empty until the client sends PagBank links; 'Combinar pelo WhatsApp' replaces 'Pagar' meanwhile
- [Phase 03]: Access = periods evaluated per request (startsAt <= now < endsAt, endsAt at São Paulo midnight after the last valid day); accessUntil denormalised for listing only
- [Phase 03]: withRequestState: restore req.context/user after nested Local API calls in hooks (Payload mutates the shared req)
- [Phase 03]: Staff actions = service (int-tested) + staff-only collection endpoints + client UI field 'Assinatura'; dates always computed on the server
- [Phase 03]: Modules reachable from payload.config never import 'server-only' (status.ts vs access.ts)
- [Phase 03]: 03-05: no e-mail; temporary password or 48 h single-use link sent by WhatsApp
- [Phase 03]: 03-06: GraphQL disabled; subscriber API checks run same-origin because csrf ignores Origin-less cookies

### Pending Todos

Open items carried from Phase 1 (human checks / verifications, do not block Phase 2):

- [Phase 1] Run staging smoke tests (`E2E_BASE_URL=https://novo.swingbrasilia.com.br pnpm exec playwright test tests/e2e/staging-smoke.spec.ts --project=mobile`) from a network that reaches the host — our egress proxy blocks it; NOT yet passed
- [Phase 1] WhatsApp/Instagram share preview of a party link on a phone (01-10 Task 3, criterion 3) — pending client confirmation
- [Phase 1] Staff member creates/edits/unpublishes a party alone on staging, past party leaves home; collect label feedback (01-10 Task 3, criterion 4) — pending client confirmation
- [Phase 1] Visual feel (D-04) and logo sharpness on staging — not explicitly reported
- [Phase 1] Client to share WordPress wp-admin/hosting access via secure channel (exists, not yet shared — 2026-10-19)
- [Phase 1] Client to confirm legal brief sent to lawyer (AGE-GATE-LEGAL.md: Pendente, 2026-10-19)
- [Phase 1] Turn on Hostinger VPS backups/snapshots (pgdata + media live on the VPS disk)

- [Phase 2] Client: confirm days/audiences (sexta só casais e mulheres; homens só com reserva) and hours 22h–5h in Regras (02-CONTENT.md §5)
- [Phase 2] Client: confirm map pin −15.5936421/−47.9771526 (taken from old site's Google place link) and new Instagram handle
- [Phase 2] Client/lawyer: razão social, CNPJ, DPO and review of Termos/Política drafts ("[VALIDAR" markers must be gone before production, Phase 7)
- [Phase 2] Client check on staging (02-06 Task 2, blocking): menu, Quem somos + sub-pages, Contato (pin, Como chegar, WhatsApp), Espaço, legal pages; staff upload photos/video, model (4th photo error), edit Regras/address, Excluir test model
- [Phase 2] Run the extended staging smoke (Phase 2 pages + WhatsApp link) from a network that reaches the host; confirm the VPS ran the 4 Phase 2 migrations (journalctl -u paraiso-update)
- [Phase 2] Client: review the texts merged from the WordPress originals (02-02-SUMMARY table); share wp-content/uploads backup for space/model photos (D-07)

### Blockers/Concerns

- [Phase 1→6] WordPress: hosted at Hostinger, client has wp-admin and hosting access but has not shared it yet (2026-10-19); blocks Phase 6 (fallback: re-cadastro por convite)
- [Phase 1→7] Parecer jurídico sobre ECA Digital/LGPD necessário antes de fechar o age gate (módulo trocável); envio ao advogado não confirmado (2026-10-19)
- [Phase 1] AUP de registrador, e-mail transacional ainda a confirmar antes de contratar (VPS resolvida: Hostinger)
- Pendentes do cliente: endereço público, logo/identidade visual (vetor), planos e valores
- [Phase 1→7] Media and Postgres live only on the VPS disk: off-server backup of pgdata + media needed (Phase 7); enable Hostinger snapshots now
- Local docker-compose.yml (dev) still not exercised with a Docker daemon; confirm initdb creates paraiso_test on first local Docker run
- Our environment cannot reach novo.swingbrasilia.com.br (egress proxy) nor SSH to the VPS: staging verification depends on the client or CI
- The /mnt/project-files mount rewrites committed image files about 30 s after write, so the canonical working tree shows modified PNG/JPG/WebP; blobs in git are correct

## Quick Tasks Completed

| Date | Slug | Description |
|------|------|-------------|
| 2026-10-20 | classisex-ajustes | ClassiSex per client choices: 10 photos + 2 videos, WhatsApp/Telegram only, Casal/Mulher/Homem/Trans, required apelido, public preview = apelido + tipo + 1 blurred photo (see .planning/quick/2026-10-20-classisex-ajustes/) |
| 2026-10-20 | classisex-midia-na-criacao | Photos and videos chosen in the create-ad form (see .planning/quick/2026-10-20-classisex-midia-na-criacao/) |
| 2026-10-20 | email-hostinger | Transactional e-mail through the Hostinger SMTP; /esqueci-senha (see .planning/quick/2026-10-20-email-hostinger/) |
| 2026-10-20 | recados-privados | R-01 UNIFICAR: mural and recados moderation removed; Recados = private conversations between paying members, started by Enviar recado on a paying member's ad; locked button on the open ClassiSex; /recados -> /assine-ja (308); legacy recados table hidden, no migration (R-01..R-08; see .planning/quick/2026-10-20-recados-privados/). The 05-12 client checklist uses step D2 for recados |
| 2026-10-20 | conta-gratuita | Open sign-up with e-mail confirmation, free vs paying tiers on the ClassiSex, ads stay online as free (cover only) after expiry, Grátis x Assinante table (G-01..G-06); migration 20261020_172550_conta_gratuita; gate: Vitest 539, Playwright 391 passed / 0 failed, build ok (see .planning/quick/2026-10-20-conta-gratuita/) |
| 2026-10-22 | dicas-hot | Dicas Hot (M-08): public SEO section /dicas-hot + /dicas-hot/<slug>, staff-only `dicas` collection with draft/publish, cover gate `capaConferida`, footer link + home teaser + sitemap, importer `pnpm import:dicas`, 30 dicas bundle + loader, 30 old slugs + /dicas-hot/ + /category/dicas-hot/ redirected (DH-01..DH-10); migrations 20261022_102706_dicas and 20261022_120000_dicas_wp_bundle (see .planning/quick/2026-10-22-dicas-hot/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-10-23T04:32:16.313Z
Stopped at: Completed 06.1-03-PLAN.md
Resume file: None
