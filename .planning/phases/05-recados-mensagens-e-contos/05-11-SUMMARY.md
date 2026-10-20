---
phase: 05-recados-mensagens-e-contos
plan: 11
subsystem: security
tags: [leak-matrix, e2e, privacy, csrf]
requires: [05-10]
provides:
  - tests/e2e/helpers/fase5.ts (scenario with sentinels; conversations created through the real UI; server-action capture/replay helper)
  - tests/e2e/fase5-seguranca.spec.ts (17 tests)
affects: []
key-files:
  created:
    - tests/e2e/helpers/fase5.ts
    - tests/e2e/fase5-seguranca.spec.ts
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 5 Plan 11: Phase 5 leak matrix Summary

One spec pins the phase's privacy guarantees across anonymous, expired, non-participant, blocked, suspended and staff principals and every Phase 5 surface (pages, RSC payloads, REST, server-action replay, route handler, public previews, headers, sitemap).

## What is covered

- Anonymous: members pages redirect to the login; no sentinel in HTML or RSC; REST of recados/conversations/messages/blocks/message-reports returns nothing and refuses writes; unread route 401; replayed reply action creates nothing.
- Expired (Edu): inactive panel only, old conversation not shown, REST closed, replayed action creates nothing.
- Non-participant (Caio): thread 404 in HTML, nothing in RSC, empty inbox, replayed action creates nothing.
- Blocked (Bia) and suspended (Susi): neutral/suspension messages, nothing created, a new-conversation attempt lands on the same blocked thread.
- Staff: closed collections stay closed (T-05-09); reports/recados readable; not a subscriber for members pages.
- Cross-site: foreign Origin rejected on the server action and on the staff moderation endpoint; headers private/no-store and noindex.
- Contos: restricted sentinel absent from public HTML, RSC, meta, list, REST incl. drafts and versions, for anonymous, expired and active callers; present only in the active subscriber's members page (control).
- Previews: no recado apelido/text/contact/members link; "Assine Já" on every preview; sitemap has previews and no members URL; ending Ana's access removes her teaser and blocks messages to her.

## Deviations from Plan

None in application code: the matrix found no gap (no Rule 2 hardening was needed). Test-only adjustments: RSC requests answer 200 with a redirect/not-found payload, so status checks apply to HTML only; thread text appears twice in the markup, so replay checks compare counts against a baseline taken after the real send.

## Self-Check: PASSED
