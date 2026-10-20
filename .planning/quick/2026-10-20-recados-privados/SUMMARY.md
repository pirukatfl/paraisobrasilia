# Recados privados: SUMMARY

Status: A, B, C, D1 done. D2 (client checkpoint) pending on staging. Client chose "Unir" (2026-10-20).

| Task | Commit | What |
|---|---|---|
| A1 | a9ec703 | Recado wording; compose `indisponivel` state when canSend refuses; int tests for paying-only and third-party privacy |
| A2 | eb11b4a | EnviarRecadoLink, "Recados" labels, TIER row and copy |
| B1 | ff52e49 | /recados deleted; 308 redirects (/recados → /assine-ja, /area-do-assinante/recados → /area-do-assinante/mensagens); removed from menu/footer/sitemap; locked "Enviar recado" on every public card |
| B2 | fa34a90 | Mural and moderation code deleted; Recados collection hidden (data kept); single "Recados" menu item with unread count; old ?recado= links redirect |
| C1 | 7b28d86 | tests/e2e/recados-privados.spec.ts (9) + fase5-seguranca revised |
| D1 | 08d8afc | Staff guide, STAGING 7.4, REQUIREMENTS (REC-04 superseded), VALIDATION, STATE |

Gate: typecheck + lint clean; Vitest 59 files / 549 passed; Playwright 392 passed, 60 skipped (existing device-specific skips); build ok; no migration.

Deleted mural tests were replaced by privacy tests (recados-legado.int, recados-privados.spec, previas redirect/locked-button tests).
Kept on purpose: admin labels "Suspender mensagens"/"Mensagens suspensas"; audit enum recado-* values (would need a migration).
