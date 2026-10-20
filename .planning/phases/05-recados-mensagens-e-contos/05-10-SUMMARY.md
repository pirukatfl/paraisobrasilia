---
phase: 05-recados-mensagens-e-contos
plan: 10
subsystem: mensagens
tags: [block, report, suspension, moderation, audit]
requires: [05-09]
provides:
  - collections 'blocks' (REST closed) and 'message-reports' (staff-only, snapshot of the last 20 messages, urgent flag) + migration *_mensagens_seguranca
  - assinantes.mensagensSuspensas (staff-only field)
  - service blockUser/unblockUser/blockState/reportConversation/resolveMessageReport/getMessageReportCounts/threadSafetyState; canSend checks suspension and blocks both ways
  - POST /api/message-reports/:id/resolver (descartar|resolver|suspender, staff only, audited)
  - thread UI: Bloquear/Desbloquear/Denunciar; admin MensagemDenunciaPanel; dashboard line "Mensagens: N denúncias abertas · M urgentes"
  - audit actions denuncia-mensagem-resolvida and mensagens-suspensas
affects: [05-11]
key-files:
  created:
    - src/collections/Blocks.ts
    - src/collections/MessageReports.ts
    - src/lib/mensagens/endpoints.ts
    - src/components/mensagens/BlockReportPanel.tsx
    - src/components/admin/mensagens/MensagemDenunciaPanel.tsx
    - tests/int/mensagens-seguranca.int.test.ts
    - tests/e2e/bloqueio-denuncia.spec.ts
  modified:
    - src/lib/mensagens/{rules,dto,service,actions,queries}.ts
    - src/collections/Assinantes.ts
    - src/lib/assinantes/audit.ts
    - src/components/admin/classisex/FilaClassisex.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/mensagens/[id]/page.tsx
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 5 Plan 10: Block, report and suspension Summary

Subscribers block and report from a thread; staff resolve reports (with the optional suspension of the reported person's messaging) from a panel; every action is audited and staff only ever see the snapshot a report captured.

## Deviations from Plan

- [Orchestrator default] A report with reason "Pessoa menor de idade" suspends the reported person's messaging immediately (automatic audit row `mensagens-suspensas`); staff untick the account field to release.
- Reports store `conversationId` as a plain number (not a relationship): the conversations collection stays closed and hidden.
- The admin panel requires a note (min 3 chars) for Resolver and Suspender (client check); Descartar's note is optional. The service accepts an empty note.
- Block/unblock redirect with `?ok=` and call `revalidatePath`; reporting calls `revalidatePath` and shows the status inline.
- Tasks 1 and 2 committed separately (service first, UI second).

## Self-Check: PASSED
