---
type: quick
slug: classisex-midia-na-criacao
date: 2026-10-20
autonomous: true
requirements: [CLAS-03]
---

# Quick: photos and videos while creating a ClassiSex ad

Client feedback 2026-10-20: the subscriber must attach media while creating the ad, not only on the edit page.

## Tasks

1. Create form (`AdForm` withMedia + `AdMediaPicker`): photo picker (accept `image/*`, multiple, max 10, 15 MB) and video
   picker (accept `video/*`, multiple, max 2, 100 MB, 60 s when the browser can read the metadata), previews, limit messages.
   Rendered only after hydration (no JS: ad is created as before, media added on the edit page).
2. `criarAnuncio` returns `createdId` (no redirect) when `comMidia=sim`; the client then posts each file to the existing
   `…/meus-anuncios/[id]/midia` route (XHR, per-file progress) and goes to the edit page with `?midia=lote&ok=N&falhas=M&codigo=…`.
3. Edit page shows the batch notice (`batchNotice`, fixed texts only); a rejected file never removes the ad.
4. Server route, hooks, scrubbing/blur, owner-only and Origin guard are unchanged.
5. e2e `tests/e2e/anuncio-midia-criacao.spec.ts`; staff guide line.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest + Playwright incl. leak matrix), `pnpm build` with `.env` moved aside.
