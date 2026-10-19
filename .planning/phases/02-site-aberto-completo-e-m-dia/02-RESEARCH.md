# Phase 2: Site aberto completo e mídia - Research

**Researched:** 2026-10-19
**Domain:** Payload 3.91 globals/collections for institutional content and public media (photos + MP4), Next 16 public pages, maps without paid keys, LGPD-facing legal pages
**Confidence:** HIGH for codebase patterns (read from the repo), MEDIUM for Payload video byte-range serving and markdown→Lexical seeding (verify in Wave 1 tasks), HIGH for site-content findings (fetched 2026-10-19)

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Full address and map OPEN to everyone: "Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450". "Como chegar" buttons for Google Maps and Waze. Address editable in the panel (contact global).
- **D-02** Map free and without heavy tracking (no paid key); staff can adjust lat/lng in the panel because geocoding in the rural zone can be wrong.
- **D-03** Single WhatsApp (61) 99988-9772 → `https://wa.me/5561999889772`; also phone and e-mail suporte@swingbrasilia.com.br.
- **D-04** No Facebook. Instagram optional (new handle not yet informed): hidden when empty; never show the old links.
- **D-05** Reuse and REVISE the current Quem Somos / Normas / Regras / Dicas (and FAQ) texts; elegant tone; no explicit content in the open area; editable in the panel.
- **D-06** Missing information may be taken from the current site.
- **D-07** No new professional photos; galleries work EMPTY with an elegant empty state until the WordPress backup arrives; staff can upload through the panel.
- **D-08** Models gallery: photo + artistic NAME, max 3 photos per model, no individual page (grid + lightbox); secondary section, hidden when no published model; design must not depend on it.
- **D-09** Image authorization: simple, NON-blocking field ("Autorização de uso de imagem": date + note), recommended, not required to publish. Privacy Policy states the channel to request image removal; fast removal through the panel.
- **D-10** Home must work well without upcoming parties (space, previews, subscription); two domains later (Phase 7).

### Claude's Discretion
- Routes and menu; draft Terms/Privacy text marked "rascunho, revisar com advogado"; venue videos as MP4 upload with poster, no external service.

### Deferred Ideas (OUT OF SCOPE)
- Second domain (Phase 7). Automatic WordPress photo import (depends on backup; Phase 6 unless it arrives in time).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIDIA-01 | Galeria de fotos e vídeos do espaço | Pattern 3 (space gallery collection + `videos` upload collection), Pattern 5 (video serving) |
| MIDIA-02 | Galeria de fotos das modelos | Pattern 4 (`models` collection, `photos` array `maxRows: 3`) |
| MIDIA-03 | Carregamento rápido no celular | Pattern 6 (WebP derivatives, `sizes`, lazy loading, `preload="none"` videos, no client JS except lightbox island) |
| INST-01 | Quem Somos com Normas, Regras, Dicas | Pattern 2 (`pages` collection with fixed keys + seeded content from 02-CONTENT.md) |
| INST-02 | Endereço, mapa, Como chegar | Pattern 1 (contact global with lat/lng, OSM embed, Google/Waze deep links) |
| INST-03 | WhatsApp e redes oficiais | Pattern 1 (contact global; `wa.me`; Instagram optional) |
| INST-06 | Termos e Política de Privacidade | Pattern 2 (same `pages` collection, keys `termos`, `privacidade`), drafts in 02-CONTENT.md |
| PAINEL-02 | Equipe envia fotos/vídeos com autorização | Patterns 3–4 (`imageAuthorization` group, non-blocking), upload limits (Pitfall 2) |
| PAINEL-04 | Equipe edita textos e contatos | Patterns 1–2 (global + pages, pt labels, revalidation hooks) |

## Project Constraints (from CLAUDE.md)

- Open area: no explicit nudity, no member contacts; 18+ gate stays.
- Image rights: photos of models/frequenters only with authorization registered by the house (D-09 makes the field recommended, not blocking — client decision; policy text records the removal channel).
- LGPD: nothing sensitive exposed in the open area.
- Staff must publish alone: simple panel, Portuguese labels and help texts.
- Media stays on the VPS disk under `MEDIA_DIR` (named volume `media`); no object storage; no Cloudinary/YouTube/Vimeo/Cloudflare Stream.
- Pin `@payloadcms/*` 3.91.0; no new runtime dependency needed in this phase.

## Summary

Everything this phase needs exists in the current stack: a Payload **global** (`contact`) for address/coords/WhatsApp/phone/e-mail/Instagram; a **`pages`** collection keyed by a fixed `key` select (quem-somos, normas, regras, dicas, termos, privacidade) with drafts and a restricted Lexical editor; two media collections — the existing `media` (images, WebP derivatives) plus a new **`videos`** upload collection (MP4, poster relation to `media`) — and two content collections, **`space-items`** (gallery entries: photo or video, caption, order, authorization) and **`models`** (artistic name, 1–3 photos, order, authorization). Public queries follow the Phase 1 pattern exactly (published-only `payload.find`, `unstable_cache` with tags, `revalidateTag(tag, { expire: 0 })` in afterChange/afterDelete hooks).

The map uses an OpenStreetMap embed iframe (no key, no Google cookies) driven by staff-editable lat/lng, with "Como chegar" deep links to Google Maps (`/maps/dir/?api=1&destination=lat,lng`) and Waze (`waze.com/ul?ll=lat,lng&navigate=yes`); the old site's Google place link gives initial coordinates −15.5936421, −47.9771526 (to be confirmed by the client).

Content research (02-CONTENT.md) found: "Regras da Casa" (9 rules + principles) and "Sobre a casa" pages are public; "Dicas Hot", galleries, Rede Social and blog posts are members-only; the FAQ page has an empty FAQ block; the current Privacy Policy is the WordPress default template. Revised pt-BR texts and draft Terms/Privacy are in 02-CONTENT.md and become seed content via a data migration.

**Primary recommendation:** six sequential vertical slices (schema changes serialize because every Payload migration snapshot includes the whole schema): contact+navigation → institutional/legal pages → space gallery (photos+videos) → models → home without parties + performance/sitemap → staging verification with the client.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Contact data, texts, galleries storage | Payload (DB + MEDIA_DIR) | — | Staff-edited, versioned |
| Public pages | Next server components (force-dynamic + tagged data cache) | — | Same as Phase 1; build has no DB |
| Lightbox / mobile menu | Client island (small) | Server renders full list | Keep JS minimal (MIDIA-03) |
| Map | Third-party iframe (openstreetmap.org) lazy-loaded | Deep links | No key, no paid API |
| Video bytes | Payload file route `/api/videos/file/*` (verify Range → 206) | Fallback Next route handler streaming from MEDIA_DIR | Seeking on iOS needs byte ranges |
| Removal requests | Staff in admin (unpublish/delete) | Privacy Policy channel | D-09 |

## Standard Stack

### Core (already installed — no installs in this phase)
| Library | Version | Purpose |
|---------|---------|---------|
| payload / @payloadcms/* | 3.91.0 | globals, collections, uploads, drafts, Local API, migrations |
| next | 16.4.2 | pages, `next/image`, metadata routes |
| sharp | 0.35.5 | WebP derivatives, EXIF stripping |
| tailwindcss | 4.3.3 | tokens from 01-UI-SPEC |
| vitest 5.0.5 / @playwright/test 1.64.1 | — | int/unit + e2e |

### Supporting (no package)
| Need | Use | Why |
|------|-----|-----|
| Lightbox | Native `<dialog>` + `showModal()` client island | Zero dependency, accessible focus trap/Escape built in |
| Map | `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=…&layer=mapnik&marker=lat,lng" loading="lazy">` | Free, no key, no Google tracking |
| Video | `<video controls preload="none" playsInline poster=…>` with MP4 (H.264/AAC) | No external video service (CLAUDE.md) |
| Markdown seed → Lexical | `convertMarkdownToLexical` + `editorConfigFactory` from `@payloadcms/richtext-lexical` (ASSUMED present in 3.91 — verify; fallback: build Lexical JSON with a tiny local helper for paragraphs/headings/lists) | Seed texts from 02-CONTENT.md |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OSM iframe | Google Maps embed `?output=embed` (no key) | Sets Google cookies/tracking (D-02 prefers light); kept only as the "Como chegar" link |
| OSM iframe | Static map image | Needs a tile/render service or an API key |
| `pages` collection | One global per page (6 globals) | Globals have no list view; collection gives one "Páginas" list with drafts and SEO; fixed `key` select prevents arbitrary new pages |
| Lightbox lib (yet-another-react-lightbox, PhotoSwipe) | `<dialog>` | Library adds 20–40 KB; not needed for ≤ 60 images |

**Version verification:** no new packages. `npm view payload version` / `npm view @payloadcms/richtext-lexical version` may be used read-only to confirm 3.91.0 is still the pinned line; do not upgrade in this phase.

## Package Legitimacy Audit

No new packages are introduced in Phase 2. Nothing to audit.

## Architecture Patterns

### System Architecture Diagram

```
Staff (/admin, pt) ──► Payload: global `contact`, collections `pages`, `space-items`, `models`, `media`, `videos`
                          │  afterChange/afterDelete hooks → revalidateTag('contact'|'pages'|'page:{key}'|'space'|'models', {expire:0})
                          ▼
              Postgres (pgdata volume)      MEDIA_DIR (media volume): images (+WebP sizes), videos/*.mp4
                          │                                  │
Visitor ─► Next server components (force-dynamic) ─► src/lib/{site,pages,gallery}/queries.ts (unstable_cache + tags)
            /, /quem-somos, /quem-somos/{normas,regras,dicas}, /espaco, /modelos, /contato, /termos-de-uso, /politica-de-privacidade
            Header nav + Footer (contacts, WhatsApp, legal links) read the cached `contact` global
            Client islands: AgeGate (exists), MobileMenu (disclosure), Lightbox (<dialog>)
            Third party (lazy): openstreetmap.org iframe on /contato; outbound links: wa.me, Google Maps, Waze, Instagram
```

### Recommended Project Structure (new/changed)
```
src/
  globals/Contact.ts                     # global `contact`
  collections/Pages.ts                   # institutional + legal pages (fixed keys)
  collections/Videos.ts                  # MP4 uploads (staticDir MEDIA_DIR/videos)
  collections/SpaceItems.ts              # space gallery entries (photo | video)
  collections/Models.ts                  # models (name + 1..3 photos)
  fields/imageAuthorization.ts           # shared non-blocking group field
  lib/cache/cached.ts, lib/cache/expire.ts   # extracted from parties/queries.ts + revalidate.ts
  lib/site/{queries.ts,contact.ts,nav.ts}    # contact DTO, links (wa.me, maps, waze), nav items
  lib/pages/{queries.ts,keys.ts}
  lib/gallery/{queries.ts,types.ts}
  components/{Nav.tsx,MobileMenu.tsx,ContactBlock.tsx,MapEmbed.tsx,RichText.tsx,Gallery.tsx,Lightbox.tsx,VideoTile.tsx,EmptyState.tsx}
  app/(frontend)/{quem-somos/page.tsx,quem-somos/[secao]/page.tsx,espaco/page.tsx,modelos/page.tsx,contato/page.tsx,termos-de-uso/page.tsx,politica-de-privacidade/page.tsx}
  migrations/2026…_contact.ts, …_pages.ts (+ seed), …_space_gallery.ts, …_models.ts
```

### Pattern 1: Contact global with staff-editable coordinates (INST-02, INST-03, PAINEL-04)
Global `contact` (label "Contato e endereço"), `access.read: () => true`, `update: isStaff`. Fields: `addressLine` (text, required), `addressDetail` (text: "Núcleo Rural Lago Oeste, Sobradinho – DF"), `postalCode` (text), `lat` / `lng` (number, optional, help "Copie do Google Maps: clique com o botão direito no local → coordenadas"), `whatsapp` (text, digits with country code, validate `/^55\d{10,11}$/`), `phone` (text, display form), `email` (email), `instagram` (text, optional handle without @; validate `/^[A-Za-z0-9._]{1,30}$/`), `hours` (textarea optional, e.g. "Abrimos das 22h às 5h"). afterChange → `expire(['contact'])`. Derived links in `src/lib/site/contact.ts` (pure, unit-tested): `whatsappUrl = https://wa.me/{digits}`; `googleMapsUrl = lat&&lng ? https://www.google.com/maps/dir/?api=1&destination={lat},{lng} : …&destination={encodeURIComponent(full address)}`; `wazeUrl = lat&&lng ? https://waze.com/ul?ll={lat},{lng}&navigate=yes : https://waze.com/ul?q={encoded}&navigate=yes`; `osmEmbedUrl(lat,lng)` with bbox ±0.01 lng / ±0.006 lat; `instagramUrl = handle ? https://www.instagram.com/{handle}/ : null`.
Seed via the migration's `up` (Local API `payload.updateGlobal`) with D-01..D-03 values and coordinates −15.5936421 / −47.9771526 (from the old site's Google place link; client must confirm).

### Pattern 2: Fixed-key institutional pages (INST-01, INST-06, PAINEL-04)
Collection `pages` (labels Página/Páginas), drafts (`versions.drafts`), `key` select unique required with options quem-somos | normas | regras | dicas | termos | privacidade (staff cannot invent routes; admin hides "Criar novo" via `admin.hideAPIURL` not needed — prevent creation of duplicates by `unique: true`), `title`, `intro` (textarea ≤ 200, used as meta description), `body` richText with Paragraph, Heading (h2, h3 only), Bold, Italic, Ordered/Unordered list, Link — no uploads/embeds. `updatedLabel` not needed: show "Atualizado em {date}" from `updatedAt` on legal pages. SEO plugin extended to `pages`. Read access: staff all; anonymous `_status = published`. Hooks expire `pages` and `page:{key}`. Routes map keys → paths in `src/lib/pages/keys.ts` (single source for nav, sitemap, revalidation).
Seed: data migration reads the six texts (copied from 02-CONTENT.md into `src/migrations/seed/pages-content.ts` as markdown strings) and creates published docs; `down` deletes them. Seeding must be idempotent (skip when a doc with that key exists) because staging may already have staff edits by the time a later migration runs.

### Pattern 3: Space gallery (MIDIA-01, PAINEL-02)
`videos` upload collection: `mimeTypes: ['video/mp4']`, `staticDir: path.join(MEDIA_DIR,'videos')`, fields `alt`/`title` (text required "Descrição do vídeo"), `poster` (upload → media, required — gives LCP-safe thumbnail). `space-items` collection (labels "Foto ou vídeo do espaço"/"Galeria do espaço"): `kind` radio photo|video, `image` (upload media, required when kind=photo via `admin.condition` + validate), `video` (upload videos, required when kind=video), `caption` (text ≤ 80, optional), `order` (number, default 0; sort `order` then `-createdAt`), `imageAuthorization` group (shared field), drafts. Public query returns DTOs `{id, kind, caption, image:{url,width,height,alt,thumbUrl}, video?:{url, posterUrl, title}}`, limit 120.

### Pattern 4: Models (MIDIA-02, D-08, D-09)
Collection `models` (labels Modelo/Modelos): `name` (text required, "Nome artístico"), `photos` array `minRows: 1, maxRows: 3` of `{ image: upload media required }` (Payload enforces maxRows server-side → a 4th photo fails validation), `order` number, `imageAuthorization` group, drafts. No slug, no detail route. Page `/modelos` and nav link render only when `getPublishedModels().length > 0`; otherwise `/modelos` returns `notFound()` (not an empty page) so the section is truly hidden.

### Shared field: `imageAuthorization` (D-09)
`{ type: 'group', name: 'imageAuthorization', label: 'Autorização de uso de imagem', admin: { description: 'Recomendado, não obrigatório para publicar. Ex.: "Enviou as fotos por WhatsApp para divulgação em 12/10/2026".' }, fields: [ { name: 'date', type: 'date', label: 'Data da autorização' }, { name: 'note', type: 'textarea', label: 'Observação' } ] }` — no `required`, no validate. Field read access: staff only (`access.read: ({req}) => Boolean(req.user)`) so the note never reaches anonymous REST responses (it may contain personal information).

### Pattern 5: Serving MP4 with byte ranges
iOS Safari refuses to play/seek MP4 without `Accept-Ranges`/206 responses. Payload 3 serves local uploads through `/api/{collection}/file/{filename}`; byte-range support in 3.91 is ASSUMED (A1) — verify with an int/e2e test (`Range: bytes=0-99` → 206, `Content-Range` header). If it fails, add `src/app/(frontend)/video/[file]/route.ts` that resolves the filename inside `MEDIA_DIR/videos` (reject `..`/path separators), stats the file, and streams `fs.createReadStream(path,{start,end})` with 206 + `Accept-Ranges: bytes` + `Content-Type: video/mp4` + `Cache-Control: public, max-age=31536000, immutable`; DTO `video.url` then points there.

### Pattern 6: Fast on mobile (MIDIA-03)
- Thumbnails: `media.sizes.card` (640 w WebP) in grid via `next/image` with `sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"`, `loading="lazy"` (no `priority` on gallery pages except the first item).
- Lightbox loads the full image (original WebP re-encode, ≤ 1080 w via new `large` size 1600 w? — use existing `square`/`portrait` only for flyers; add `gallery` size width 1600 WebP).
- Videos: `preload="none"` + poster; nothing downloads until play.
- Budget: gallery page transfers ≤ 600 KB before interaction with 12 items on a 390 px viewport (e2e measures with `performance.getEntriesByType('resource')`).

### Anti-Patterns to Avoid
- Global `upload.limits.fileSize` raised for videos without a per-collection guard → 150 MB images accepted. Validate images ≤ 15 MB in `media` `beforeValidate`/`beforeOperation` using `req.file.size`.
- Hard-coded address/WhatsApp in components (must come from the global).
- Rendering the OSM iframe above the fold on the home (third-party cost on LCP) — only on /contato, `loading="lazy"`.
- Leaking `imageAuthorization.note` via `/api/models` (field-level read access).
- Seeding pages in a way that overwrites staff edits on later deploys.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Focus trap / Escape in lightbox | custom trap | native `<dialog>.showModal()` |
| Image resizing | custom sharp script | Payload `imageSizes` |
| Rich text rendering | HTML strings | `RichText` from `@payloadcms/richtext-lexical/react` (already used for party details? check PartyDetails.tsx and reuse its renderer) |
| Geocoding | API call | staff-editable lat/lng |

## Common Pitfalls

### Pitfall 1: Parallel Payload migrations
Each `migrate:create` writes a JSON snapshot of the whole schema; two plans creating migrations in parallel produce conflicting snapshots. **Plans that change schema run in separate, sequential waves.**

### Pitfall 2: Upload size limits
`upload.limits.fileSize` is 15 MB globally (Phase 1). Videos need more: raise to 100 MB (`104857600`) and enforce 15 MB for images in the `media` collection. Help text asks staff to export H.264 720p, ≤ 100 MB, ≤ 2 min. Caddy has no body limit by default; Next route body limit does not apply to Payload's REST upload handler. Disk growth: document in STAGING.md (media volume).

### Pitfall 3: Image removal leaves cached copies
Deleting a `media` doc deletes the files from MEDIA_DIR, but the Next image optimizer cache (`.next/cache/images`, default `minimumCacheTTL` 4 h in Next 16) may still serve `/_next/image?url=…` until expiry. Privacy Policy promises removal "em até 24 horas"; runbook explains "Excluir" (not only "Despublicar") for removal requests.

### Pitfall 4: Seed content vs staff edits
Seed only when missing (by key). Never `update` existing pages in later migrations.

### Pitfall 5: Rich text from markdown
If `convertMarkdownToLexical` is unavailable or changes shape, seed fails the migration → deploy fails (migrations run on deploy). Keep a unit test that converts each seed text and asserts root children > 0, and run `payload migrate` against the test DB in the plan's verify.

### Pitfall 6: Explicit content in the open area
Texts in 02-CONTENT.md are deliberately non-explicit; staff edits are their responsibility, but the Lexical editor allows no images/embeds on pages; gallery help texts say "Sem nudez explícita na área aberta".

### Pitfall 7: Home depends on parties (D-10)
The home must render meaningful sections when `getUpcomingParties()` is empty: hero/eyebrow, "Conheça o espaço" teaser (up to 6 space photos; hidden if none), Quem Somos teaser (intro from `pages` key quem-somos), "Como chegar" block (contact global). Each block independent; the page never shows only an empty state.

## Code Examples

### Deep links (pure, unit-testable)
```ts
export function googleMapsUrl(c: ContactDTO) {
  const dest = c.lat != null && c.lng != null ? `${c.lat},${c.lng}` : encodeURIComponent(fullAddress(c))
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`
}
export const whatsappUrl = (digits: string) => `https://wa.me/${digits.replace(/\D/g, '')}`
```

### Global revalidation
```ts
hooks: { afterChange: [({ doc }) => { expire(['contact']); return doc }] }
```

## State of the Art
- Next 16 `revalidateTag(tag, profile)` with `{ expire: 0 }` (used in Phase 1) — keep.
- `<dialog>` is supported in all target mobile browsers (Safari ≥ 15.4).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Payload 3.91 local file route answers Range requests with 206 | Pattern 5 | iOS can't seek/play → implement fallback route (planned) |
| A2 | `convertMarkdownToLexical` + `editorConfigFactory` exported by @payloadcms/richtext-lexical 3.91 | Standard Stack | Seed fails → fallback local helper (planned) |
| A3 | Coordinates −15.5936421, −47.9771526 are the venue | Pattern 1 | Map pin wrong → staff edits lat/lng; client confirmation requested |
| A4 | openstreetmap.org embed acceptable under OSM tile usage policy at this traffic | Supporting | Low; swap to link-only if blocked |

## Open Questions (RESOLVED)

1. *Where do Normas vs Regras differ?* — RESOLVED: the old site has one "Regras da Casa" page; Normas = principles and conduct (consent, no minors, no drugs, no prostitution, discretion); Regras = practical procedures (hours, who enters which day, phones, smoking, glass, weapons, dress code, noise). See 02-CONTENT.md.
2. *FAQ page?* — RESOLVED: old FAQ is an empty block + contact form; Phase 2 puts frequent questions inside Dicas ("Primeira visita") instead of a separate route; contact form is out of scope (WhatsApp/e-mail instead).
3. *Instagram handle?* — RESOLVED for planning: optional field, hidden when empty (D-04); handle remains a client question.

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Postgres (local Docker) for int/e2e | all plans | as in Phase 1 (paraiso_test) | — |
| openstreetmap.org from visitors' browsers | /contato | yes (public) | link-only |
| swingbrasilia.com.br from our env | content research | WebFetch works; direct curl from container blocked | — |
| Staging (novo.swingbrasilia.com.br) from our env | final check | NO (egress proxy) | client verifies (checkpoint) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (unit + int), Playwright 1.64.1 (e2e, projects mobile/desktop) |
| Config file | vitest.config.mts, playwright.config.ts |
| Quick run command | `pnpm exec vitest run tests/unit` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INST-02/03 | Links built from contact (wa.me, maps, waze, osm, instagram hidden when empty) | unit | `pnpm exec vitest run tests/unit/contact-links.test.ts` | ❌ W0 (plan 02-01) |
| INST-02/03, PAINEL-04 | /contato shows address, buttons, WhatsApp; staff edit reflects at once | e2e | `pnpm exec playwright test tests/e2e/contato.spec.ts` | ❌ (02-01) |
| INST-01, INST-06, PAINEL-04 | pages published-only, seeded, routes render, drafts hidden | int + e2e | `pnpm exec vitest run tests/int/pages.int.test.ts` / `playwright test tests/e2e/institucional.spec.ts` | ❌ (02-02) |
| MIDIA-01, PAINEL-02 | space gallery published-only, empty state, video 206 | int + e2e | `vitest run tests/int/space-gallery.int.test.ts`, `playwright test tests/e2e/espaco.spec.ts` | ❌ (02-03) |
| MIDIA-02, D-08, D-09 | ≤ 3 photos, authorization not required, note not public, section hidden when empty | int + e2e | `vitest run tests/int/models.int.test.ts`, `playwright test tests/e2e/modelos.spec.ts` | ❌ (02-04) |
| MIDIA-03, D-10 | home without parties shows sections; gallery transfer budget | e2e | `playwright test tests/e2e/home-sem-festas.spec.ts tests/e2e/perf-galeria.spec.ts --project=mobile` | ❌ (02-05) |

### Sampling Rate
- Per task commit: `pnpm exec vitest run tests/unit` (+ the task's own int/e2e file)
- Per wave merge: `pnpm test`
- Phase gate: full suite green before `/gsd:verify-work`

### Wave 0 Gaps
Test files are created inside each slice's first task (TDD-style behavior blocks), so no separate Wave 0 plan; existing harness (vitest/playwright/seed helpers) covers infrastructure. `tests/helpers/seed.ts` RESET_ORDER must gain the new collections (done in each slice).

## Security Domain

### Applicable ASVS Categories (L1)
| Category | Applies | Control |
|----------|---------|---------|
| V4 Access control | yes | anonymous read = published only; writes = staff; field-level read on `imageAuthorization` |
| V5 Input validation | yes | whatsapp/instagram regex, lat/lng ranges (−90..90/−180..180), mime allowlists (no SVG), size limits |
| V12 Files | yes | uploads only via Payload with mime allowlist; fallback video route rejects traversal |
| V14 Config | yes | iframe only to openstreetmap.org; outbound links `rel="noopener noreferrer"` |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Draft page/gallery item leak via REST | I | access.read published filter; int tests with overrideAccess false |
| Authorization notes (personal data) exposed | I | field access read staff-only; int test |
| Path traversal in video route (fallback) | T/I | basename allowlist `^[\w.-]+\.mp4$`, resolve inside MEDIA_DIR |
| Huge uploads fill disk | D | 100 MB video cap, 15 MB image cap, runbook disk check |
| Malicious link in rich text (javascript:) | T | Lexical LinkFeature with `validateUrl` default; render with `rel` |

## Sources

### Primary (HIGH confidence)
- Repository code read 2026-10-19: src/payload.config.ts, src/collections/*.ts, src/lib/parties/*, tests/*, Dockerfile/compose/workflow.
- swingbrasilia.com.br fetched 2026-10-19 (home, /quemsomos, /faq, /dicas-hot, /assine-ja, /rede-social, /galeria, /regras-da-casa, /sobreacasa, /politica-de-privacidade, wp-json page list and search).

### Secondary (MEDIUM confidence)
- Payload 3 docs knowledge: globals, upload collections, field access, `maxRows`; Next 16 image cache default TTL.

### Tertiary (LOW confidence)
- Payload Range support (A1), markdown→Lexical helper names (A2).

## Metadata
**Confidence breakdown:** stack HIGH; architecture HIGH; pitfalls MEDIUM-HIGH.
**Research date:** 2026-10-19 · **Valid until:** 2026-11-19
