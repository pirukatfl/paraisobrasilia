# Walking Skeleton — Paraíso Brasília — Site novo

**Phase:** 1
**Generated:** 2026-10-17

## Capability Proven End-to-End

A staff member logs into `/admin`, creates a party with a flyer, and a visitor opening the home page sees that flyer (and stops seeing it after the party ends) — served by the Next.js + Payload app reading PostgreSQL, run locally with one documented command (`docker compose up -d db && pnpm dev`) and then on the staging VPS.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.4.2 App Router with Payload CMS 3.91.0 embedded (`@payloadcms/next`), React 19.3.1, TypeScript ~5.9 | One deployable for public site, staff admin and later members area; Payload 3.91 peer range supports Next `>=16.3.3 <17` (registry-verified) |
| Data layer | PostgreSQL 16 via `@payloadcms/db-postgres` (Drizzle inside); schema changes ship as Payload migrations in `src/migrations/` (`payload migrate:create` / `payload migrate`); dev uses push mode only locally | Relational data for parties now and subscribers/profiles later; migrations make staging/prod reproducible |
| Data access | Server-only query modules in `src/lib/<domain>/queries.ts` using the Payload Local API and returning DTOs; pages never call REST and components never import Payload | Prevents later leaks of member-only fields into public pages (ARCHITECTURE Pattern 1) |
| Auth | Payload built-in auth on `users` (staff only in Phase 1): httpOnly cookie session, `maxLoginAttempts: 5`, `lockTime: 10 min`, no public sign-up. Subscribers (Phase 3) become a separate auth collection | Do not hand-roll auth; separate principals for staff and members |
| Public rendering | RSC + ISR: home `revalidate = 600` plus tag revalidation (`parties`, `party:{slug}`) from Payload hooks; visibility computed from `endsAt` at query time | Fast cached pages, instant publish, automatic expiry without cron |
| Media | Payload upload collection `media` with sharp `imageSizes` (card, square 1080², portrait 1080×1350, og 1200×630 JPEG); local `staticDir: media` only on developer machines/tests; staging and production store media in a Backblaze B2 bucket via `@payloadcms/storage-s3` (enabled when `S3_BUCKET` is set), served through Payload's file proxy; Phase 4 adds a separate private bucket | CLAUDE.md: never store media on the VPS disk; Backblaze AUP permits legal adult content |
| Age gate | Module `src/lib/age-gate/` with `AgeVerifier` interface; active provider chosen by `AGE_GATE_PROVIDER` (default `self-declaration`); overlay over fully rendered HTML; cookie `pb_age_ok` | Swappable when the legal opinion (ECA Digital, Decreto 12.880/2026) requires stronger verification |
| Styling | Tailwind CSS 4.3.3 CSS-first tokens in `src/app/(frontend)/globals.css` from UI-SPEC; fonts Josefin Sans + Inter via `next/font/google`; no component library | Small public UI; brand palette sampled from the logo |
| i18n | pt-BR only on the public site (`html lang="pt-BR"`); Payload admin `pt` default with `en` fallback | Client and visitors are Brazilian |
| Environments | `SITE_ENV` = `development` / `staging` / `production` drives robots, `X-Robots-Tag`, and secure cookies | Staging must never be indexed |
| Deployment target | Client-owned VPS (provider whose AUP permits legal adult content) running Docker Compose: `app` (Next standalone build) + `db` (postgres:16-alpine, not exposed) + `caddy` (automatic HTTPS); media in Backblaze B2; DNS on Cloudflare (DNS only/proxy) | Control over hosting; no platform content review; same compose reused for production in Phase 7 |
| Directory layout | `src/app/(frontend)` public routes, `src/app/(payload)` generated admin/API, `src/collections/*`, `src/lib/<domain>/*` (server logic), `src/components/*` (UI only), `scripts/*` (one-off), `tests/{unit,int,e2e}`, `docs/discovery/*` | Route groups by trust level; members area later as `src/app/(members)/membros` |
| Testing | Vitest 5 (unit + Local API integration against a `paraiso_test` database), Playwright 1.64 (e2e incl. age gate and OG tags) | Gated-content leak tests in later phases reuse the same harness |

## Stack Touched in Phase 1

- [ ] Project scaffold (framework, build, lint, test runner) — plan 01-01
- [ ] Routing — `/`, `/festas/[slug]`, `/admin`, `robots.txt`, `sitemap.xml` — plans 01-05, 01-07, 01-08
- [ ] Database — real write (staff creates party in admin / seed via Local API) and real read (home query) — plan 01-05
- [ ] UI — staff publish/unpublish in admin; visitor age-gate confirmation and flyer → party page navigation — plans 01-05, 01-06, 01-07, 01-09
- [ ] Deployment — local: `docker compose up -d db && pnpm dev` (plan 01-01); staging VPS with HTTPS and noindex (plan 01-10)

## Out of Scope (Deferred to Later Slices)

- Address, map, "Como chegar", WhatsApp button, social links (Phase 2, INST-02/03; D-07)
- "Quero ir" WhatsApp button per party (deferred idea; D-06)
- Space/model galleries, video, S3 storage, image-rights records (Phase 2)
- Quem Somos, Normas, Regras, Dicas, Termos, Privacidade pages (Phase 2)
- Subscriber accounts, login, expiry, audit log (Phase 3)
- ClassiSex, private media bucket, signed URLs (Phase 4)
- Recados, mensagens, contos (Phase 5)
- WordPress data migration and redirects (Phase 6) — Phase 1 only records discovery facts
- Production DNS cutover, Lighthouse budget enforcement, backups policy (Phase 7)
- Stronger age verification provider (only if the legal opinion requires it)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Visitor understands the whole venue — galleries (S3 public bucket), Quem Somos/Normas/Regras/Dicas, address/map/WhatsApp, legal pages; staff edits them
- Phase 3: Subscriber logs in and keeps access until expiry; staff grants/renews/ends subscriptions with audit trail
- Phase 4: Subscriber browses full ClassiSex profiles (private media, signed URLs); visitors see contact-free previews
- Phase 5: Subscribers exchange recados/mensagens; contos with open excerpt
- Phase 6: Current WordPress subscribers, profiles and URLs migrated
- Phase 7: DNS cutover with < 2.5 s mobile load
