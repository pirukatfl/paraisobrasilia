---
phase: 03-assinantes-e-controle-de-acesso
plan: 05
subsystem: auth
tags: [passwords, temporary-password, password-link, sessions, audit-log, no-email]

# Dependency graph
requires:
  - phase: 03-04
    provides: audit-log, writeAudit, service/endpoints pattern, AssinaturaPanel
  - phase: 03-01
    provides: assinantes auth collection, beforeOperation guard, entrar/sair actions
provides:
  - Temporary password set by staff (mustChangePassword, all sessions revoked, audited)
  - Self password change at /area-do-assinante/senha (current session kept, others dropped)
  - Banner "Você está usando uma senha provisória." on members pages
  - Staff-only POST /api/assinantes/:id/link-senha → { url, expiresAt, whatsappUrl }
  - /nova-senha page + definirNovaSenha action (single-use 48 h link, logs the subscriber in)
  - Panel section "Senha" (generate, copy, send by WhatsApp)
affects: [03-06 (leak matrix covers link-senha), phase 4+ (no e-mail provider needed for passwords)]

tech-stack:
  added: []
  patterns:
    - "Password tokens are Payload's own forgot-password tokens minted with disableEmail, only under context.staffPasswordLink"
    - "Writes that bypass hooks (resetPassword) audit explicitly from the action with a subscriber-shaped local req"

key-files:
  created:
    - src/app/(frontend)/(membros)/area-do-assinante/senha/page.tsx
    - src/app/(frontend)/nova-senha/page.tsx
    - src/components/assinantes/PasswordBanner.tsx
    - tests/int/passwords.int.test.ts
    - tests/e2e/senhas.spec.ts
  modified:
    - src/collections/Assinantes.ts
    - src/lib/assinantes/actions.ts
    - src/lib/assinantes/service.ts
    - src/lib/assinantes/endpoints.ts
    - src/components/admin/assinantes/AssinaturaPanel.tsx
    - src/app/(frontend)/(membros)/layout.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/page.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/exclusivo/page.tsx
    - tests/e2e/helpers/api.ts

key-decisions:
  - "No e-mail anywhere (D-04): staff either type a temporary password in the Senha field or generate a 48 h single-use link sent by WhatsApp"
  - "A6 confirmed: the plain password is visible in beforeOperation, so the guard can tell staff-set vs self-set and set passwordSetBy"
  - "A4 confirmed: updating as the subscriber with _sid keeps the current session and drops the others"
  - "Generating a new link invalidates the previous one (Payload keeps one reset token per account)"
  - "Expired/used/missing token all show one message: 'Este link expirou ou já foi usado. Peça um novo para a equipe pelo WhatsApp.'"

patterns-established:
  - "Token-bearing pages: force-dynamic, robots noindex + X-Robots-Tag, token never in the audit log"

requirements-completed: [ASS-02, ASS-01, PAINEL-08]

# Metrics
duration: 40min
completed: 2026-10-19
---

# Phase 3 Plan 05: Passwords without e-mail Summary

**Staff set a temporary password (subscriber is logged out everywhere and sees a "troque agora" banner) or generate a single-use 48-hour "nova senha" link to send by WhatsApp; subscribers change their own password at /area-do-assinante/senha. Every password event lands in the action log, never the password or token.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Staff-set password (create or edit in /admin): `mustChangePassword = true`, all subscriber sessions removed, log row `senha-definida-pela-equipe` (creation logs a single "Conta criada com senha provisória").
- `/area-do-assinante/senha`: current password checked through login (lockout applies), min 8 chars, confirmation must match; on success "Senha alterada.", banner gone, other devices logged out, row `senha-trocada-pelo-assinante` (actor assinante).
- Link: `createPasswordLink` uses Payload `forgotPassword` with `disableEmail` (expiration 48 h, `forgotPassword` closed to everyone else by the guard); the panel shows the URL (readonly), "Copiar", "Enviar pelo WhatsApp" (only when the account has a WhatsApp) and "Vale por 48 horas e só pode ser usado uma vez."
- `/nova-senha`: checks the token before showing the form; `definirNovaSenha` runs `resetPassword`, sets the auth cookie, clears `mustChangePassword` and writes "Senha criada pelo link enviado pela equipe".
- `grep -rn "sendEmail|nodemailer|resend" src` → 0.

## Task Commits

1. **Task 1: Temporary password, self change, banner, audit** - `f4c81f4` (feat)
2. **Task 2: Staff-generated password link and /nova-senha** - `e60afdd` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/int/passwords.int.test.ts` | 5 passed |
| `playwright test tests/e2e/senhas.spec.ts` | 9 passed, 1 skipped (admin panel test is desktop only) |
| link e2e: reuse and no token → expired message; X-Robots-Tag noindex; audit row without the token | yes |
| link endpoint anonymous / subscriber | 403 / 403 |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| `pnpm test` | vitest 26 files / 146 tests; playwright 114 passed, 30 skipped |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] e2e test data used a WhatsApp number without the country code**
- **Issue:** the field validation requires `55` + DDD; the first draft used `61…` and the create call returned 400.
- **Fix:** test data uses `5561…` (the validation is correct; the test was wrong).
- **Commit:** e60afdd

No plan fallback was needed: forgotPassword with `disableEmail` returns the token and `resetPassword` works through the Local API as the plan expected.

## Self-Check: PASSED
