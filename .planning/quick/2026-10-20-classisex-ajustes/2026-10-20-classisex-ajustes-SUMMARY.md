---
type: quick
slug: classisex-ajustes
date: 2026-10-20
requirements-completed: [CLAS-01, CLAS-02, CLAS-03, PREV-01]
---

# Quick 2026-10-20: ClassiSex adjustments Summary

**ClassiSex now follows the client's choices: 10 photos + 2 videos, WhatsApp/Telegram only, types Casal/Mulher/Homem/Trans, a required apelido, and an open preview of only apelido + tipo + one blurred photo.**

## What changed

- **Media:** `MAX_AD_PHOTOS=10`, `MAX_AD_VIDEOS=2` (messages, `AdMedia` hook, owner manager "Fotos e vídeos", owner/member cards). DTOs carry `videos[]`; `MediaGallery` renders every video.
- **Contacts:** e-mail removed everywhere (rules, form, actions, collection, DTOs, `ContactLinks`, moderation panel). Message: "Informe pelo menos um contato: WhatsApp ou Telegram."
- **Types:** seed is now Casal, Mulher, Homem, Trans; the public filter lists them. City filter exists only for members; the open area ignores `?cidade=` (also in `findPublicAds`).
- **Apelido:** `ads.apelido` required, max 40, `apelidoError()` rejects anything `redactContacts` would remove or any `@`. Collection validation, service, form field, owner/member titles, admin `resumo` ("Apelido · Tipo · Cidade — texto").
- **Public preview:** `PublicAdDTO` = `{ id, apelido, euSou, foto }` (apelido is redacted again as a safety net). Card shows apelido, tipo, blurred cover, "Assine para ver". Moderation panel preview shows the same.
- **Expiry:** unchanged, tests kept (`ad-visibility`, `classisex-assinante`, `classisex-seguranca`).
- **Docs:** `docs/painel/GUIA-DA-EQUIPE.md` ClassiSex section, `docs/deploy/STAGING.md` 7.3, `04-CONTEXT.md` "Revisão 2026-10-20".

## Migration `20261020_022629_classisex_ajustes` (generated with `pnpm payload migrate:create`, then hand-completed)

- Adds `ads.apelido`, back-fills existing rows with `'Anônimo'`, then sets NOT NULL (the generated plain NOT NULL would fail on a non-empty table).
- Drops `ads.contato_email` (data-loss by design; staging only has test data).
- Renames `ad_categories` Solteira→Mulher (order 1) and Solteiro→Homem (order 2) in place, so ads keep their reference; inserts Trans (order 3) if missing. Idempotent, skips a rename if a staff-made option with the target name already exists.
- Fresh installs: the initial migration seeds the new names via the updated seed, so the rename is a no-op there.
- Down: re-adds `contato_email`, drops `apelido`; renamed options stay.
- Verified by running the up SQL inside a rolled-back transaction on `paraiso_test` against old-style categories (ids preserved, Trans added). Note: `migrate:create` is interactive when a column is added and another dropped (rename prompt); the snapshot was produced in two steps and merged into one migration.

## Deviations from Plan

- **[Rule 2]** Public city filter removed and `findPublicAds` ignores `cidade`, since the city is no longer public and a filter would let visitors probe it.
- **[Rule 1]** Security e2e matrix tightened: the open page must contain none of the approved ad's text (it used to assert a redacted text).

## Gate

- `pnpm typecheck`: clean. `pnpm lint`: clean.
- Vitest: 41 files, 336 tests passed.
- Playwright (desktop + mobile): 229 passed, 51 skipped (staging smoke, needs `E2E_BASE_URL`, and serial dependents), 2 failed in the full run: `party.spec.ts` "flyer opens the party page", an unrelated pre-existing clock-edge flake (the run crossed Brasília midnight, 03:00 UTC); it passes alone (6/6) and passed in the earlier full run (217 passed there; the other 4 failures of that run were this task's e2e expectations, fixed and re-run green).
- `pnpm build` with `.env` moved aside: OK (restored).

## Known Stubs

None.
