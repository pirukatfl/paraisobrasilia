---
type: quick
slug: classisex-ajustes
date: 2026-10-20
autonomous: true
requirements: [CLAS-01, CLAS-02, CLAS-03, PREV-01]
---

# Quick: ClassiSex adjustments (client choices of 2026-10-20)

## Objective

Adjust the Phase 4 ClassiSex to the client's explicit choices. Decisions are recorded in
`.planning/phases/04-classisex-e-pr-vias-de-perfis/04-CONTEXT.md` ("Revisão 2026-10-20").

## Tasks

1. **Media limits.** Up to 10 photos and 2 videos (60 s each) per ad. Validation (`media-messages.ts`, `AdMedia.ts`),
   owner UI (`OwnerMediaManager`, `OwnerAdCard`), members gallery (`MediaGallery`, DTOs now carry `videos[]`), tests.
2. **Contacts.** WhatsApp and Telegram only, at least one. Remove the e-mail field (form, DTOs, buttons, admin, rules);
   migration drops `ads.contato_email` (staging holds only test data).
3. **Type organization.** "Eu sou" = Casal, Mulher, Homem, Trans (editable in the panel). Migration renames
   Solteira→Mulher and Solteiro→Homem keeping ids (ads keep their reference) and adds Trans; seed updated for fresh installs.
4. **Public preview.** New required `apelido` (max 40, redacted like the text, rejected with phone/e-mail/@/link).
   Open area shows apelido, tipo and one blurred photo plus "Assine para ver"; no text, city, video or contact; the public
   city filter is removed (the open area ignores `?cidade=`). Members see everything.
5. **Expiry.** Ads vanish when the subscription ends: already implemented, tests kept.
6. **Docs.** `docs/painel/GUIA-DA-EQUIPE.md` ClassiSex section, `docs/deploy/STAGING.md` 7.3, 04-CONTEXT.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest + Playwright incl. the leak matrix), `pnpm build` with `.env` moved aside.
