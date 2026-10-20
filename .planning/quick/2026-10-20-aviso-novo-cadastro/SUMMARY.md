---
type: quick
slug: aviso-novo-cadastro
date: 2026-10-20
status: complete
---

# Aviso de novo cadastro: Summary

Staff now get an e-mail ("Novo cadastro no Paraíso Brasília") for each new /cadastro account, to an address editable in Configurações → Contato e endereço (empty falls back to `EMAIL_FROM_ADDRESS`, default suporte@swingbrasilia.com.br).

## What changed

- `src/globals/Contact.ts`: `avisoNovoCadastroEmail`, field-level read/update staff-only (the global itself is public-read). Migration `20261020_212353_aviso_novo_cadastro` adds the column.
- `src/lib/email/new-signup-notice.ts`: message builder + `notifyNewSignup` (no-op without e-mail, try/catch, logs only the id).
- `src/lib/assinantes/signup.ts`: notice sent after the account is created, in the background block, in a `finally` so a verification-mail failure does not skip it and a notice failure cannot affect the answer.
- Tests: `tests/int/aviso-novo-cadastro.int.test.ts` (6); `cadastro.int.test.ts` capture ignores the staff notice so its subscriber-mail counts are unchanged.
- Guide: paragraph "Aviso de novo cadastro".

## Decisions

- Hooked in the sign-up service rather than a collection hook: only the public path sends, so staff-created, seeds and migrations cannot trigger it.
- Notice carries no password, token or confirmation link.

## Deviations

None.
