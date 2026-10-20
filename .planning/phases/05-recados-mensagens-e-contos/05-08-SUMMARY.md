---
phase: 05-recados-mensagens-e-contos
plan: 08
subsystem: mensagens
tags: [messages, conversations, rest-closed, limits, unread]
requires: [05-07]
provides:
  - collections 'conversations' and 'messages' (REST closed for everybody, admin hidden) + migration *_mensagens
  - src/lib/mensagens/{rules,dto,service}.ts (resolveTarget, canSend, startConversation, sendMessage, listInbox, getThread, markRead, countUnread, findExistingConversation)
  - Assinantes cascade delete of conversations and messages
  - tests/helpers seedConversation/seedMessage
affects: [05-09, 05-10, 05-11]
key-files:
  created:
    - src/lib/mensagens/rules.ts
    - src/lib/mensagens/dto.ts
    - src/lib/mensagens/service.ts
    - src/collections/Conversations.ts
    - src/collections/Messages.ts
    - tests/unit/mensagens-rules.test.ts
    - tests/int/mensagens.int.test.ts
  modified:
    - src/collections/Assinantes.ts
    - src/payload.config.ts
    - tests/helpers/seed.ts
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 5 Plan 08: Messaging data and service Summary

Closed conversations/messages collections and a service that enforces active-both-sides, visible-origin recipients, participant-only reads, daily limits and unread counting.

## Deviations from Plan

- [Rule 2] Added `startedBy` to `conversations` so "20 new conversations per day" counts the starter only (the plan's field list had no creator).
- Real `ServiceError` signature is (code, message, status); the plan's interface listed (code, status, message).
- Messages and conversations are created with an explicit `createdAt` from the pinned `now` so the São Paulo day limits are testable.
- Thread pages use `-id` ordering (monotonic with creation) for stable pagination.
- The cascade of the Assinantes delete hook was done in one find plus two deletes (messages first).

## Self-Check: PASSED
