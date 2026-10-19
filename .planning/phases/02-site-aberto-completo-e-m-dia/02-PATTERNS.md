# Phase 2 — Pattern Map

> Analog files in the codebase for every file Phase 2 creates or changes. Executors copy the analog's structure, naming and conventions.

| New / changed file | Role | Data flow | Closest analog | What to copy |
|--------------------|------|-----------|----------------|--------------|
| src/globals/Contact.ts | Payload global | staff → DB → public read | src/collections/Parties.ts | pt labels + `admin.description` on every field, `isStaff` helper, hooks registering revalidation |
| src/collections/Pages.ts | collection with drafts | staff → DB → public published-only | src/collections/Parties.ts | `versions: { drafts: true, maxPerDoc: 20 }`, `access.read` published filter for anonymous, restricted `lexicalEditor({ features })` |
| src/collections/SpaceItems.ts, src/collections/Models.ts | collection with drafts + uploads | staff → DB/MEDIA_DIR → public | src/collections/Parties.ts (`flyer` upload field, `prices` array) | upload relation fields, arrays with labels, `defaultColumns`, `listSearchableFields` |
| src/collections/Videos.ts | upload collection | staff → MEDIA_DIR/videos | src/collections/Media.ts + payload.config.ts spread that injects `staticDir` | `mimeTypes` allowlist, `alt`-style required text, staticDir set in payload.config.ts from MEDIA_DIR |
| src/fields/imageAuthorization.ts | shared field | staff only | (new) — follow Parties field style | group field, no `required`, field-level `access.read` staff-only |
| src/lib/cache/cached.ts | cache helper | — | `cached()` in src/lib/parties/queries.ts | move verbatim (incl. `incrementalCache missing` fallback); parties/queries.ts imports it |
| src/lib/cache/expire.ts | revalidation helper | — | `expire()` in src/lib/parties/revalidate.ts | move verbatim; `'next/cache.js'` import suffix (loaded by plain Node in migrations/seed) |
| src/lib/site/queries.ts, src/lib/pages/queries.ts, src/lib/gallery/queries.ts | server-only cached reads → DTOs | DB → DTO | src/lib/parties/queries.ts | `import 'server-only'`, `getPayload({ config })`, `draft: false` + `_status: published`, bounded `limit`, DTO mappers exported for unit tests, `toFlyerImage`-style size fallback |
| src/lib/site/contact.ts | pure link builders | DTO → URLs | src/lib/format/date.ts | pure functions + unit tests in tests/unit |
| src/lib/*/revalidate hooks | afterChange/afterDelete | staff write → tag expiry | src/lib/parties/revalidate.ts | swallow errors outside Next; tags documented in a header comment |
| src/app/(frontend)/{quem-somos,espaco,modelos,contato,termos-de-uso,politica-de-privacidade}/page.tsx | server pages | DTO → HTML | src/app/(frontend)/festas/[slug]/page.tsx and page.tsx | `export const dynamic = 'force-dynamic'`, `generateMetadata`, `notFound()` when missing |
| src/components/RichText.tsx | renderer | Lexical JSON → HTML | src/components/party/PartyDetails.tsx (`RichText` from `@payloadcms/richtext-lexical/react`) | same import; add heading support and typography classes |
| src/components/Gallery.tsx, Lightbox.tsx, MobileMenu.tsx | client islands | — | src/lib/age-gate/AgeGate.tsx | `'use client'`, minimal state, reduced-motion handling, a11y attributes |
| src/components/Nav.tsx, Footer.tsx, Header.tsx | layout | contact DTO → HTML | src/components/Header.tsx, Footer.tsx | token classes only (`bg-bg`, `text-muted`, `type-label`), no hex in components |
| src/migrations/*.ts | schema + seed | — | src/migrations/20261017_204729_party_drafts.ts (data step in `up`) | create with `CI=true PAYLOAD_MIGRATING=true pnpm payload migrate:create <name>`; append data steps in `up` via `payload` arg; register in index.ts (generated) |
| tests/int/*.int.test.ts | integration | — | tests/int/parties-access.int.test.ts | `getTestPayload()`, `resetDatabase()`, `overrideAccess: false` anonymous assertions |
| tests/e2e/*.spec.ts | e2e | — | tests/e2e/home.spec.ts, admin-party.spec.ts | `pb_age_ok` cookie in beforeEach, role-based locators, staff login helper from admin-party.spec.ts |
| tests/helpers/seed.ts | test data | — | itself | extend `RESET_ORDER` (children before parents: models, space-items, videos, pages, parties, media, users) and add seed helpers `seedContact`, `seedPage`, `seedSpacePhoto`, `seedModel` |
| docs/deploy/STAGING.md | runbook (pt) | — | itself | same tone; new sections only |

## Conventions observed
- Comments in English, UI/admin copy in Portuguese.
- Threat IDs referenced in code comments (`// T-02-xx`).
- No hard-coded hex in components (tokens only); sharp background hex allowed as data.
- Every public query: published-only, bounded, cached with tags, DTO out (never raw Payload docs to components).
