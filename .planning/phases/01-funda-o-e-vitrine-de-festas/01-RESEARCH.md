# Phase 1: Fundação e vitrine de festas - Research

**Researched:** 2026-10-17
**Domain:** Next.js 16 + Payload CMS 3 (Postgres) greenfield scaffold, public "festas" showcase with ISR, Open Graph, 18+ overlay, staging deploy on a VPS, discovery (WordPress, legal, provider AUP)
**Confidence:** MEDIUM-HIGH for stack/versions (registry-verified), MEDIUM for Payload API details, MEDIUM for legal/AUP findings (press + vendor pages, no lawyer)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Identidade visual
- **D-01:** O cliente tem logo e cores definidos. Logo oficial em `brand/logo-original.webp` (fundo preto; arco laranja→vermelho inspirado no Palácio da Alvorada; símbolos ♀ em vermelho e ♂ em dourado; "PARAÍSO" em laranja e "BRASÍLIA" em vermelho, fonte sans fina em caixa alta).
- **D-02:** Paleta derivada do logo: fundo preto/quase preto, laranja (#F08A24 aprox.), vermelho (#C0281E aprox.), dourado (#E8B931 aprox.). Extrair os valores exatos do arquivo. Sem outras cores de destaque.
- **D-03:** Logo vetorial (SVG) ainda não existe; planejar versão otimizada/vetorizada do logo para header e favicon.

#### Clima do site
- **D-04:** Escuro e elegante, estilo casa noturna premium. Fundo escuro, tipografia limpa, destaque em laranja/dourado, nada de neon.

#### Página da festa
- **D-05:** Campos: flyer (1:1 e/ou 4:5), título, data, horário, texto/detalhes, **valores por tipo** (casal, mulher sozinha, homem sozinho — lista editável), **dress code/tema**, **atrações** (DJ, shows, modelos).
- **D-06:** Botão "Quero ir" pelo WhatsApp NÃO foi escolhido; manter só o botão geral de WhatsApp da casa (INST-03, Fase 2). Não adicionar CTA de WhatsApp por festa.

#### Endereço
- **D-07:** Cliente respondeu apontando para o site atual, que hoje NÃO mostra o endereço exato. Seguir o site atual: sem endereço completo na Fase 1 (endereço/mapa é INST-02 na Fase 2; confirmar com o cliente antes daquela fase).

#### Acesso ao WordPress
- **D-08:** O cliente tem login do painel do WordPress e acesso à hospedagem. Credenciais NÃO devem ser enviadas no chat; combinar um meio seguro quando a migração/descoberta precisar. Na Fase 1, a descoberta registra: plugin de assinantes, versão do WP, tipo de hash, URLs indexadas.

### Claude's Discretion
- Stack conforme pesquisa (Next.js + Payload + Postgres, VPS); detalhes de layout, tipografia e componentes.
- Age gate: overlay que não bloqueia o HTML para buscadores, implementado como módulo trocável (ECA Digital).

### Deferred Ideas (OUT OF SCOPE)
- Botão "Quero ir" com mensagem pronta no WhatsApp (não escolhido agora; possível v1.x).
- Endereço completo e mapa — Fase 2, confirmar com o cliente.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEST-01 | Home mostra próximas festas como flyers 1:1 e 4:5, adaptados ao celular | `parties` collection + `media` upload with `imageSizes` (square 1080x1080, portrait 1080x1350, card widths); `next/image` with `sizes`; CSS `aspect-ratio` per `flyerFormat`. Pattern 2, 3 |
| FEST-02 | Clicar no flyer abre a página da festa (texto, data, horário, detalhes) | `/festas/[slug]` route, `generateStaticParams` + ISR; fields from D-05; dates formatted with `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`. Pattern 2, 4 |
| FEST-03 | Compartilhar no WhatsApp/Instagram mostra flyer e título | `generateMetadata` with `metadataBase`, absolute `og:image` from a dedicated `og` image size (1200x630 JPEG, contain on brand black). Pattern 5, Pitfall 3 |
| FEST-04 | Festas passadas saem da home automaticamente | Visibility computed from `endsAt` (default `startsAt + 10h`) at query time + time-based ISR `revalidate` (≤ 15 min) + `revalidateTag` on publish. Pattern 4, Pitfall 2 |
| PAINEL-01 | Equipe publica, edita e despublica festas com flyer, sem ajuda técnica | Payload admin at `/admin`, `versions.drafts` (Publicar / Despublicar), pt-BR admin (`@payloadcms/translations/languages/pt` verified in tarball), labels in Portuguese, required-field validation, crop/focal point on upload. Pattern 1 |
| INST-04 | Confirmação 18+ sem cadastro, módulo trocável | `src/lib/age-gate/` interface + `self-declaration` provider; overlay via CSS + tiny inline script, full HTML always rendered; cookie remembered. Pattern 6, Pitfall 1 (ECA Digital) |
| INST-05 | Título, descrição e prévia corretos em todas as páginas abertas | Root `metadata` (title template, description, `openGraph.siteName = "Paraíso Brasília"`, `locale: 'pt_BR'`), per-page `generateMetadata`, `@payloadcms/plugin-seo` fields on parties, `robots.ts`/`sitemap.ts`, staging `noindex`. Pattern 5, Pitfall 4 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Stack: Next.js 16.4.x + Payload 3.91.x (all `@payloadcms/*` pinned to the same exact version) + PostgreSQL 16/17 + Tailwind 4.3.x + sharp; TypeScript 5.x (do NOT use TypeScript 7.0).
- Hosting on a VPS the client controls (not Vercel/Netlify); Coolify or Docker Compose + Caddy; Cloudflare only as DNS/CDN.
- Public area: no explicit nudity, no profile contacts; age gate must not hide HTML from crawlers; set `rating: adult` meta and RTA label; do not use a server redirect for the gate.
- No Google Analytics / third-party trackers by default; no third-party social embeds (plain links to Instagram).
- Native Next `sitemap.ts`/`robots.ts`; gated URLs `noindex` and disallowed.
- Vitest + Playwright for tests.
- pnpm, Node 22 or 24 LTS, Docker Compose for local Postgres/app parity.
- Pick one of Biome or ESLint+Prettier (the Payload template ships ESLint; keep it).
- GSD workflow: changes go through GSD commands (execution via `/gsd:execute-phase`).

## Summary

The phase is a greenfield walking skeleton: a single Next.js 16 app with Payload 3 embedded (admin at `/admin`, Local API for server-side reads), Postgres, and a public route group that renders the home (upcoming party flyers) and party detail pages as static/ISR HTML. Registry checks on 2026-10-17 confirm `payload`/`@payloadcms/*` 3.91.0, `next` 16.4.2, and that `@payloadcms/next@3.91.0` declares `next: ">=16.3.3 <17.0.0"` as a peer, so Next 16.4 is officially supported. One trap: Payload's peer is `graphql ^16.8.1` while `graphql@latest` is 17.0.2 — pin `graphql@16`.

"Past parties disappear automatically" must not depend on a staff action or a cron. Compute visibility from an `endsAt` timestamp at query time and give the home a short time-based ISR window plus tag revalidation from Payload `afterChange`/`afterDelete` hooks, so publishing is instant and expiry happens within the window. Brasília is `America/Sao_Paulo` (UTC-3, no DST since 2019); every date shown to visitors must be formatted with that zone explicitly, because the server container runs in UTC.

The largest non-technical findings changed since project research: the ECA Digital law is now regulated (Decreto 12.880/2026) and ANPD guidance states that self-declared age alone is insufficient for access to content prohibited to minors. The click-through 18+ gate is therefore acceptable for staging but needs a legal opinion on whether the non-explicit public area falls under "prohibited content" before production; the module must be swappable (the CONTEXT already requires this). Also: a Hetzner representative stated publicly that Hetzner does not allow pornographic content, and Resend's AUP prohibits "pornography/sexually explicit content" in sent mail. The members area (Phase 4) will host explicit media, so the VPS choice for staging should already be a provider that permits legal adult content, or staging must be treated as disposable.

**Primary recommendation:** Scaffold with `create-payload-app@3.91.0` (blank template, Postgres), build the `parties` + `media` collections with drafts and pt-BR admin, render `/` and `/festas/[slug]` from the Local API with ISR + tag revalidation, add the swappable age-gate overlay and full metadata/OG, deploy via Docker Compose to a client-provisioned staging VPS with `noindex`, and write the three discovery records (WordPress, legal brief, provider AUP).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Party CRUD, publish/unpublish | API / Backend (Payload admin + collection config) | Database | Payload owns validation, drafts, access control; staff never touch code |
| Flyer resizing / derivatives | API / Backend (Payload upload + sharp) | Storage (local volume in Phase 1) | Derivatives generated once at upload, not per request |
| Upcoming-party list (FEST-01, FEST-04) | Frontend Server (RSC + Local API query) | CDN (cached HTML) | Filter by `endsAt > now` server side; no client fetching |
| Party detail page | Frontend Server (ISR) | CDN | Static HTML, revalidated on publish |
| OG / metadata | Frontend Server (`generateMetadata`) | — | Crawlers (WhatsApp, Instagram) never run JS |
| Age gate | Browser / Client (overlay + cookie) | Frontend Server (renders markup, never blocks HTML) | Must not hide content from crawlers or use redirects |
| Revalidation on publish | API / Backend (Payload hooks) → Frontend Server cache | — | `revalidateTag('parties')`, `revalidateTag('party:{slug}')` |
| robots / sitemap / noindex on staging | Frontend Server (metadata routes, headers) | — | Environment-driven |
| Staging deploy, TLS | Infrastructure (VPS: Docker Compose + Caddy) | DNS (Cloudflare) | Client controls the account |

## Standard Stack

### Core
| Library | Version (npm, 2026-10-17) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.4.2 | App Router, ISR, metadata, `next/image`, `next/font` | Payload 3.91 peer range `>=16.3.3 <17` [VERIFIED: npm registry peerDependencies of @payloadcms/next@3.91.0] |
| payload | 3.91.0 | CMS core, admin, Local API, auth (staff `users`) | [VERIFIED: npm registry] |
| @payloadcms/next | 3.91.0 | Mounts admin and REST inside Next | same exact version as payload |
| @payloadcms/db-postgres | 3.91.0 | Postgres adapter (Drizzle 0.45.2, pg 8.20.0 internally) | [VERIFIED: npm registry dependencies] |
| @payloadcms/richtext-lexical | 3.91.0 | Rich text for party details | template default |
| @payloadcms/translations | 3.91.0 | `pt` admin language — `dist/languages/pt.js` exists, export map `./languages/*` | [VERIFIED: package tarball inspected] |
| @payloadcms/plugin-seo | 3.91.0 | `meta.title/description/image` fields on parties | [CITED: CLAUDE.md stack] |
| react / react-dom | 19.3.1 | UI | Next 16 requirement |
| typescript | 5.9.3 (pin `~5.9`) | Types | CLAUDE.md: do not use 7.x |
| graphql | 16.14.2 (pin `^16.8.1`) | Payload peer dependency | Payload peer is `^16.8.1`; latest is 17.0.2 — installing latest breaks peer resolution [VERIFIED: npm registry] |
| tailwindcss + @tailwindcss/postcss | 4.3.3 | Styling, CSS-first `@theme` tokens | [VERIFIED: npm registry] |
| sharp | 0.35.5 | Image derivatives (Payload `sharp` config key) | Required for `imageSizes` [CITED: payloadcms.com/docs/upload/overview] |
| PostgreSQL | 16 (Docker image `postgres:16-alpine`) | DB | local `psql` 16.15 present; same major on staging |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 5.0.5 | Unit + integration (Local API against test DB) | All non-browser tests |
| @playwright/test | 1.64.1 | E2E: age gate, home list, OG tags, admin publish flow | Phase gate |
| zod | 4.6.7 | Env var validation (`src/lib/env.ts`) | Optional; validate `DATABASE_URI`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `SITE_ENV` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local upload dir on a Docker volume (Phase 1) | `@payloadcms/storage-s3` + B2/R2 now | S3 adds a provider contract (AUP + purchase) before the first flyer; flyers are public SFW and few. Switch in Phase 2 (MIDIA) when galleries arrive. Keep `staticDir` on a named volume and back it up |
| Payload drafts for publish/unpublish | custom `published` checkbox | Drafts give "Publicar"/"Despublicar" buttons and version history for free |
| Docker Compose + Caddy | Coolify | Coolify is nicer but adds a control plane to learn; Compose file is reusable by Coolify later |

**Installation (executed in Phase 1 by the executor, not now):**
```bash
pnpm dlx create-payload-app@3.91.0 --name paraiso-site --template blank --db postgres   # scaffold into a temp dir, then move into repo root
pnpm add payload@3.91.0 @payloadcms/next@3.91.0 @payloadcms/db-postgres@3.91.0 @payloadcms/richtext-lexical@3.91.0 @payloadcms/translations@3.91.0 @payloadcms/plugin-seo@3.91.0 next@16.4.2 react@19.3.1 react-dom@19.3.1 sharp@0.35.5 graphql@^16.8.1
pnpm add -D typescript@~5.9 tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 vitest@5.0.5 @playwright/test@1.64.1
```

## Package Legitimacy Audit

slopcheck 0.x was installed, but its `install` subcommand installs packages after checking (and auto-detected the PyPI ecosystem in a directory without package.json), so it was not run for npm — running it would have executed an install, which is out of scope for research. Registry metadata was checked instead with `npm view` (creation date, repository, `scripts.postinstall`).

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| next | npm | since 2011 | github.com/vercel/next.js | not run [ASSUMED] | Approved (official) |
| payload | npm | since 2015 | github.com/payloadcms/payload | not run [ASSUMED] | Approved |
| @payloadcms/next, db-postgres, richtext-lexical, translations, plugin-seo | npm | 2022-2024 | github.com/payloadcms/payload (monorepo) | not run [ASSUMED] | Approved; no postinstall scripts |
| tailwindcss, @tailwindcss/postcss | npm | 2017 / 2024 | github.com/tailwindlabs/tailwindcss | not run [ASSUMED] | Approved |
| sharp | npm | since 2013 | github.com/lovell/sharp | not run [ASSUMED] | Approved (no postinstall; prebuilt binaries via optional deps) |
| graphql | npm | since 2015 | github.com/graphql/graphql-js | not run [ASSUMED] | Approved, pin v16 |
| vitest, @playwright/test | npm | 2021 / 2020 | vitest-dev/vitest, microsoft/playwright | not run [ASSUMED] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
*slopcheck was not run against npm, so all packages are tagged `[ASSUMED]`; the planner should put one human-verify checkpoint on the dependency list before the first install (all packages are the official Payload/Next/Tailwind packages with long histories).*

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────── Staff (browser) ────────────────┐
                         │  /admin (Payload, pt-BR)                        │
                         │   create/edit party ─ upload flyer ─ Publicar   │
                         └───────────────┬─────────────────────────────────┘
                                         │ REST (Payload) + auth cookie
                                         ▼
 Visitor ──► Cloudflare DNS ──► Caddy (TLS) ──► Next.js 16 app (one container)
   │                                  │            ├─ (payload) route group: admin + /api
   │                                  │            │      └─ collections: users, media, parties
   │                                  │            │           ├─ upload → sharp → derivatives → /media volume
   │                                  │            │           └─ afterChange/afterDelete → revalidateTag(...)
   │                                  │            └─ (frontend) route group
   │                                  │                   ├─ /            RSC: Local API find(parties where endsAt > now, published) → flyer grid
   │                                  │                   ├─ /festas/[slug] RSC (ISR) → detail + generateMetadata (OG)
   │                                  │                   ├─ robots.ts / sitemap.ts (noindex if SITE_ENV=staging)
   │                                  │                   └─ AgeGate overlay (client island, cookie)
   │                                  ▼
   │                           PostgreSQL 16 (docker volume)
   ▼
 WhatsApp / Instagram crawler ──► /festas/[slug] HTML ──► og:image absolute URL ──► /media/<flyer>-og.jpg
```

### Recommended Project Structure
```
src/
├── app/
│   ├── (frontend)/
│   │   ├── layout.tsx            # html lang="pt-BR", fonts, header/footer, AgeGate, root metadata
│   │   ├── page.tsx              # home: upcoming party flyers
│   │   ├── festas/[slug]/page.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css           # Tailwind 4 @theme tokens from UI-SPEC
│   ├── (payload)/                # generated by template: admin, api routes — do not edit by hand
│   ├── robots.ts
│   ├── sitemap.ts
│   ├── icon.png / apple-icon.png # from logo build script
├── collections/
│   ├── Users.ts                  # staff auth
│   ├── Media.ts                  # public flyers; imageSizes
│   └── Parties.ts                # festas
├── lib/
│   ├── parties/queries.ts        # getUpcomingParties(now), getPartyBySlug(slug) — Local API, DTOs
│   ├── parties/visibility.ts     # isUpcoming(party, now), defaultEndsAt(startsAt)
│   ├── format/date.ts            # formatPartyDate / formatPartyTime (pt-BR, America/Sao_Paulo)
│   ├── age-gate/                 # index.ts (interface + active provider), self-declaration.ts, AgeGate.tsx
│   ├── seo/metadata.ts           # buildPartyMetadata(party), siteMetadata
│   └── env.ts
├── components/                   # Header, Footer, PartyCard, PartyGrid, PriceList, ... (UI only)
├── payload.config.ts
scripts/brand/build-logo-assets.mjs  # sharp: header logo webp/png, favicon, apple-icon
tests/unit/ tests/int/ tests/e2e/
docker-compose.yml, Dockerfile, Caddyfile, .env.example
docs/discovery/ (or .planning/discovery/): WORDPRESS.md, AGE-GATE-LEGAL.md, PROVIDERS-AUP.md
```

### Pattern 1: Party collection with drafts (publish / unpublish)
**What:** `versions: { drafts: true }` gives `_status` (`draft`/`published`) and "Publicar" / "Despublicar" in the admin. Public queries pass `draft: false` and filter `_status: { equals: 'published' }`.
**Fields (D-05):** `title` (text, required), `slug` (text, unique, auto from title in `beforeValidate`, editable), `startsAt` (date, `pickerAppearance: 'dayAndTime'`, required), `endsAt` (date, optional; default `startsAt + 10h` set in `beforeChange`), `flyer` (upload → media, required), `flyerFormat` (select `square` 1:1 | `portrait` 4:5, required, default `portrait`), `summary` (textarea, ≤ 160 chars, used as meta description fallback), `details` (richText), `prices` (array of `{ label: text, value: text }`, defaults "Casal", "Mulher sozinha", "Homem sozinho"), `dressCode` (text), `attractions` (array of `{ kind: select DJ|Show|Modelo|Outro, name: text }`), plus SEO plugin `meta` group.
**Access:** `read` public only for published docs (`({ req }) => req.user ? true : { _status: { equals: 'published' } }`); create/update/delete require a logged-in staff user.
**Admin labels:** collection `labels: { singular: 'Festa', plural: 'Festas' }`, field `label`s and `admin.description` in Portuguese; `admin.useAsTitle: 'title'`, `defaultColumns: ['title','startsAt','_status']`.
[ASSUMED: exact drafts/`_status` API from Payload 3 docs knowledge — verify in `node_modules/payload` types at execution]

### Pattern 2: Media with social-format derivatives
```typescript
// src/collections/Media.ts (sketch)
upload: {
  staticDir: 'media',                       // mounted on a Docker volume
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  focalPoint: true, crop: true,
  imageSizes: [
    { name: 'card',     width: 640 },                 // grid, keeps aspect
    { name: 'square',   width: 1080, height: 1080 },
    { name: 'portrait', width: 1080, height: 1350 },
    { name: 'og',       width: 1200, height: 630, fit: 'contain', background: '#0B0908',
      formatOptions: { format: 'jpeg', options: { quality: 82 } } },
  ],
  adminThumbnail: 'card',
  formatOptions: { format: 'webp', options: { quality: 82 } },
}
// required field `alt` (text) — accessibility and SEO
```
Source: [CITED: payloadcms.com/docs/upload/overview] for `imageSizes`, `crop`, `focalPoint`, `mimeTypes`, `adminThumbnail`, `formatOptions`. Per-size `fit`/`background`/`formatOptions` are [ASSUMED] (sharp resize options are passed through in Payload 3; verify). **Fallback if per-size options are not honoured:** generate the OG JPEG in an `afterChange` hook with sharp (`resize(1200,630,{fit:'contain',background:'#0B0908'}).jpeg({quality:82})`) and store its filename on the doc.
Upload size limit: set `upload: { limits: { fileSize: 15_000_000 } }` in `buildConfig` (phone camera flyers).

### Pattern 3: Responsive flyer grid
`next/image` with `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`, container `aspect-ratio: 1/1` or `4/5` from `flyerFormat`, `object-fit: cover` (the flyer was cropped to that ratio at upload), `priority` on the first card only (LCP). Configure `images.localPatterns`/`remotePatterns` for `/api/media/file/**` or serve `/media` statically.

### Pattern 4: Time-based visibility (FEST-04)
```typescript
// src/lib/parties/visibility.ts
export const PARTY_DEFAULT_DURATION_H = 10
export const defaultEndsAt = (startsAt: Date) => new Date(startsAt.getTime() + PARTY_DEFAULT_DURATION_H * 3600_000)
export const isUpcoming = (p: { endsAt: string }, now = new Date()) => new Date(p.endsAt) > now
// query: where: { and: [{ _status: { equals: 'published' } }, { endsAt: { greater_than: now.toISOString() } }] }, sort: 'startsAt'
```
Home page: `export const revalidate = 600` (10 min) AND the fetch wrapped in `unstable_cache(..., ['parties'], { tags: ['parties'], revalidate: 600 })` or the Next 16 cache API; Payload `afterChange`/`afterDelete` hooks call `revalidateTag('parties')` and `revalidateTag('party:' + slug)` (wrapped in try/catch because hooks also run in scripts/seed outside a request). A party ending at 08:00 disappears by 08:10 at the latest without anyone acting. A party page for a past party stays reachable by direct link (good for shared links) but shows "Esta festa já aconteceu" and is excluded from the sitemap.
[ASSUMED: Next 16 still exports `revalidateTag`/`unstable_cache` from `next/cache`; Next 16 introduced `cacheLife`/`"use cache"` — the executor must check `node_modules/next/dist/docs` or types and pick the stable API; both satisfy the pattern.]

### Pattern 5: Metadata and Open Graph
- Root layout `metadata`: `metadataBase: new URL(env.NEXT_PUBLIC_SERVER_URL)`, `title: { default: 'Paraíso Brasília — Casa de festas liberais', template: '%s | Paraíso Brasília' }`, `description`, `openGraph: { siteName: 'Paraíso Brasília', locale: 'pt_BR', type: 'website', images: ['/og-default.jpg'] }`, `other: { rating: 'adult' }` plus `<meta name="rating" content="RTA-5042-1996-1400-1577-RTA">`.
- Party page `generateMetadata`: `title: party.meta?.title ?? party.title`, `description: party.meta?.description ?? party.summary`, `openGraph: { type: 'website', url: '/festas/' + slug, images: [{ url: ogUrl, width: 1200, height: 630, alt: party.title }] }`, `twitter: { card: 'summary_large_image' }`.
- `og:image` must be an absolute https URL that returns 200 without cookies; WhatsApp ignores very large images (commonly cited ~300 KB limit — [ASSUMED], keep the OG JPEG ≤ 300 KB).
- Staging: `robots: { index: false, follow: false }` in root metadata when `SITE_ENV !== 'production'`, plus `X-Robots-Tag: noindex` header from `next.config` `headers()`. `robots.ts` returns `disallow: '/'` on staging; production disallows `/admin` and `/api`.

### Pattern 6: Swappable age gate (INST-04)
```typescript
// src/lib/age-gate/index.ts
export interface AgeVerifier {
  id: 'self-declaration' | string
  /** Server: may this request skip the overlay? (cookie check, no redirect) */
  isVerified(cookieValue: string | undefined): boolean
  /** Client component rendered as overlay when not verified */
  Prompt: React.ComponentType<{ onVerified: () => void }>
}
export const AGE_COOKIE = 'pb_age_ok'      // value: '1', Max-Age 30 days, Path=/, SameSite=Lax, Secure
export const activeVerifier = selfDeclaration   // chosen by env AGE_GATE_PROVIDER, default self-declaration
```
Rendering: the overlay markup is rendered in the layout for everyone; a blocking inline `<script>` in `<head>` (≈200 bytes) reads `document.cookie` and sets `document.documentElement.dataset.ageOk = '1'`; CSS hides the overlay when `[data-age-ok]` is present (no flash for returning visitors). The page HTML underneath is complete, so crawlers index content and OG previews work. The overlay is a `role="dialog" aria-modal="true"` with focus trap, "Tenho 18 anos ou mais — Entrar" and "Sair" (navigates to `https://www.google.com`). `body` scroll locked while open. No user-agent sniffing (cloaking risk). Reading the cookie client-side keeps pages static (reading cookies on the server would opt the route into dynamic rendering).

### Anti-Patterns to Avoid
- **Server redirect to `/idade`:** breaks OG previews and SEO (CLAUDE.md).
- **`published` checkbox + manual "archive" for past parties:** staff forget; use time-based visibility.
- **Formatting dates without `timeZone`:** container is UTC; a 23:00 party shows as 02:00 next day.
- **Relative `og:image` without `metadataBase`:** WhatsApp shows no image.
- **Editing generated `(payload)` route files or `payload-types.ts` by hand:** regenerate with `pnpm generate:types` / `generate:importmap`.
- **Indexing staging:** duplicate content and leaking the new site before launch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Staff login, sessions, lockout | custom auth | Payload `users` auth collection (`auth: { maxLoginAttempts: 5, lockTime: 600000 }`) | Hashing, cookies, CSRF handled |
| Admin CRUD UI | custom forms | Payload admin + field config | PAINEL-01 "sem ajuda técnica" |
| Publish/unpublish/versions | custom flags | `versions.drafts` | Built-in buttons and history |
| Image resize/crop | custom sharp pipeline per request | Payload `imageSizes` + `next/image` | Derivatives at upload |
| SEO fields | custom meta fields | `@payloadcms/plugin-seo` | Preview + char counters in admin |
| Sitemap/robots | static files | `app/sitemap.ts`, `app/robots.ts` | Env-aware |
| Date formatting | manual string math | `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })` | Correct zone, locale |
| TLS | manual certbot | Caddy automatic HTTPS | Renewals |

**Key insight:** In this phase almost everything the staff touches is configuration of Payload, not custom code; custom code is limited to the public pages, the visibility rule, metadata, and the age-gate module.

## Common Pitfalls

### Pitfall 1: Click-through age gate treated as final compliance
**What goes wrong:** Decreto 12.880/2026 regulates the ECA Digital (Lei 15.211/2025) and ANPD guidance says self-declaration alone is insufficient for accessing content prohibited to minors [CITED: chambers.com article, 2026-06-23; jornaldebrasilia.com.br, 2026-01-06]. Whether a public area without nudity counts as such content is a legal question.
**How to avoid:** Ship the self-declaration provider on staging only; record the legal brief and the lawyer's answer in `AGE-GATE-LEGAL.md`; keep the provider swappable via `AGE_GATE_PROVIDER`. Production launch (Phase 7) is gated on the opinion.
**Warning signs:** no written opinion before launch; gate logic spread across pages instead of one module.

### Pitfall 2: Timezone and "after the date"
**What goes wrong:** A party on Saturday 23:00 disappears at Saturday 00:00 UTC-based midnight, or shows the wrong day.
**How to avoid:** Store instants (UTC) from Payload's date picker, compute visibility from `endsAt`, format with `America/Sao_Paulo`. Set container `TZ=America/Sao_Paulo` as a belt-and-braces measure, but never rely on it. Unit-test `isUpcoming` around midnight and `formatPartyDate` for a 23:00 BRT party.

### Pitfall 3: Broken share previews
**What goes wrong:** WhatsApp shows no image (relative URL, image behind age-gate cookie, WebP not accepted by some scrapers, image > ~300 KB) or the old site name "Paraiso Club".
**How to avoid:** Absolute `og:image` to a JPEG ≤ 300 KB at 1200x630, served without cookies; `og:site_name = "Paraíso Brasília"`; e2e test asserts the `<meta property="og:image">` URL returns 200 with `content-type: image/jpeg`. Manual check with WhatsApp on a real phone (cache: append `?v=updatedAt` to the image URL so edits refresh the preview).

### Pitfall 4: Staging indexed or production noindexed
**How to avoid:** One env var `SITE_ENV` (`development|staging|production`) drives `robots.ts`, root `robots` metadata and the `X-Robots-Tag` header; e2e test checks staging headers.

### Pitfall 5: Payload/Next version drift
**What goes wrong:** Installing `graphql@17` or `typescript@7`, or mismatched `@payloadcms/*` versions, breaks build/admin.
**How to avoid:** Exact pins in package.json (`3.91.0` for every `@payloadcms/*`), `graphql@^16.8.1`, `typescript@~5.9`.

### Pitfall 6: Flyer uploads too heavy / wrong ratio
**How to avoid:** `mimeTypes` image only, `fileSize` limit 15 MB, `flyerFormat` drives crop; the admin `description` on the flyer field says "Envie o flyer em 1080×1080 (quadrado) ou 1080×1350 (vertical)". Required `alt`.

### Pitfall 7: Hosting AUP
**What goes wrong:** Staging built on a provider that bans adult content, then forced migration in Phase 4.
**Evidence:** Hetzner staff on LowEndTalk: "we do not allow pornographic content" (cites T&C 8.2) [CITED: lowendtalk.com/discussion/comment/4502754, MEDIUM]; Resend AUP lists "Pornography/sexually explicit content" and "Escort services" as prohibited sending content [CITED: resend.com/legal/acceptable-use]; Backblaze AUP prohibits only CSAM and non-consensual imagery [CITED: STACK.md]; Cloudinary prohibits adult content [CITED: STACK.md].
**How to avoid:** Record AUP findings in `PROVIDERS-AUP.md` and have the client pick a VPS whose terms allow legal adult content before purchase; staging in Phase 1 contains only SFW flyers so it is low-risk, but the same provider should carry production.

### Pitfall 8: WordPress credentials over chat
**How to avoid (D-08):** The discovery doc records facts (WP version, plugins, hash prefix sample type, indexed URLs) and the agreed secure channel (e.g., password manager share or a temporary WP admin account created by the client, revoked after); never commit credentials; `.env*` in `.gitignore`.

## Code Examples

### Date formatting (pt-BR, Brasília)
```typescript
// Source: ECMA-402 Intl.DateTimeFormat (standard)
const TZ = 'America/Sao_Paulo'
export const formatPartyDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(iso))
  // "sábado, 24 de outubro"
export const formatPartyTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  // "23:00"
```

### Payload admin in Portuguese
```typescript
// Source: payloadcms.com/docs/configuration/i18n + tarball check of @payloadcms/translations@3.91.0
import { pt } from '@payloadcms/translations/languages/pt'
import { en } from '@payloadcms/translations/languages/en'
export default buildConfig({ i18n: { supportedLanguages: { pt, en }, fallbackLanguage: 'pt' }, /* ... */ })
```

### Revalidation hook
```typescript
// src/collections/Parties.ts (sketch)
import { revalidateTag } from 'next/cache'
const revalidateParty: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  try { revalidateTag('parties'); revalidateTag(`party:${doc.slug}`)
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) revalidateTag(`party:${previousDoc.slug}`) } catch {}
  return doc
}
```
[ASSUMED: `revalidateTag` signature in Next 16 — Next 16 may require a second `profile` argument; check types at execution.]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` exporting `proxy` (Node runtime) | Next.js 16 | Phase 1 needs no proxy; use `next.config` `headers()` for `X-Robots-Tag` [CITED: vercel.com/academy/nextjs-foundations/proxy-basics] |
| Click "Sou maior de 18" as compliance | Self-declaration insufficient for content prohibited to minors | Lei 15.211/2025 in force 2026-03; Decreto 12.880/2026 + ANPD guide | Legal opinion before production; swappable module |
| Payload 2 + Express | Payload 3 inside Next App Router | 2024 | Single deploy, Local API in RSC |
| tailwind.config.js | Tailwind 4 CSS-first `@theme` | 2025 | Tokens live in `globals.css` |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Payload drafts API (`versions.drafts`, `_status`, `draft: false` on Local API) unchanged in 3.91 | Pattern 1 | Publish/unpublish wiring differs; low — admin still works |
| A2 | Per-size `fit`, `background`, `formatOptions` in `imageSizes` are passed to sharp | Pattern 2 | OG image cropped instead of letterboxed; fallback hook documented |
| A3 | `revalidateTag`/`unstable_cache` still exported and stable in Next 16.4 | Pattern 4 | Use `"use cache"` + `cacheTag` instead; same behaviour |
| A4 | WhatsApp preview image size limit ≈ 300 KB | Pitfall 3 | Preview missing; keep JPEG small anyway |
| A5 | `create-payload-app@3.91.0 --template blank --db postgres` flags and that the blank template ships Vitest + Playwright config | Install | Executor adds config manually |
| A6 | Party default duration 10 h (e.g., 23:00 → 09:00) | Pattern 4 | Party disappears early/late; staff can set `endsAt` explicitly |
| A7 | Hetzner policy (forum statement by staff, not the T&C text itself) | Pitfall 7 | Client may pick a provider that suspends later |
| A8 | Public area without nudity may or may not be "conteúdo impróprio" under the ECA Digital | Pitfall 1 | Legal exposure — needs lawyer |

## Open Questions

1. **Staging VPS provider and purchase** — What we know: Hetzner is reported to disallow porn; Phase 4 hosts explicit member media. Unclear: which provider the client accepts and who pays. Recommendation: plan a `checkpoint:human-action` for the client to buy/provide a VPS (2 vCPU, 4 GB RAM, 40 GB disk, Ubuntu 24.04) at a provider whose AUP allows legal adult content, plus a staging subdomain (e.g., `novo.swingbrasilia.com.br`) in DNS they control.
2. **Legal opinion (ECA Digital / LGPD)** — needs a lawyer; plan writes the brief and records status; not blocking staging.
3. **WordPress facts** — need the client to share access via a secure channel (D-08) or run the checks themselves; plan a human-action checkpoint and a template the client can fill.
4. **Vector logo** — no SVG exists; Phase 1 uses optimized raster derivatives generated from `brand/logo-original.webp`; a true vector should come from the client's designer (or a traced version later). Ask the client if the original vector file (AI/CDR/PDF) exists.
5. **Fonts** — logo typeface unknown; UI-SPEC picks a close Google Font.

## Environment Availability

| Dependency | Required By | Available (this machine) | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/runtime | ✓ | 22.22.0 | — |
| pnpm | package manager | ✓ | 10.28.0 | `corepack enable` |
| Docker | local Postgres, image build | ✓ (CLI) | 29.8.2 | local `psql` server |
| PostgreSQL client | debugging | ✓ | 16.15 | — |
| Staging VPS | deploy success criterion | ✗ | — | none — client must provision (human-action) |
| Staging DNS record | deploy | ✗ | — | temporary IP + self-signed / `sslip.io` hostname for first smoke test |
| Python Pillow | logo analysis (research only) | ✓ | 12.3.0 | sharp in Node for build script |

**Missing dependencies with no fallback:** staging VPS (client purchase), WordPress access (client), lawyer (client).
**Missing dependencies with fallback:** DNS record (use `<ip>.sslip.io` until the client adds the subdomain).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (unit + int), Playwright 1.64.1 (e2e) |
| Config file | none yet — Wave 0 creates `vitest.config.mts`, `playwright.config.ts` |
| Quick run command | `pnpm test:unit` (`vitest run tests/unit`) |
| Full suite command | `pnpm test` (`vitest run && playwright test`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEST-01 | Home renders published upcoming parties as flyer cards with correct aspect ratio class | e2e | `pnpm exec playwright test tests/e2e/home.spec.ts` | ❌ Wave 0 |
| FEST-02 | Clicking a flyer opens `/festas/<slug>` showing title, date, time, prices, dress code, attractions | e2e | `pnpm exec playwright test tests/e2e/party.spec.ts` | ❌ Wave 0 |
| FEST-03 | Party page has `og:title`, absolute `og:image` returning 200 image/jpeg, `og:site_name` "Paraíso Brasília" | e2e | `pnpm exec playwright test tests/e2e/seo.spec.ts` | ❌ Wave 0 |
| FEST-04 | `isUpcoming` false after `endsAt`; query excludes past and draft parties | unit + int | `pnpm exec vitest run tests/unit/visibility.test.ts tests/int/parties.int.test.ts` | ❌ Wave 0 |
| PAINEL-01 | Staff logs in, creates party with flyer, publishes, unpublishes; home reflects it | e2e (admin) + manual usability check | `pnpm exec playwright test tests/e2e/admin-party.spec.ts` | ❌ Wave 0 |
| INST-04 | First visit shows overlay; "Entrar" sets cookie and hides; reload stays hidden; HTML contains party content before confirming | e2e | `pnpm exec playwright test tests/e2e/age-gate.spec.ts` | ❌ Wave 0 |
| INST-05 | Every public page has title/description/OG; staging sends `X-Robots-Tag: noindex`; robots.txt per env | e2e + unit | `pnpm exec playwright test tests/e2e/seo.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test` (needs Postgres via `docker compose up -d db`)
- **Phase gate:** full suite green + manual WhatsApp preview check + staff usability check before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts`, `playwright.config.ts` (webServer: `pnpm build && pnpm start` with `SITE_ENV=staging`)
- [ ] `tests/helpers/seed.ts` — creates a staff user, a media doc from `tests/fixtures/flyer-portrait.jpg`, one upcoming + one past + one draft party via Local API
- [ ] `tests/fixtures/flyer-portrait.jpg`, `flyer-square.jpg` (generated by sharp, SFW solid-colour placeholders)
- [ ] `package.json` scripts `test`, `test:unit`, `test:int`, `test:e2e`

## Security Domain

### Applicable ASVS Categories (L1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (staff) | Payload auth, `maxLoginAttempts: 5`, `lockTime: 10 min`, strong first-user password, no public sign-up (`create` access only for logged-in users) |
| V3 Session Management | yes | Payload httpOnly cookie, `secure` in staging/prod, `sameSite: 'Lax'` |
| V4 Access Control | yes | Collection `access` functions; public read only published parties/media |
| V5 Input Validation | yes | Payload field validation (required, maxLength, unique slug), `mimeTypes`, file size limit; zod for env |
| V6 Cryptography | yes | `PAYLOAD_SECRET` ≥ 32 random bytes from env; never committed |
| V14 Configuration | yes | Security headers (HSTS via Caddy, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` except admin needs), `.env` not committed, staging noindex |

### Known Threat Patterns for Next + Payload

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Draft/unpublished party leaked via REST `/api/parties` | Information disclosure | `access.read` returns published-only query for anonymous; int test with anonymous Local API (`overrideAccess: false`) |
| Admin brute force | Spoofing | `maxLoginAttempts`/`lockTime`; Cloudflare rate limiting optional |
| Malicious upload (SVG with script, executable) | Tampering / XSS | `mimeTypes` jpeg/png/webp only (no SVG), sharp re-encode |
| Stored XSS in rich text | Tampering | Lexical renders to React (escaped); no `dangerouslySetInnerHTML` |
| Secrets in git | Information disclosure | `.env.example` only; `.gitignore` `.env*` |
| Staging content indexed | Information disclosure | `X-Robots-Tag` + robots disallow |
| Postgres exposed to internet | Elevation | DB port not published in compose on the VPS; only app network |

## Sources

### Primary (HIGH confidence)
- npm registry via `npm view` (2026-10-17): versions, peerDependencies of `@payloadcms/next@3.91.0`, dependencies of `@payloadcms/db-postgres@3.91.0`, engines, repositories, postinstall scripts
- `@payloadcms/translations@3.91.0` tarball: `dist/languages/pt.js` and `./languages/*` export map
- `brand/logo-original.webp` pixel sampling (Pillow): orange #E48424, red text #A82A1E, deep red symbols #961E12, gold #DEB436, background #010101

### Secondary (MEDIUM confidence)
- https://payloadcms.com/docs/upload/overview — imageSizes, crop, focalPoint, mimeTypes, adminThumbnail
- https://payloadcms.com/docs/configuration/i18n — supportedLanguages
- https://vercel.com/academy/nextjs-foundations/proxy-basics — Next 16 proxy.ts
- https://chambers.com/articles/eca-digital-é-regulamentado-e-anpd-publica-orientações-sobre-verificação-etária — Decreto 12.880/2026, ANPD guidance, self-declaration insufficient
- https://jornaldebrasilia.com.br/noticias/politica-e-poder/sedigi-orienta-setor-de-conteudo-adulto-sobre-eca-digital-e-verificacao-de-idade/ — SEDIGI guidance to adult sector
- https://resend.com/legal/acceptable-use — prohibited sending content

### Tertiary (LOW confidence)
- https://lowendtalk.com/discussion/comment/4502754 — Hetzner staff statement on pornographic content
- WhatsApp OG image size limit — community knowledge, not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — registry-verified versions and peer ranges
- Architecture: MEDIUM — standard Payload/Next patterns; some API details assumed (A1-A3)
- Pitfalls: MEDIUM — legal/AUP from press/vendor pages, not legal advice

**Research date:** 2026-10-17
**Valid until:** 2026-11-17 (Next/Payload release monthly; legal guidance evolving)
