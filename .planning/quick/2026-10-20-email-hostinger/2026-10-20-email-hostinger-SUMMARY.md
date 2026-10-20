---
type: quick
slug: email-hostinger
date: 2026-10-20
requirements-completed: [ASS-02]
---

# Quick 2026-10-20: e-mail ligado (Hostinger SMTP) Summary

**The site can send e-mail through suporte@swingbrasilia.com.br when SMTP_USER/SMTP_PASS exist, and subscribers get a working "Esqueci minha senha" (neutral answer, 5/hour per IP and e-mail); without credentials nothing changes.**

## What changed

- `@payloadcms/email-nodemailer` 3.91.0 (exact, same as `payload`). `src/lib/email/config.ts`: `buildEmailAdapter(env)` returns the adapter only when SMTP_USER and SMTP_PASS are set (host default smtp.hostinger.com, port 465 = TLS, sender suporte@... / "Paraíso Brasília"); otherwise undefined (Payload console fallback). `skipVerify`, credentials never logged. `EMAIL_CAPTURE_DIR` (set only by `playwright.config.ts`) writes messages as JSON files instead of sending.
- `/esqueci-senha` page + `pedirNovaSenha` action + `src/lib/assinantes/reset-email.ts`: counts the attempt per IP and per e-mail (in-memory, `src/lib/email/rate-limit.ts`, 5/hour, counted whether or not the account exists), then in the background mints Payload's token (`forgotPassword` with `disableEmail`) and sends our own Portuguese text+HTML mail linking to `/nova-senha?token=`. Same redirect/message for known and unknown e-mails; `?erro=limite` after the 5th. Page shows the WhatsApp fallback when e-mail is off; `/entrar` links to it only when e-mail is on.
- `Assinantes` guard: `forgotPassword` allowed for the staff link (`staffPasswordLink`) or the site action (`emailedPasswordLink`) only while e-mail is enabled. The public REST `/api/assinantes/forgot-password` stays 403. A newer token (e-mail or staff link) replaces the older one (documented). Staff `users` use Payload's default forgot-password with the same adapter.
- Deploy: `.env.staging.example`, both compose files (comment; the app reads `.env.staging` via env_file), `bootstrap-vps.sh` (new file: empty SMTP vars; re-run: appends only missing lines, never touches SMTP_USER/PASS), `scripts/deploy/send-test-email.mjs`, `docs/deploy/STAGING.md` section 11 (read -rsp block, test line, SPF/DKIM checks, rules).
- Docs: REQUIREMENTS ASS-02, 03-CONTEXT D-04 update, PROJECT decision line, GUIA-DA-EQUIPE.

## Tests

Unit `email-config` (6), `deploy-files` (+3), int `passwords` (+3: guard closed without e-mail, token from the e-mail resets and cancels the older link, rate limit), e2e `esqueci-senha` (4 x 2 projects: neutral answer, link reset, newer e-mail cancels older, REST closed, rate limit). Gate: typecheck, lint, Vitest 348 passed, Playwright 245 passed / 51 skipped (remote-only staging-smoke), `pnpm build` ok with .env aside.

## Deviations

None of substance. Rate limit is in-memory (no migration); a restart clears it.
