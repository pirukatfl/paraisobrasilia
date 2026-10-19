---
phase: 02-site-aberto-completo-e-m-dia
plan: 01
subsystem: site-shell
tags: [payload-global, contact, openstreetmap, navigation, footer, cache-tags]

# Dependency graph
requires:
  - phase: 01-09
    provides: cached()/expire() pattern, published-only queries
  - phase: 01-10
    provides: build without database, deploy chain with migrations
provides:
  - Global `contact` ("Contato e endereço", group Configurações) seeded by migration 20261019_023755_contact_global (only when empty)
  - src/lib/cache/cached.ts and src/lib/cache/expire.ts (shared by every slice)
  - src/lib/site/contact.ts (ContactDTO + whatsappUrl, telUrl, googleMapsUrl, wazeUrl, osmEmbedUrl, osmLargeMapUrl, instagramUrl, fullAddress)
  - src/lib/site/queries.ts getContact() (tag 'contact')
  - src/lib/site/nav.ts getNavItems() + isActivePath() registry
  - Header with desktop Nav and MobileMenu; async Footer (Contato / Navegue)
  - /contato page with OSM map and Como chegar / WhatsApp buttons
  - tests/e2e/helpers/staff.ts loginAsStaff()
affects: [02-02, 02-03, 02-04, 02-05]

tech-stack:
  added: []
  patterns:
    - "Globals revalidate with expire([tag]) in afterChange"
    - "Seed data lives in src/migrations/seed/* and is applied by the migration only when missing"
    - "Outbound links via <ExternalLink> (target _blank, rel noopener noreferrer, sr-only hint)"
    - "Footer data fetch fails soft (static 404 prerender has no database)"

key-files:
  created:
    - src/globals/Contact.ts
    - src/migrations/20261019_023755_contact_global.ts
    - src/migrations/20261019_023755_contact_global.json
    - src/migrations/seed/contact-content.ts
    - src/lib/cache/cached.ts
    - src/lib/cache/expire.ts
    - src/lib/site/contact.ts
    - src/lib/site/queries.ts
    - src/lib/site/nav.ts
    - src/components/icons.tsx
    - src/components/ExternalLink.tsx
    - src/components/ContactBlock.tsx
    - src/components/MapEmbed.tsx
    - src/components/Nav.tsx
    - src/components/MobileMenu.tsx
    - src/app/(frontend)/contato/page.tsx
    - tests/unit/contact-links.test.ts
    - tests/int/contact.int.test.ts
    - tests/e2e/contato.spec.ts
    - tests/e2e/helpers/staff.ts
  modified:
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/lib/parties/queries.ts
    - src/lib/parties/revalidate.ts
    - src/components/Header.tsx
    - src/components/Footer.tsx
    - src/app/sitemap.ts
    - tests/helpers/seed.ts
    - tests/e2e/global-setup.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/party.spec.ts

key-decisions:
  - "Seed values in src/migrations/seed/contact-content.ts (CONTACT_SEED) shared by the migration and the test helper seedContact()"
  - "Nav is a small client component (usePathname for aria-current); Header stays a server component"
  - "Mobile menu open state is keyed to the pathname it was opened on, so navigation closes it without an effect"
  - "Footer catches getContact() errors so the build-time static 404 prerender works without a database"

patterns-established:
  - "Nav registry: later slices only add entries to getNavItems()"

requirements-completed: [INST-02, INST-03, PAINEL-04]  # PAINEL-04 contacts half; texts half in 02-02

# Metrics
duration: 18min
completed: 2026-10-19
---

# Phase 2 Plan 01: Contact slice and site navigation Summary

**Staff-editable "Contato e endereço" global seeded with the venue address, WhatsApp and coordinates; a /contato page with an OpenStreetMap embed and "Como chegar" deep links to Google Maps and Waze; and a site-wide header menu (desktop inline, mobile disclosure) plus a contact footer.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-10-19T02:37:02Z
- **Completed:** 2026-10-19T02:55:04Z
- **Tasks:** 2
- **Files modified:** 32

## Accomplishments

- Global `contact` with pt labels/help from UI-SPEC, staff-only update, validation (WhatsApp `^55\d{10,11}$`, Instagram handle, CEP, lat/lng ranges); afterChange expires tag `contact`
- Migration `contact_global` creates the table and seeds D-01..D-03 (address, CEP, −15.5936421/−47.9771526, wa.me/5561999889772, (61) 99988-9772, suporte@swingbrasilia.com.br, hours) only when empty
- `cached()` / `expire()` extracted verbatim to `src/lib/cache/` (parties code imports them; no behavior change)
- /contato: address card, gold hours line, three primary buttons (Google Maps, Waze, WhatsApp — new tab, `rel="noopener noreferrer"`), phone/e-mail links, Instagram only when set, lazy OSM iframe with `referrerpolicy="no-referrer"` and "Ver mapa ampliado"
- Header: desktop `nav[aria-label="Principal"]` with accent underline + `aria-current`; mobile "Menu" button (`aria-expanded`, `aria-controls`, accessible name Abrir/Fechar menu, Escape closes and refocuses, closes on navigation, `<noscript>` fallback)
- Footer: Contato (address, Chamar no WhatsApp, phone, e-mail, optional Instagram) and Navegue groups; © line unchanged

## Task Commits

1. **Task 1: Contact slice end to end** - `8375063` (feat)
2. **Task 2: Site navigation shell** - `796ae4d` (feat), `35c9ff0` (fix: lint rule react-hooks/set-state-in-effect)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/contact-links.test.ts tests/int/contact.int.test.ts tests/int/parties.int.test.ts tests/int/parties-access.int.test.ts` | 4 files, 16 tests passed |
| `playwright test tests/e2e/contato.spec.ts` | mobile + desktop passed (staff Instagram edit on desktop) |
| `playwright test tests/e2e/shell.spec.ts tests/e2e/contato.spec.ts tests/e2e/home.spec.ts tests/e2e/age-gate.spec.ts` | 21 passed, 3 skipped (project-specific) |
| `pnpm exec playwright test` (full) | 34 passed, 14 skipped |
| Contact.ts has `slug: 'contact'` and `expire(['contact'])`; payload.config has `globals: [Contact]` | PASS |
| migration `*_contact_global.ts` registered, contains `5561999889772` and `-15.5936421` | PASS |
| `grep -rn facebook src/` | empty — PASS |
| `export function cached` in src/lib/cache/cached.ts; `unstable_cache` count in parties/queries.ts | match; 0 — PASS |
| MobileMenu has `'use client'`, `aria-expanded`, `aria-controls`; Footer has `getContact` + 18+ line | PASS |
| hex colors in src/components (non-admin) | none — PASS |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| `pnpm build` without .env / DATABASE_URI (Docker-like) | exit 0; /contato dynamic |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local dev DB is schema-pushed, `payload migrate` prompts**
- **Found during:** Task 1 ("pnpm payload migrate (local dev DB)")
- **Issue:** the dev database `paraiso` was created by dev-mode push (`payload_migrations` row `dev`, batch −1); `payload migrate` waits on an interactive confirmation.
- **Fix:** the migration (schema + seed) was verified on `paraiso_test`, where `getTestPayload()` runs every committed migration from scratch; the dev DB keeps using push (`SITE_ENV=development`).
- **Verification:** contact int test reads the seeded values and `seedContactIfEmpty()` returns false (already seeded by the migration).

**2. [Rule 1 - Bug] Phase 1 party spec asserted no WhatsApp link anywhere on a party page**
- **Found during:** Task 2 full e2e run
- **Issue:** the new site-wide footer carries the house WhatsApp (UI-SPEC Global — Footer); the Phase 1 rule (D-06/D-07) is about the party content.
- **Fix:** assertion scoped to `main`.
- **Files modified:** tests/e2e/party.spec.ts — **Committed in:** 796ae4d

**3. [Rule 1 - Bug] ESLint react-hooks/set-state-in-effect on "close menu on route change"**
- **Fix:** open state stored as the pathname it was opened on (`open = openOn === pathname`).
- **Committed in:** 35c9ff0

**4. [Rule 2] Footer fails soft without a database**
- The static `/_not-found` page is prerendered at build time with no database; Footer catches `getContact()` errors and renders without the contact group.

**5. Tests and implementation for Task 1 were written in the same step** (tests then code, run once green) rather than a separate RED run.

---

**Total deviations:** 5 (1 blocking environment, 2 bugs, 1 missing-critical, 1 process note). **Impact:** none on the plan's contracts.

## Issues Encountered

- Dev server logs "internal image response failed … 500" once for a flyer derivative during the first e2e run (pre-existing, transient; the test passed on rerun).

## User Setup Required

None. The migration seeds staging automatically on deploy.

## Next Phase Readiness

- Ready for 02-02 (pages collection, Quem Somos children in nav, Legal footer group).
- Client still to confirm the map pin (−15.5936421, −47.9771526) and the Instagram handle.

## Self-Check: PASSED

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Completed: 2026-10-19*
