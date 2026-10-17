---
phase: 01-funda-o-e-vitrine-de-festas
plan: 07
subsystem: ui
tags: [party-page, lexical, intl, isr, migrations]

# Dependency graph
requires:
  - phase: 01-04
    provides: shell, tokens
  - phase: 01-05
    provides: parties/media collections, queries, PartyCard
provides:
  - Parties D-05 fields (summary ≤160, prices[] with preset rows, dressCode, attractions[] DJ/Show/Modelo/Outro, details rich text limited to paragraph/bold/italic/lists/link)
  - src/migrations/20261017_203909_party_details
  - src/lib/format/date.ts (formatPartyDate, formatPartyTime, formatCardDate — America/Sao_Paulo via formatToParts)
  - PartyDetailDTO, PriceRow, Attraction, RichTextState; getPartyBySlug, getAllPartySlugs, toPartyDetail
  - /festas/[slug] page (ISR 600, generateStaticParams, notFound, past-party badge + CTA)
  - PartyDetails component; gold date line on home cards
  - Seeds: Festa de Teste with all D-05 fields, Festa Passada (ended yesterday); seed helper lexicalParagraph
affects: [01-08, 01-09, 01-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rich text rendered with @payloadcms/richtext-lexical/react RichText (escaped React output)"
    - "Section lists labelled by their headings (aria-labelledby) — e2e selects getByRole('list', { name })"

key-files:
  created:
    - src/lib/format/date.ts
    - src/app/(frontend)/festas/[slug]/page.tsx
    - src/components/party/PartyDetails.tsx
    - src/migrations/20261017_203909_party_details.ts
    - src/migrations/20261017_203909_party_details.json
    - tests/unit/date.test.ts
    - tests/e2e/party.spec.ts
  modified:
    - src/collections/Parties.ts
    - src/lib/parties/types.ts
    - src/lib/parties/queries.ts
    - src/components/PartyCard.tsx
    - src/app/(payload)/admin/importMap.js
    - src/payload-types.ts
    - src/migrations/index.ts
    - tests/helpers/seed.ts
    - tests/e2e/global-setup.ts

key-decisions:
  - "Price `value` is optional (plan: required): preset rows with empty values otherwise block every save; rows without a value are hidden on the page and the admin help text says so"
  - "Day shown as 2 digits (UI-SPEC {dd}): 'Sábado, 05 de dezembro'"
  - "Rich text editor: explicit feature list (no headings, uploads, blocks, embeds); LinkFeature with no internal collections"

patterns-established:
  - "Dates in UI only through src/lib/format/date.ts"

requirements-completed: [FEST-02, FEST-01]

# Metrics
duration: 6min
completed: 2026-10-17
---

# Phase 1 Plan 07: Party page Summary

**Complete party pages at /festas/{slug} with the client's fields (prices per type, dress code, attractions, rich text), dates in Brasília time and Portuguese regardless of server zone, a "já aconteceu" state for old shared links, and the gold date line on home cards — no WhatsApp CTA and no address.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-17T20:35:44Z
- **Completed:** 2026-10-17T20:40:45Z
- **Tasks:** 2
- **Files modified:** 16

## Task Commits

1. **Task 1: Party page e2e + date formatting** - `8c2ae93` (test)
2. **Task 2: D-05 fields + migration + party page + card date line** - `f9411a0` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/date.test.ts` (TZ=UTC) | 3 passed |
| date.ts contains America/Sao_Paulo, formatToParts | PASS |
| `playwright test tests/e2e/party.spec.ts tests/e2e/home.spec.ts` | 8 passed (mobile + desktop) |
| Parties.ts has prices, dressCode, attractions, details, summary, Casal/Mulher sozinha/Homem sozinho | PASS |
| `payload migrate:status` | initial (batch 1) Yes, party_details (batch 2) Yes |
| `grep -rniE 'wa\.me\|whatsapp' src/app src/components` | empty PASS |
| `grep -rn dangerouslySetInnerHTML src/components/party` | empty PASS |
| page.tsx generateStaticParams / notFound / revalidate = 600 | PASS |
| Full vitest | 5 files, 12 tests passed |
| shell + age-gate e2e (regression) | 12 passed |
| typecheck / lint | exit 0 |

## Deviations from Plan

**1. [Rule 1 - Bug] Preset price rows blocked saving** — Found when the "Festa Passada" seed (no prices) failed validation ("Valor" required on the three default rows) and the past-party e2e 404'd. Made `value` optional with help text "Deixe em branco para não mostrar esta linha."; the page only lists rows with a value. The intermediate migration was rolled back (`migrate:down`) and folded into a single `party_details` migration before committing.

**2. [Rule 2] Two-digit day kept literally from UI-SPEC** (`{dd}`).

## Issues Encountered

None beyond the above.

## Next Phase Readiness

- 01-08 fills `flyerOgUrl` and adds generateMetadata; 01-09 adds the `_status` filter to getPartyBySlug/getAllPartySlugs.

## Self-Check: PASSED

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
