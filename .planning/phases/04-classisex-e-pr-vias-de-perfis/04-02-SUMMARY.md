---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 02
subsystem: classisex
tags: [ads, ad-categories, owner-flow, server-actions, migration, access-control]

requires:
  - phase: 03
    provides: requireAssinante/requireActiveSubscription DAL, withRequestState, assinantes beforeDelete cascade, accessStatusFor
provides:
  - collections ad-categories (public read, seeded Casal/Solteiro/Solteira) and ads (all REST ops staff-only)
  - src/lib/classisex/rules.ts (validateAdInput, normalisers, ACTIVE_LIMIT, TEXT_MAX, AD_MESSAGES)
  - src/lib/classisex/service.ts (ServiceError{code,status,errors}, createAd, updateAd, deleteAd, listOwnAds, getOwnAdFormValues, categoryLabels)
  - src/lib/classisex/dto.ts (OwnerAdDTO, toOwnerAdDTO, relId, contatoOf, OWNER_STATUS_LABELS)
  - src/lib/classisex/actions.ts ('use server' criarAnuncio, salvarAnuncio, apagarAnuncio)
  - Meus anúncios pages (list, novo, [id]/editar); InactivePanel component
  - test helpers seedAdCategories, seedAd; staff REST createAd/updateAd/findAdCategories; RESET_ORDER prefix
affects: [04-03 moderation (status/motivo/moderatedAt fields exist), 04-04 board, 04-05 media cascade in Ads beforeDelete, 04-08 reports]

tech-stack:
  added: []
  patterns:
    - "Owner writes: DAL guard in the action → pure validation → service with overrideAccess + ownership check + context.ownerEdit"
    - "useActionState forms return { errors, values } so typed values survive server-side errors"

key-files:
  created:
    - src/lib/classisex/rules.ts
    - src/lib/classisex/service.ts
    - src/lib/classisex/dto.ts
    - src/lib/classisex/queries.ts
    - src/lib/classisex/actions.ts
    - src/collections/AdCategories.ts
    - src/collections/Ads.ts
    - src/migrations/20261019_185421_classisex_ads.ts
    - src/migrations/seed/ad-categories-content.ts
    - src/components/classisex/AdForm.tsx
    - src/components/classisex/OwnerAdCard.tsx
    - src/components/classisex/InactivePanel.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/page.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/novo/page.tsx
    - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/[id]/editar/page.tsx
    - tests/unit/ad-rules.test.ts
    - tests/int/ads.int.test.ts
    - tests/e2e/meus-anuncios.spec.ts
  modified:
    - src/collections/Assinantes.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/lib/cache/expire.ts
    - src/app/(frontend)/(membros)/layout.tsx
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts
    - tests/e2e/global-setup.ts

key-decisions:
  - "Ads keep a required author; the account cascade deletes ads before periods (context assinanteBeingDeleted)"
  - "Contacts are normalised in a beforeValidate hook for staff edits too (WhatsApp digits, Telegram without @, e-mail lower-case); 'at least one contact' reported on contato.whatsapp"
  - "Editing a refused/unpublished ad counts against the limit of 3; editing an already active ad does not"
  - "Telegram is shown back in the edit form with the @ so the subscriber sees what they typed"
  - "Editar is hidden on cards while access is not active (the edit page would only show the inactive panel)"

requirements-completed: [CLAS-03, CLAS-04]

duration: 45min
completed: 2026-10-19
---

# Phase 4 Plan 02: Anúncios do assinante Summary

**Subscribers with active access write short ads in Área do assinante → Meus anúncios (Eu sou, cidade, up to 600 characters, WhatsApp/Telegram/e-mail in separate fields, declaration); every new or edited ad lands as "Em análise pela equipe", at most 3 are active, and only staff can touch ads through /api/ads.**

## Performance
- **Duration:** ~45 min
- **Tasks:** 2 (TDD, 4 commits)
- **Files:** 18 created, 8 modified

## Accomplishments
- `ad-categories` + `ads` collections, migration `20261019_185421_classisex_ads` (seeds Casal, Solteiro, Solteira only when empty)
- Field rules in Portuguese shared by the admin and the members form
- Owner service with ownership check, limit 3, back-to-pendente on every edit
- Meus anúncios list / Novo / Editar pages; inactive owners list and delete only (LGPD)
- Account deletion removes the person's ads

## Task Commits
1. Task 1 RED `7d9c4b6` test(04-02): failing tests for ad rules, ads and Eu sou options
2. Task 1 GREEN `68de3dc` feat(04-02): ads and Eu sou collections with rules, migration and account cascade
3. Task 2 RED `225dca7` test(04-02): failing owner-service and Meus anúncios tests
4. Task 2 GREEN `31bb3b6` feat(04-02): Meus anúncios — owner create, edit and delete through the DAL

## Verification
- `vitest run tests/unit/ad-rules.test.ts tests/int/ads.int.test.ts tests/int/assinantes-auth.int.test.ts tests/int/subscriptions.int.test.ts` → 36 + 7 passed
- `playwright test tests/e2e/meus-anuncios.spec.ts` → 12 passed (mobile + desktop)
- `pnpm test` → Vitest 230 passed (31 files), Playwright 144 passed; typecheck and lint clean

## Deviations from Plan
1. **[Rule 3 - Blocking] Migration not applied to the local dev DB.** `pnpm payload migrate` prompts interactively because the dev database `paraiso` was schema-pushed (SITE_ENV=development). The migration is applied and exercised on `paraiso_test` by the test harness (`getTestPayload` runs `payload.db.migrate`), which is the reproducible path; dev keeps using push.
2. **Success notices use `role="status"`** (as Phase 3's "Senha alterada.") instead of `role="alert"`; errors keep `role="alert"`.
3. **Added `src/components/classisex/InactivePanel.tsx`** (shared inactive branch for Novo/Editar, later for the board) and `getOwnAdFormValues`/`categoryLabels` in the service (not listed in the plan's files).
4. `ServiceError` also carries optional field `errors` so the action can show service-side validation on the right field.

## Self-Check: PASSED
