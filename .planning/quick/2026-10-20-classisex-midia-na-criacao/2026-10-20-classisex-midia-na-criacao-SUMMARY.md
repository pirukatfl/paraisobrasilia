---
type: quick
slug: classisex-midia-na-criacao
date: 2026-10-20
status: complete
---

# Quick: media while creating a ClassiSex ad - Summary

The "Novo anúncio" form now has a photo picker (up to 10, `image/*`, multiple) and a video picker (up to 2, `video/*`,
100 MB, 60 s when readable) with local previews, per-item removal and limit messages. On submit the ad is created
(status em análise), then the browser posts each file to the existing owner route one by one (XHR, "Enviando arquivo N de M"
with a progress bar) and lands on the edit page with a batch notice; a rejected file keeps the ad and names the reason.

- Server unchanged: route handler, collection hooks, scrubbing/blur, owner-only, Origin guard (`src/proxy.ts`), size checks.
- Files never go through the server action (inputs have no `name`; only `comMidia=sim` flag); action returns `createdId`.
- Progressive enhancement: pickers render after hydration only; without JS the ad is created as before and media is added on the edit page.
- Browser cannot read some videos' duration (e.g. synthetic fixtures): client lets them through, the server enforces 60 s.
- Files: `AdMediaPicker.tsx` (new), `AdForm.tsx`, `actions.ts`, `media-messages.ts` (`CLIENT_MESSAGES`, `batchNotice`), edit/novo pages, staff guide.
- Tests: `tests/e2e/anuncio-midia-criacao.spec.ts` (2 photos + 1 video in one flow; client 11th photo / 3rd video / wrong type; server 11th photo / 3rd video; batch notice).

## Gate

typecheck, lint clean; Vitest 336/336; Playwright 237 passed, 51 skipped (existing desktop/mobile-only conditions), 0 failed; `pnpm build` OK.

## Deviations

None.
