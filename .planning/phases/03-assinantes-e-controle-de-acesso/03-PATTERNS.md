# Phase 3 — Pattern Map

> Analog files in the codebase for every file Phase 3 creates or changes. Executors copy the analog's structure, naming and conventions.

| New / changed file | Role | Data flow | Closest analog | What to copy |
|--------------------|------|-----------|----------------|--------------|
| src/access/roles.ts | shared access helpers | req.user → boolean/where | local `isStaff` in src/collections/Parties.ts | same signature `({ req }) => …`; now keyed on `req.user?.collection === 'users'` |
| src/collections/{Parties,Pages,SpaceItems,Models,Media,Videos,Users}.ts, src/globals/Contact.ts, src/fields/imageAuthorization.ts | existing access | — | themselves | replace local `isStaff` / `Boolean(req.user)` / `req.user ? true : …` with imports from src/access/roles.ts; no other change |
| src/collections/Assinantes.ts | auth collection | staff → DB; subscriber login | src/collections/Users.ts (auth block) + Parties.ts (pt labels, `admin.description`, hooks) | `auth: { maxLoginAttempts, lockTime }` + Phase 3 options; pt labels and help on every field; admin group 'Assinantes' |
| src/collections/Plans.ts | collection (no drafts) | staff → DB → public read (active only) | src/collections/Models.ts (access + hooks + order) | `order` number, `expire(['plans'])` in afterChange/afterDelete, `admin.defaultColumns` |
| src/collections/Subscriptions.ts | collection (no drafts, no delete) | staff/service → DB | src/collections/Parties.ts (`beforeChange` computing a default date: `fillDefaultEnd`) | default computed in a hook, date fields with `displayFormat: 'dd/MM/yyyy'`, group field for payment |
| src/collections/AuditLog.ts | append-only collection | hooks/service → DB → staff read | (new) | access create/update/delete `() => false`; read `isStaff`; `admin.defaultColumns`; json field `details` |
| src/lib/assinantes/periods.ts | pure date rules | instants ↔ SP dates | src/lib/parties/visibility.ts + src/lib/format/date.ts | pure exported functions, `TZ = 'America/Sao_Paulo'`, unit tests in tests/unit |
| src/lib/assinantes/plans.ts | server-only cached read → DTO | DB → DTO | src/lib/gallery/queries.ts | `import 'server-only'`, `cached(fn, keyParts, () => ['plans'])`, bounded limit, DTO mapper exported for unit tests |
| src/lib/assinantes/session.ts, access.ts | server-only DAL (never cached) | cookie → user → status | src/lib/site/queries.ts (getPayload usage) | `import 'server-only'`; `getPayload({ config })`; React `cache()` per request; **no** `cached()` |
| src/lib/assinantes/actions.ts | `'use server'` actions | form → payload → cookie → redirect | (new; Next docs `02-guides/forms.md`, `server-actions.md`) | `FormData` parsing by hand, `redirect()` with query error codes, re-check principal in each action |
| src/lib/assinantes/service.ts, audit.ts | domain services | staff request → DB | src/migrations/seed/markdown-to-lexical.ts (`seedPages(payload)` takes a Payload instance) | functions take `payload` (+ `req`/user) so int tests call them directly |
| src/components/admin/assinantes/*.tsx | admin custom components | admin ↔ endpoints | src/components/admin/Logo.tsx (registered by path string in payload.config.ts) | path string `'/components/admin/assinantes/X#X'`, then `pnpm generate:importmap` |
| src/app/(frontend)/{entrar,nova-senha,assine-ja}/page.tsx | server pages | DTO → HTML | src/app/(frontend)/contato/page.tsx | `export const dynamic = 'force-dynamic'`, `buildPageMetadata` (members/auth pages add `robots: { index: false }`), section/H1 structure, token classes |
| src/app/(frontend)/(membros)/layout.tsx + area-do-assinante/** | members route group | session → HTML | src/app/(frontend)/quem-somos/[secao]/page.tsx + src/components/SubNav.tsx | sub-nav reuse; guard via DAL in each page (never only in layout) |
| src/lib/site/nav.ts, src/components/Footer.tsx | nav registry | — | itself | add 'Assine Já' and 'Área do assinante' entries; keep `isActivePath` behaviour |
| src/app/robots.ts, src/lib/seo/sitemap.ts, next.config.ts | SEO/headers | — | themselves | add disallow/noindex for members/auth paths; sitemap gains `/assine-ja` only |
| src/migrations/*.ts | schema + seed | — | src/migrations/20261019_025904_pages.ts (data step in `up`, idempotent) | `CI=true PAYLOAD_MIGRATING=true pnpm payload migrate:create <name>`; seed only when missing |
| tests/int/*.int.test.ts | integration | — | tests/int/parties-access.int.test.ts, tests/int/models.int.test.ts | `getTestPayload()`, `resetDatabase()`, `overrideAccess: false` + `user: { ...doc, collection }` for principal tests |
| tests/e2e/*.spec.ts | e2e | — | tests/e2e/admin-party.spec.ts (staff), tests/e2e/modelos.spec.ts (staffApi setup) | `pb_age_ok` cookie in beforeEach, role-based locators, staff REST helper for data, separate `browser.newContext()` per principal |
| tests/helpers/seed.ts | test data | — | itself | RESET_ORDER children first: `'audit-log','subscriptions','assinantes','plans', 'models', …`; `seedAssinante`, `seedPlan`, `seedSubscription` (Local API, `context: { trustedCreate: true }` for assinantes) |
| tests/e2e/helpers/api.ts | staff REST client | — | itself | `createAssinante`, `createPlan`, `createSubscription`, `liberar`, `encerrar` via the staff JWT header |
| tests/e2e/helpers/assinante.ts | subscriber login helper | — | tests/e2e/helpers/staff.ts | `loginAsAssinante(page, email, password)` through `/entrar` |
| docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md | docs (pt) | — | themselves | same tone; new "Assinantes" sections |

## Conventions observed
- Comments in English, UI/admin copy in Portuguese; threat IDs referenced in code comments (`// T-03-xx`).
- No hard-coded hex in components (tokens `bg-surface`, `text-muted`, `type-label`, `btn-primary`, `btn-secondary`).
- Every public query: published/active-only, bounded, cached with tags, DTO out. **Every subscriber-specific read: never cached, DAL-guarded.**
- `'.js'` suffix on `next/cache.js` imports in modules loaded by plain Node (migrations/seed).
- Collection slugs: `assinantes` (requested by the orchestrator, also the REST path); new non-auth collections keep the English convention (`plans`, `subscriptions`, `audit-log`); admin labels are Portuguese.
- Admin group for everything in this phase: `'Assinantes'`.
