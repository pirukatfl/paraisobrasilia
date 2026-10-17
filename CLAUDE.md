<!-- GSD:project-start source:PROJECT.md -->
## Project

**Paraíso Brasília — Site novo**

Site da casa de festas Paraíso Brasília (swingbrasilia.com.br), refeito para ser mais rápido, limpo e moderno. Tem duas partes: uma área aberta, sem nenhum cadastro, que divulga o espaço e as festas para atrair clientes reais; e uma área controlada, só para assinantes, com o ClassiSex (perfis completos com fotos e vídeos) e recados/mensagens com contato.

**Core Value:** Quem chega ao site entende rapidamente o que é a casa, vê as próximas festas e consegue chegar até ela; quem é assinante encontra perfis e consegue fazer contato.

### Constraints

- **Conteúdo adulto**: confirmação 18+ na entrada; área aberta sem nudez explícita nem contatos — protege a indexação e respeita o pedido "tudo sem contato"
- **Direito de imagem**: fotos e vídeos de modelos e frequentadores só com autorização de uso registrada pela casa
- **Privacidade (LGPD)**: dados de assinantes e perfis são sensíveis; acesso restrito, senhas com hash e nada exposto na área aberta
- **Operação**: a equipe da casa precisa publicar sozinha, então o painel deve ser simples
- **Pagamento**: manual (liberação de acesso pelo painel), sem gateway na v1
- **Domínio**: manter swingbrasilia.com.br e preservar URLs importantes com redirecionamentos
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommendation in one paragraph
## Recommended Stack
### Core Technologies
| Technology | Version (npm, 2026-10-17) | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.4.x | Public site (SSG/ISR), members area (SSR), route handlers | One framework for static marketing pages and authenticated pages; Payload 3 installs natively inside it; `next/image` handles responsive flyers |
| Payload CMS | 3.91.x (`payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`) | Staff admin, content models, auth, media, access control | Free/MIT, code-first TypeScript config, built-in auth with expiry-friendly hooks, field-level and collection-level access control (needed to hide contacts from non-subscribers), good non-technical admin UX. Pin versions across all `@payloadcms/*` packages |
| PostgreSQL | 16 or 17 (Docker image) | Primary DB | Relational data (subscribers, profiles, notes, parties). Needed to import from WordPress MySQL; Payload's Postgres adapter is first-class (Drizzle under the hood) |
| React | 19.x | UI | Required by Next 16 |
| TypeScript | 5.x (Payload/Next templates); do not jump to 7.0 until Payload/Next templates officially support it | Types | Payload generates types from config. TS 7.0.2 is on npm but treat as unverified for this toolchain |
| Tailwind CSS | 4.3.x | Styling | Zero-runtime CSS, small bundles = fast mobile; replaces Elementor weight |
### Infrastructure
| Technology | Purpose | Why |
|------------|---------|-----|
| VPS (Hetzner CX/CAX, or a BR VPS such as Contabo/Locaweb/HostGator VPS if latency matters) | Runs Next+Payload container and Postgres | ~US$5-10/mo, no per-request serverless billing, no platform content review. Confirm the chosen provider's AUP explicitly allows legal adult content before paying (see Hosting policy section) |
| Coolify (or plain Docker Compose + Caddy) | Deploy, TLS, backups, git-push deploys | Gives a Heroku-like flow on the VPS; Caddy gives automatic HTTPS |
| Cloudflare (DNS + proxy/CDN only, free plan) | DNS, caching of static assets and `/_next/static`, DDoS protection | Cloudflare terms we read contain no general adult-content ban for CDN; it is the standard fronting layer. Do NOT put gated media through public caching |
| S3-compatible object storage: Backblaze B2 (or Cloudflare R2) | Photos/videos originals and derivatives | Payload `@payloadcms/storage-s3`. Backblaze AUP (read 2026-10) prohibits only CSAM and non-consensual intimate imagery, not legal adult content. R2 terms likewise show no explicit adult ban but reserve right to remove "harmful" content (MEDIUM/LOW). Cheap egress via Cloudflare in front of B2 (Bandwidth Alliance) |
| Postgres backups: nightly `pg_dump` to B2 (via Coolify scheduled backup or `restic`) | Disaster recovery, LGPD obligations | Sensitive data; a lost DB means lost subscribers |
| Transactional email: Resend or Amazon SES (sa-east-1) | Password reset, "access expiring" notices | Check their AUP: transactional mail to consenting members is usually fine, but declare the nature of the site when onboarding |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@payloadcms/storage-s3` | match payload 3.91.x | Upload to B2/R2/S3 | Always; do not store media on the VPS disk |
| sharp | 0.35.x | Image resize/WebP/AVIF, flyer crops | Payload `imageSizes` (e.g. 1080x1080, 1080x1350, 1080x1920 story) and blur placeholders |
| zod | 4.x | Validation for forms/route handlers (contact, story submission) | Any custom input |
| `@node-rs/argon2` | 2.2.x | Password hash for imported users if custom logic needed | Payload hashes new passwords itself (PBKDF2); use argon2 only in the WordPress-import script if verifying legacy hashes (see Migration) |
| MapLibre GL JS (`maplibre-gl`) 6.x OR a plain static map image / Google Maps link | - | Map/address | Recommended: static map image + "Open in Google Maps / Waze" buttons (zero JS, fastest). Use maplibre only if interactive map is demanded. Leaflet 1.9.4 is stagnant |
| Video: self-hosted MP4 (H.264) + poster for teasers; HLS via Bunny Stream or Mux only if needed | - | Venue/profile videos | Start with transcoded MP4 (ffmpeg on upload script, or staff upload pre-compressed). Bunny Stream is a known adult-tolerant option (UNVERIFIED, check ToS). Avoid Cloudflare Stream/Cloudinary/Vimeo/YouTube (see What NOT to Use) |
| `@payloadcms/plugin-seo` | match payload | Title/description/OG fields per page | Satisfies SEO requirement; staff-editable |
| `@payloadcms/plugin-redirects` | match payload | Preserve old WordPress URLs | Migration redirects managed in admin |
| `next-sitemap` or Next native `sitemap.ts`/`robots.ts` | built-in | Sitemap/robots | Use native Next metadata routes; keep gated URLs `noindex` and disallowed |
| `mysql2` | latest | One-off read of the WordPress DB dump | Only in the migration script (devDependency) |
| Vitest + Playwright | latest | Access-control tests, age-gate and paywall E2E | Gated-content leak tests are the highest-value tests here |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Payload template supports it; Node 22 LTS or 24 LTS |
| Docker Compose | Local Postgres + app parity with VPS | Same compose file used by Coolify |
| Biome or ESLint+Prettier | Lint/format | Pick one |
| Lighthouse CI | Mobile performance budget | Enforce LCP < 2.5s on public pages |
## Key Design Decisions Driven by Stack
- **Age gate (18+):** client-side cookie/localStorage modal plus a first-party cookie, no registration. Make it non-blocking for crawlers' metadata (serve full HTML, overlay via CSS/JS) and set `rating: adult` meta + `RTA-5042-1996-1400-1577-RTA` label header/meta. Do not use a server redirect for the gate (hurts SEO and Open Graph previews).
- **Gated content:** Payload collections `profiles`, `notes`, `members-only stories` with `access.read` requiring an active subscriber (`status==='active' && expiresAt > now`). Public "teaser" fields live in separate fields/collections so contact data is never serialized to anonymous responses. Disable the public REST/GraphQL for those collections or enforce via access functions; test it.
- **Private media:** member-only photos/videos go in a separate private bucket; serve through an authenticated Next route that issues short-lived signed URLs (`@aws-sdk/client-s3` v3 + `s3-request-presigner`). Public (marketing) media goes in a public bucket behind CDN. Never rely on obscure URLs.
- **Manual subscription:** `subscribers` auth collection with `plan`, `status`, `expiresAt`, `paidNotes`; a daily cron (Coolify scheduled task or Payload jobs) flips expired accounts and emails reminders. Staff action = edit date in admin. Add a "renew +30/90/365 days" custom admin button.
- **Rendering:** Public pages ISR with `revalidateTag` on Payload `afterChange` hooks, so staff publishing is instantly live while pages stay static (fast mobile).
- **Auth sessions:** Use Payload's built-in cookie JWT auth (httpOnly, secure, sameSite). Rate-limit login (Payload `maxLoginAttempts`/`lockTime`).
## Migration From WordPress
- Get a DB dump + `wp-content/uploads`; the subscriber plugin is unknown (PROJECT.md), so inspect `wp_users`, `wp_usermeta` and plugin tables first. A `mysql2`-based Node script maps users, profiles, posts (contos) and media into Payload via its Local API.
- WordPress hashes are phpass (`$P$`) or bcrypt (WP 6.8+, `$wp$2y$`). Simplest and safest: do NOT port hashes; import accounts and send a "set your new password" email (reset flow). Fallback: custom verify-on-first-login of phpass hash, then rehash.
- Re-encode images to WebP/AVIF through sharp on import; rename test-named uploads; fill alt text from staff review (many missing).
- Redirects: generate the old-URL list from the WordPress sitemap into `plugin-redirects`.
## Installation
# Scaffold (Payload official template, Next + Postgres)
# Core (versions as of 2026-10-17; keep all @payloadcms/* identical)
# Signed URLs for private media
# Styling
# Dev
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next 16 + Payload 3 | Astro 7 (static) + Keystatic/Decap for content + separate auth service | If the members area were dropped or tiny. Git-based CMS cannot do per-user gated data or subscriber management; two systems = more to maintain |
| Payload 3 | Directus / Strapi (separate backend) | If the team prefers a standalone CMS API. More infra (two services) and Strapi's free tier lacks some admin features; Payload shares one deploy |
| Payload 3 | Keep WordPress (lean theme, no Elementor) + membership plugin | Lowest migration effort, but client explicitly wants faster/cleaner and plugin sprawl is the current problem. Valid fallback if budget is minimal |
| Self-hosted VPS | Vercel / Netlify / Cloudflare Pages | Only with written confirmation they accept adult content. Serverless billing for image/video traffic also gets costly |
| Payload built-in auth | Better Auth 1.7 / Auth.js | Only if auth must be shared across non-Payload apps. Extra integration for no gain here |
| Postgres | SQLite (Payload sqlite adapter) | If wanting the cheapest single-file deploy; fine at this scale but weaker for concurrent writes and backups. Postgres preferred |
| B2 + Cloudflare | Bunny Storage/CDN | Good BR/LatAm POPs; verify adult-content ToS first |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| WordPress + Elementor (current) | Heavy DOM, plugin risk, the actual problem being fixed | Next + Payload |
| Cloudinary, Cloudflare Stream/Images, Vimeo, YouTube for explicit/gated media | Cloudinary states it prohibits adult/NSFW content; Stream/Images are content-moderated (blocking "harmful" content); YouTube/Vimeo ban sexual content and gating is weak | S3-compatible storage + self-managed video |
| Vercel / Netlify free tiers for this site | Adult-content stance unclear or restrictive (forum threads, not authoritative); account suspension would take the site down | VPS you control |
| Public S3 bucket for member media | Anyone with a URL bypasses the paywall; leaks sensitive images (LGPD) | Private bucket + signed URLs |
| Serving gated content via client-side hiding | Data still in the response | Server-side access control, test with anonymous requests |
| Stripe/Mercado Pago integration in v1 | Out of scope; payment processors also restrict adult businesses | Manual payment, revisit later with an adult-friendly BR processor |
| Lucia (3.2.2, deprecated library), custom hand-rolled JWT | Maintenance/security risk | Payload auth |
| Google Analytics / third-party trackers by default | LGPD consent burden on sensitive audience | Plausible/Umami self-hosted, cookieless |
| Third-party comment/social embeds | Slow, tracking, off-brand | Plain links to Instagram |
## Hosting Policy Checklist (adult content)
## Stack Patterns by Variant
- Skip a separate video service; MP4 on B2 behind Cloudflare is enough.
- Add a Brazilian Pix provider (Asaas, Efi, Mercado Pago) after confirming it accepts the business category; webhook updates `expiresAt`. Data model already supports it.
- Add a thin custom "Publish party" form view (Payload custom admin views) with only flyer + title + date + text.
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| payload 3.91.x | next 16.x, react 19 | Verify the Payload release notes/peerDeps for Next 16 at install; if not yet supported, pin Next to the highest version in Payload's peerDependencies (LOW: not verified) |
| all `@payloadcms/*` | same exact version as `payload` | Mismatched versions break the admin |
| tailwindcss 4.x | `@tailwindcss/postcss` | v4 config is CSS-first |
| sharp 0.35 | Node 20.9+/22+ | Needed by Next and Payload |
## Sources
- npm registry (`npm view`, 2026-10-17): next 16.4.2, payload 3.91.0, astro 7.4.0, tailwindcss 4.3.3, sharp 0.35.5, zod 4.6.7, react 19.3.1, maplibre-gl 6.14.0, better-auth 1.7.10, lucia 3.2.2, typescript 7.0.2 - HIGH for version numbers
- https://www.backblaze.com/company/policy/acceptable-use-policy - no general adult ban; CSAM and non-consensual imagery only - MEDIUM
- https://www.cloudflare.com/service-specific-terms-developer-platform/ - no adult-content ban stated; Stream/Images/R2 content may be removed if "illegal or harmful" - MEDIUM/LOW (general Cloudflare AUP not read)
- https://cloudinary.com/documentation/ts_dam_does_cloudinary_support_adult_nsfw_content - Cloudinary prohibits adult content - MEDIUM
- https://answers.netlify.com/t/hosting-adult-18-content-on-netlify/2612 - community thread, not read in full - LOW
- Payload feature claims (auth, access control, S3 storage plugin, SEO/redirects plugins) from training knowledge; Context7 not run - MEDIUM, validate in phase 1
- Hetzner, Contabo, Bunny, Resend, SES adult-content policies NOT verified - LOW
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
