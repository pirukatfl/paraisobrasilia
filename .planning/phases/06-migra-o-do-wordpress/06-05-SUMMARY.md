---
phase: 06-migra-o-do-wordpress
plan: 05
subsystem: auth
tags: [login, wordpress-hash, lazy-migration]
requires: [06-01, 06-04]
provides:
  - "src/lib/assinantes/legacy-login.ts: legacy-first login inside the /entrar server action, rehash on success"
  - "single-use reset link for old passwords shorter than 8 characters (/nova-senha?aviso=senha-curta)"
affects: [06-07]
key-files:
  created: [src/lib/assinantes/legacy-login.ts, tests/int/login-site-antigo.int.test.ts, tests/e2e/login-site-antigo.spec.ts]
  modified: [src/lib/assinantes/actions.ts, src/app/(frontend)/nova-senha/page.tsx, src/collections/Assinantes.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 05: Lazy legacy login Summary

The /entrar action tries the legacy hash first (exact and trimmed input), reusing the existing lockout, then sets the password through Payload so the hash is erased, and audits "Senha do site antigo convertida". Short old passwords redirect to a single-use reset with an explanatory notice. src/proxy.ts is unchanged.

## Commits
- 9af2e23 login flow and tests
- a24cbd5 follow-up

## Results
- 10 int tests, 6 mobile Playwright tests; existing assinante-login and esqueci-senha specs (22) still pass.

## Deviations from Plan
- The forgotPassword guard also accepts `req.context.legacyPasswordUpgrade` so the server action can create the reset token for short passwords.

## Self-Check: PASSED
