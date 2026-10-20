---
phase: 05-recados-mensagens-e-contos
plan: 05
subsystem: recados
tags: [recados, members-board, redaction, visibility, cascade]
requires: [05-04]
provides:
  - src/lib/recados/{rules,visibility,dto,service,board,queries,actions}.ts
  - src/collections/Recados.ts (REST staff-only, text stored redacted) + migration 20261020_132752_recados
  - assinantes.apelido (one nickname per account) and cascade delete of recados
  - /area-do-assinante/recados (form, Seus recados, Mural de recados) and Recados in the members sub-nav
  - tests/helpers seedRecado/seedVisibleRecado; e2e api createRecado/setRecadoStatus/findRecados
affects: [05-06, 05-07, 05-08, 05-09, 05-11]
tech-stack:
  added: []
  patterns: ["Phase 4 ads pattern without media/contacts: service + DAL actions + visibility = approved AND author.accessUntil > now"]
key-files:
  created:
    - src/collections/Recados.ts
    - src/lib/recados/rules.ts
    - src/lib/recados/visibility.ts
    - src/lib/recados/dto.ts
    - src/lib/recados/service.ts
    - src/lib/recados/board.ts
    - src/lib/recados/queries.ts
    - src/lib/recados/actions.ts
    - src/components/recados/RecadoForm.tsx
    - src/components/recados/RecadoCard.tsx
    - src/components/recados/OwnRecadoCard.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/recados/page.tsx
    - tests/unit/recado-rules.test.ts
    - tests/int/recados.int.test.ts
    - tests/e2e/recados.spec.ts
  modified:
    - src/collections/Assinantes.ts
    - src/collections/Subscriptions.ts
    - src/lib/classisex/redact.ts
    - src/lib/contos/import.ts
    - src/payload.config.ts
    - src/lib/cache/expire.ts
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts
key-decisions:
  - "redactContacts now also removes e-mails with any TLD (it only knew common ones); the import's local extra pass was removed in favour of it"
  - "Apelido of a recado is a snapshot; the account apelido is updated on each post (context skipAudit)"
requirements-completed: [REC-01]
duration: 40min
completed: 2026-10-20
---

# Phase 5 Plan 05: Recados Summary

Subscribers post recados (apelido + up to 500 characters) that are stored with contacts already replaced by `[contato só para assinantes]`, wait as "Em análise pela equipe", and show on the members board only when approved and the author's access is active. At most 3 active; own recados stay deletable after expiry; REST is staff-only; deleting an account deletes its recados.

## Tasks
1. Rules, visibility, collection, account apelido, cascades, migration - commit 8c90d48
2. Members board, post and delete through the DAL - commit e408300

## Deviations from Plan
- [Rule 2 - Missing critical] `redactContacts` did not recognise e-mails with uncommon TLDs (e.g. `x@exemplo.test`, `.info`); added an any-TLD e-mail pass in `src/lib/classisex/redact.ts` (all Phase 4 unit tests still pass). Supersedes the local pass added in 05-04.
- A test run in the background was killed because source edits for the new collection landed mid-run; the full suite is re-run at the phase gate.

## Known Stubs
None. (The "Enviar mensagem" link on the card is added in 05-09 as planned.)

## Self-Check: PASSED
