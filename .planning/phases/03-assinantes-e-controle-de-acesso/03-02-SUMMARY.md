---
phase: 03-assinantes-e-controle-de-acesso
plan: 02
subsystem: site
tags: [plans, assine-ja, pagbank, whatsapp, sitemap, nav]

# Dependency graph
requires:
  - phase: 03-01
    provides: isStaff, nav entry 'Área do assinante', /entrar
  - phase: 02
    provides: cached/expire, getContact, whatsappUrl, buildPageMetadata, buildSitemap, EmptyState, ExternalLink
provides:
  - Collection `plans` (staff-edited; anonymous read active only) seeded by migration with Mensal R$ 30 / Trimestral R$ 75 / Semestral R$ 135 / Anual R$ 240
  - getActivePlans (cached, tag 'plans'), toPlanDTO, durationLabel, formatBRL
  - /assine-ja page, nav + footer entries, sitemap entry
  - whatsappUrl(number, text?)
  - Test helpers seedPlan, createPlan/updatePlan/findPlans; global setup seeds plans
affects: [03-03 (periods use plans.durationDays), 03-04 (panel lists active plans), 03-07 (client pastes PagBank links)]

tech-stack:
  added: []
  patterns:
    - "Data seed in the schema migration, only when the collection is empty (seedPlansIfEmpty)"
    - "Payload ValidationError: field messages asserted through err.data.errors[].message"

key-files:
  created:
    - src/collections/Plans.ts
    - src/migrations/20261019_123931_plans.ts
    - src/migrations/seed/plans-content.ts
    - src/lib/assinantes/plans.ts
    - src/lib/format/money.ts
    - src/app/(frontend)/assine-ja/page.tsx
    - tests/unit/plans-format.test.ts
    - tests/int/plans.int.test.ts
    - tests/e2e/assine-ja.spec.ts
  modified:
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/lib/cache/expire.ts
    - src/lib/site/contact.ts
    - src/lib/site/nav.ts
    - src/components/Footer.tsx
    - src/lib/seo/sitemap.ts
    - tests/helpers/seed.ts
    - tests/e2e/helpers/api.ts
    - tests/e2e/global-setup.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/modelos.spec.ts
    - tests/unit/sitemap.test.ts
    - tests/unit/contact-links.test.ts

key-decisions:
  - "Plans without a PagBank link show 'Combinar pelo WhatsApp' (pre-filled 'Olá! Quero assinar o plano {nome}.') instead of 'Pagar'"
  - "promoPrice 0 or empty = no promotion; promo must be lower than price"
  - "Footer 'Navegue' lists both 'Assine Já' and 'Área do assinante'"

patterns-established:
  - "expectFieldError helper for pt validation messages in int tests"

requirements-completed: [ASS-05]

# Metrics
duration: 20min
completed: 2026-10-19
---

# Phase 3 Plan 02: Plans and Assine Já Summary

**Staff-editable `plans` seeded with the client-confirmed prices drive a new `/assine-ja` page: plan cards with "de/por" promos, a "Pagar" PagBank button only when a link exists (otherwise "Combinar pelo WhatsApp"), the three-step "Como assinar" with the receipt WhatsApp link, and menu/footer/sitemap entries.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments

- `plans` collection (group Assinantes): name, durationDays (integer ≥ 1), price, promoPrice (< price), paymentUrl (https only, parsed with `new URL`), description ≤ 140, active, order; afterChange/afterDelete expire tag `plans`.
- Migration `20261019_123931_plans` creates the table and seeds the four plans when empty; verified by running the whole migration chain on a fresh `paraiso_test` schema (4 rows, empty links, active).
- `/assine-ja`: H1 "Assine Já", 4 cards in order, outbound PagBank links `target=_blank rel="noopener noreferrer"`, "Enviar comprovante pelo WhatsApp" (`wa.me/5561999889772?text=…`), "Já é assinante? Entrar".
- Nav/menu: Festas · Quem somos · Espaço · (Modelos) · Contato · Assine Já · Área do assinante.

## Task Commits

1. **Task 1: Plans collection, seed, DTO and money format** - `286befc` (feat)
2. **Task 2: /assine-ja page, menu/footer CTA and sitemap** - `b02235b` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/plans-format.test.ts tests/int/plans.int.test.ts` | 12 passed |
| plans migration registered and `up` calls seedPlansIfEmpty | yes |
| Plans.ts has https:// validation and expire(['plans']) | yes |
| `vitest run tests/unit/sitemap.test.ts` | 3 passed |
| `playwright test assine-ja.spec.ts shell.spec.ts` | 18 passed (both projects) |
| `pnpm test` | vitest 20 files / 105 tests; playwright 92 passed, 26 skipped |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Int assertions on pt validation messages**
- **Issue:** Payload's ValidationError message is "O campo a seguir está inválido: …"; the field message sits in `err.data.errors`.
- **Fix:** test helper `expectFieldError`; the collection messages are as planned.
- **Commit:** 286befc

**2. [Rule 1 - Bug] Phase 2 modelos spec exact nav list** extended with 'Assine Já'. Commit b02235b.

## Client follow-up

- Generate four new PagBank links (R$ 30 / 75 / 135 / 240) and paste them into each plan in the panel; until then the cards show "Combinar pelo WhatsApp".

## Self-Check: PASSED
