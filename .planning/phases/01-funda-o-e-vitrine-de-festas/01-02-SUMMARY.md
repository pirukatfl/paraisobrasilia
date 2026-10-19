---
phase: 01-funda-o-e-vitrine-de-festas
plan: 02
subsystem: discovery
tags: [wordpress, eca-digital, lgpd, aup, hostinger]

# Dependency graph
requires: []
provides:
  - docs/discovery/WORDPRESS.md — checklist for the WordPress migration (versão, plugins, plugin de assinantes, tipo de hash, URLs indexadas) with dated status
  - docs/discovery/AGE-GATE-LEGAL.md — lawyer brief on the 18+ gate (ECA Digital Lei 15.211/2025, Decreto 12.880/2026, LGPD) with dated status
  - docs/discovery/PROVIDERS-AUP.md — adult-content AUP verdicts per provider, VPS shortlist and "Escolha do cliente: Hostinger VPS"
  - docs/discovery/README.md — index and client pending list
affects: [01-10, phase-6 migração do WordPress, phase-7 lançamento (age gate / termos)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discovery docs record only aggregated facts and which secure channel was used; never credentials (D-08)"

key-files:
  created:
    - docs/discovery/README.md
    - docs/discovery/WORDPRESS.md
    - docs/discovery/AGE-GATE-LEGAL.md
    - docs/discovery/PROVIDERS-AUP.md
  modified: []

key-decisions:
  - "Hosting: Hostinger VPS (client choice 2026-10-17) — AUP accepts legal adult content in writing"
  - "Media on the VPS disk instead of Backblaze B2 (client decision 2026-10-17)"
  - "If no database access to WordPress: migration falls back to re-cadastro por convite"

patterns-established:
  - "Status lines in discovery docs are dated and updated as the client answers"

requirements-completed: [INST-04]

# Metrics
duration: multi-day (client checkpoint)
completed: 2026-10-19
---

# Phase 1 Plan 02: Discovery records Summary

**Discovery records for the WordPress migration, the lawyer brief on the 18+ gate and provider AUPs, with the client's answers dated: Hostinger VPS chosen and running staging, WordPress at Hostinger with wp-admin and hosting access (not yet shared), legal brief not yet confirmed as sent.**

## Performance

- **Duration:** Task 1 ~10 min; Task 2 waited on the client (2026-10-17 → 2026-10-19)
- **Started:** 2026-10-17T20:00:00Z
- **Completed:** 2026-10-19
- **Tasks:** 2 (1 auto, 1 human-action checkpoint)
- **Files modified:** 4

## Accomplishments
- Four discovery docs in Portuguese under docs/discovery/, no credentials in any file
- Provider AUP table with verdicts and quotes; Hetzner and Contabo discarded (prohibit pornographic material); Hostinger VPS chosen by the client
- WordPress status recorded (2026-10-19): site hosted at Hostinger; client has wp-admin login and hosting (hPanel) access; access not yet shared through the secure channel, so the checklist (versão, plugin de assinantes, tipo de hash, URLs) is still to be filled
- Legal brief status recorded (2026-10-19): "Pendente — envio ao advogado ainda não confirmado pelo cliente"

## Task Commits

1. **Task 1: Write the discovery records** - `fe86a0e` (docs)
2. **Task 2: Client supplies WordPress facts, sends the legal brief, picks the VPS** - `bcde04e` (provider choice), `1cf40b4` (current hosting), and the phase-close commit (dated status lines, 2026-10-19)

## Files Created/Modified
- `docs/discovery/README.md` - Index with dated situation per doc and client pending list
- `docs/discovery/WORDPRESS.md` - WordPress checklist, secure-channel rule, hash-type query, fallback by invitation
- `docs/discovery/AGE-GATE-LEGAL.md` - Legal facts with sources, five questions for the lawyer, status line, technical action per answer
- `docs/discovery/PROVIDERS-AUP.md` - AUP verdicts, VPS shortlist, "Escolha do cliente: Hostinger VPS (2026-10-17)"

## Decisions Made
- Client chose Hostinger VPS (same account as the current site) for staging/production
- Client chose to keep media on the VPS disk (no Backblaze B2); backups must include the media volume

## Deviations from Plan

None in the documents. The checkpoint closed with two items still open on the client's side (recorded, not blocking Phase 1):
- WordPress access exists but has not been shared yet (gates Phase 6 planning, not Phase 1)
- Legal brief not confirmed as sent (gates Phase 7 launch, not Phase 1)

**Total deviations:** 0 auto-fixed
**Impact on plan:** Acceptance criteria met (dated status lines, "Escolha do cliente:" present).

## Issues Encountered
None.

## User Setup Required
- Share WordPress/hosting access through the agreed secure channel (temporary admin user or password-manager share), never in chat
- Forward "Perguntas ao advogado" (AGE-GATE-LEGAL.md) to the house's lawyer and tell us the date sent

## Next Phase Readiness
- Phase 2 does not depend on WordPress access or the legal answer
- Phase 6 needs WordPress access; Phase 7 needs the legal opinion

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-19*
