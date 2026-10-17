---
phase: 01-funda-o-e-vitrine-de-festas
plan: 09
subsystem: cms
tags: [payload-drafts, access-control, revalidateTag, unstable_cache, admin-branding]

# Dependency graph
requires:
  - phase: 01-08
    provides: SEO fields, og image, queries with flyerOgUrl
provides:
  - Parties versions.drafts (maxPerDoc 20): Publicar / Despublicar / Salvar rascunho, version history
  - Anonymous read = published only; writes require staff (parties, media, users)
  - Portuguese help text on every party field + collection description
  - src/migrations/20261017_204729_party_drafts (existing parties set to published)
  - src/lib/parties/revalidate.ts (revalidatePartyAfterChange / AfterDelete → revalidateTag(tag, { expire: 0 }))
  - Public queries cached with unstable_cache (tags 'parties', 'party:{slug}', revalidate 600) and filtered `_status = published`, `draft: false`
  - Admin graphics Logo (login) and Icon (nav)
  - docs/screens/*.png — 390px screenshots for the client
affects: [01-10, phase-2 content collections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "revalidateTag(tag, { expire: 0 }) — Next 16 requires a profile; expire 0 avoids serving one stale copy after publish"
    - "cached() helper: unstable_cache inside Next, direct call outside (vitest/scripts have no incremental cache)"
    - "Modules loaded by plain Node ESM (Payload CLI, Playwright global setup) import 'next/cache.js' with the extension"
    - "isPast computed after the cache (clock-dependent); upcoming list cached per minute and re-filtered by isUpcoming"

key-files:
  created:
    - src/lib/parties/revalidate.ts
    - src/components/admin/Logo.tsx
    - src/components/admin/Icon.tsx
    - src/migrations/20261017_204729_party_drafts.ts
    - src/migrations/20261017_204729_party_drafts.json
    - tests/int/parties-access.int.test.ts
    - tests/e2e/admin-party.spec.ts
    - docs/screens/home-mobile-390.png
    - docs/screens/festa-mobile-390.png
    - docs/screens/confirmacao-18-mobile-390.png
  modified:
    - src/collections/Parties.ts
    - src/lib/parties/queries.ts
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/app/(payload)/admin/importMap.js
    - tests/helpers/seed.ts

key-decisions:
  - "Cache API: unstable_cache (stable in 16.4 without enabling cacheComponents/'use cache')"
  - "Slug moved to the admin sidebar; date pickers display dd/MM/yyyy HH:mm"
  - "Admin language follows the browser: pt-BR browsers get Portuguese (verified); `en` stays as a supported language per 01-01"

patterns-established:
  - "Every public query filters `_status: published` and passes `draft: false`"

requirements-completed: [PAINEL-01, FEST-04]

# Metrics
duration: 15min
completed: 2026-10-17
---

# Phase 1 Plan 09: Staff publishing Summary

**Self-service publishing: drafts with Publicar/Despublicar and version history, published-only public reads (Local API, REST and queries), Portuguese help text on every field, the brand logo in the admin, and instant cache expiry on publish/edit/unpublish while past parties still drop off by time.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-10-17T20:46:56Z
- **Completed:** 2026-10-17T21:01:42Z
- **Tasks:** 2 (+ client screenshots)
- **Files modified:** 17

## Task Commits

1. **Task 1: Access and publishing tests, drafts + published-only access + migration** - `8894def` (feat)
2. **Task 2: Instant revalidation hooks, cached queries, admin branding** - `063b110` (feat)
3. **Client screenshots** - `f9dc9d1` (docs)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/int` | 2 files, 5 tests passed (anonymous sees only published; anonymous create on parties/media/users rejected; queries never return drafts) |
| Parties.ts contains `drafts: true`, `_status` | PASS |
| `grep -c _status src/lib/parties/queries.ts` | 3 |
| `curl -sg '/api/parties?draft=true&where[_status][equals]=draft'` (no cookie) | `"totalDocs":0` |
| `payload migrate:status` | 4 migrations, all Ran |
| `playwright test tests/e2e/admin-party.spec.ts --project=desktop` (dev server) | 1 passed |
| Same spec against `pnpm build && pnpm start` (production caching active) | 1 passed (7.3 s) — publish, edit and unpublish visible on the next request |
| Parties.ts has revalidatePartyAfterChange / AfterDelete | PASS |
| payload.config.ts `graphics` Logo + Icon | PASS |
| `pnpm test` (full) | vitest 7 files / 19 tests passed; playwright 27 passed, 1 skipped (admin spec on mobile by design) |
| typecheck / lint | exit 0 |

## Deviations from Plan

**1. [Rule 3 - Blocking] `next/cache` not resolvable from plain Node ESM** — Playwright global setup and the Payload CLI load the collection config (→ revalidate.ts) outside Next; `next` has no exports map, so the import is `next/cache.js` (the same pattern @payloadcms/next uses for next/navigation.js).

**2. [Rule 1] Stale-while-revalidate after publish** — Next 16 `revalidateTag(tag, 'max')` would serve one stale page; used `{ expire: 0 }`.

**3. [Rule 2] Admin e2e runs with `locale: 'pt-BR'` and `timezoneId: 'America/Sao_Paulo'`** — the admin language follows the browser; date inputs are browser-local.

**4. Unpublish lives in the publish button's popup menu** in Payload 3.91 ("Despublicar" → modal "Confirmar despublicação" → "Confirmar"); the spec uses that flow.

## Issues Encountered

- Date fields store the time as typed in the staff member's browser zone. Staff in Brasília are fine; a staff laptop set to another zone would shift times (help text says "Horário de Brasília"). Payload's per-field `timezone` support could pin this later.
- Screenshots: production build of a separate local `paraiso_demo` database seeded with three generated gradient flyers (no people); DB left in place locally, not part of the repo.

## Next Phase Readiness

- Phase 1 local scope complete except 01-02 Task 2 and 01-10 (client: legal status, VPS/DNS, WhatsApp/staff checks).

## Self-Check: PASSED

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
