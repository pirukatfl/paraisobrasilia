---
phase: 05-recados-mensagens-e-contos
plan: 09
subsystem: mensagens
tags: [messages, inbox, thread, unread-badge, server-actions]
requires: [05-08]
provides:
  - actions iniciarConversa / responderMensagem (DAL guard, only origem/alvo/conversa/texto/apelido read)
  - members pages /mensagens, /mensagens/nova, /mensagens/[id]
  - GET /area-do-assinante/mensagens/nao-lidas (private, no-store, noindex; 401 for non-subscribers)
  - UnreadBadge client island in the members sub-nav (refetch on pathname change and tab focus)
  - "Enviar mensagem" on others' full ads and recado cards
affects: [05-10, 05-11]
key-files:
  created:
    - src/lib/mensagens/queries.ts
    - src/lib/mensagens/actions.ts
    - src/components/mensagens/{InboxList,ThreadView,MessageForm,UnreadBadge,EnviarMensagemLink}.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/mensagens/{page.tsx,nova/page.tsx,[id]/page.tsx,nao-lidas/route.ts}
    - tests/e2e/mensagens.spec.ts
  modified:
    - src/app/(frontend)/(membros)/layout.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx
    - src/components/recados/RecadoCard.tsx
    - tests/e2e/recados.spec.ts
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 5 Plan 09: Messages UI and unread counter Summary

Subscribers message each other from ads and recados, read threads and reply; a number next to "Mensagens" in the members menu counts unread messages and clears after reading, including on client navigation.

## Deviations from Plan

- [Rule 1] The reply action redirects to the thread URL without the `#fim` hash and calls `revalidatePath`: a hash-only redirect to the same URL left the stale thread on screen (found by the e2e). The `#fim` anchor element stays in the page.
- recados.spec sub-nav assertion updated for the new Mensagens link.
- Task 1 and Task 2 were committed together (the badge and route are exercised by the same spec).

## Self-Check: PASSED
