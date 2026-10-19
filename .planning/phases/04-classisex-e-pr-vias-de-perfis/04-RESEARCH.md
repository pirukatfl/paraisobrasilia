# Phase 4: ClassiSex e prévias de perfis - Research

**Researched:** 2026-10-19
**Domain:** Moderated classified-ads board for subscribers on Payload 3.91 + Next 16.4: owner-written ads with separate contact fields, staff moderation queue in the Payload admin, date-based visibility tied to Phase 3 subscriptions, private photos/videos on the VPS disk served only through an auth-checked route handler, server-side contact redaction and blurred derivatives for the public preview, reports.
**Confidence:** HIGH for Payload upload/file-serving and auth-cookie internals (read from `node_modules/payload@3.91.0` in the local working copy /home/claude/paraiso-site), HIGH for codebase patterns (Phase 3 code read 2026-10-19), MEDIUM for MP4 box handling and video playback without transcoding (pure-TS approach, verify with unit tests + client check), MEDIUM for the nested relationship query `author.accessUntil` (fallback given).

> **Wording:** ROADMAP and REQUIREMENTS say "perfis" (CLAS-01..06, PREV-01). Per 04-CONTEXT.md D-01 the ClassiSex stays a board of short **anúncios**, so every "perfil" in those requirements maps to an **anúncio** in this phase (lista de perfis = lista de anúncios; perfil completo = anúncio completo; criar o próprio perfil = criar os próprios anúncios).

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 Formato:** board of short ads, not social profiles. Each ad: Eu sou (Casal, Solteiro, Solteira — list editable in the panel), Cidade (optional), text (up to 600 characters), contact in **separate fields** (WhatsApp, Telegram, e-mail; at least one), up to 5 photos and 1 short video (up to 60 s), both optional.
- **D-02 Quem publica:** only a subscriber with active access, from the members area. Several ads allowed, at most 3 active at the same time. Owner edits and deletes their own.
- **D-03 Moderação:** new or edited ad goes to the staff queue and only appears after approval (CLAS-04, PAINEL-07). Staff can reject with a reason.
- **D-04 Área aberta (PREV-01):** list with Eu sou, cidade and text; phones, e-mails, links and @ in the text are removed automatically on the server; photos appear blurred (blurred derivative generated on the server, never the original); button "Assine para ver o contato". No name, e-mail or contact.
- **D-05 Assinante:** sees everything, including contacts and original media served by a protected route (CLAS-06: a direct link does not open for non-subscribers).
- **D-06 Vencimento:** when the subscription expires, that person's ads disappear from both lists (public and members) until renewal.
- **D-07 Lista:** newest first, filter by Eu sou and cidade, pagination.
- **D-08 Denúncia (CLAS-05):** a subscriber reports an ad with a reason; staff see it in the queue and can unpublish.

### Deferred (OUT OF SCOPE)
- Migration of the 205 old ads (client LGPD decision) — Phase 6.
- Messages between subscribers — Phase 5.

### Orchestrator constraints (this planning run)
- Media storage is local disk (no S3). Private media must live **outside any public static path** and be served by an auth-checked route handler.
- Last plan: staff guide/runbook section, staging smoke, deploy with `git push github master:main`, blocking client check.

## Phase Requirements

| ID | Description (anúncio wording) | Research Support |
|----|-------------|------------------|
| CLAS-01 | Assinante vê a lista de anúncios com fotos | Pattern 4 (visibility rule + members list, filters, pagination), Pattern 6 (cover thumbnail through the protected route) |
| CLAS-02 | Assinante abre o anúncio completo com fotos, vídeo e contato | Pattern 4 (detail DTO with contact links), Pattern 6 (gallery + `<video>` with byte ranges) |
| CLAS-03 | Assinante cria e edita os próprios anúncios (fotos, vídeo, texto, contato) | Pattern 2 (owner service + server actions, limit 3 active), Pattern 7 (upload route handler, one file per request) |
| CLAS-04 | Anúncio novo ou editado só aparece depois de aprovado | Pattern 2 (owner write → `pendente`), Pattern 3 (staff approve/reject/unpublish endpoints) |
| CLAS-05 | Assinante denuncia um anúncio | Pattern 9 (`ad-reports`, one open report per reporter and ad) |
| CLAS-06 | Fotos e vídeos nunca abrem por link direto para quem não é assinante | Pattern 5 (separate private volume, staff-only Payload file route, auth-checked route handler), Pitfalls 1–4 |
| PREV-01 | Visitante vê prévias de anúncios sem contato nem dado identificável | Pattern 1 (pure redaction), Pattern 8 (public DTO, blurred derivative route, cached page) |
| PAINEL-07 | Equipe aprova ou recusa anúncios na fila de moderação | Pattern 3 (dashboard queue, "Moderação" UI field, audit) — recados part of PAINEL-07 is Phase 5 |

## Project Constraints (from CLAUDE.md / PROJECT.md / STATE.md)

- Open area: no explicit nudity, no contacts (protects indexing). Image rights: media only with authorization — here the owner declares it (consent checkbox recorded on the ad).
- LGPD: ads and media are sensitive (sexual life); nothing exposed in the open area; data minimisation (no author name in ads).
- Staff operate alone: Portuguese labels/help on every field; flows named "Aprovar", "Recusar", "Despublicar".
- Pin `@payloadcms/*` 3.91.0; **no new runtime dependency** (sharp 0.35.5 is already a direct dependency; `file-type` is only a transitive Payload dependency — do not import it).
- Read `node_modules/next/dist/docs/` before Next code (AGENTS.md). Next 16: `proxy.ts` instead of middleware (not used); route handler `params` is a Promise.
- Playwright: Chromium from /opt/pw-browsers via `PW_CHROMIUM_PATH`; never `playwright install`. This Chromium build has no proprietary codecs (H.264): assert video delivery (status, headers, 206 ranges), not playback.
- Phase 3 conventions: role = `req.user.collection` (`src/access/roles.ts`); subscriber-specific reads never cached; every members page and action guards through the DAL (`requireAssinante` / `requireActiveSubscription`); modules reachable from `payload.config.ts` never import `'server-only'`; staff actions = service + staff-only collection endpoint + thin admin client panel; nested Local API calls inside hooks wrapped in `withRequestState`; migrations created with `CI=true PAYLOAD_MIGRATING=true pnpm payload migrate:create <name>`, seeds only when missing; schema-changing plans run in sequential waves.
- The /mnt/project-files mount rewrites committed binaries; before committing run `git checkout -- public src/app tests/fixtures docs/screens` (STATE.md).

## Summary

The current ClassiSex is a list of short wpDiscuz comments (median 21 words, contact typed inside the text, photos rare). The new one keeps that shape (D-01) but moves contacts into separate fields that only active subscribers ever receive, adds up to 5 photos and a 60-second video, and puts every new or edited ad through a staff queue.

Four findings from the source change the design:

1. **Payload's file route serves any file under a public collection's `staticDir`.** `getFileHandler` → `checkFileAccess`: when `access.read` returns `true` (Media and Videos do: `read: () => true`), no database lookup happens; the handler resolves `path.resolve(staticDir, filename)` and only rejects `../` and paths escaping the directory. Media's `staticDir` is `MEDIA_DIR` itself (the volume root). Any private file stored **anywhere under `MEDIA_DIR`** (e.g. `MEDIA_DIR/private/…`) could be fetched through `/api/media/file/<encoded sub-path>`. Therefore private media gets **its own directory outside `MEDIA_DIR`, on its own Docker volume** (`private_media` mounted at `/app/private-media`, env `PRIVATE_MEDIA_DIR`), and its Payload collection has `access.read` = staff only, which forces `checkFileAccess` to look the filename up in the database and throw Forbidden for everybody else.
2. **The auth cookie is ignored for requests without `Origin` unless `Sec-Fetch-Site` is `same-origin`, `same-site` or `none`** (`auth/extractJWT.js`, because `csrf` is configured since 03-01). `<img>`/`<video>` requests from our pages send `Sec-Fetch-Site: same-origin` in current browsers, and a link opened in a new tab sends `none`, so subscribers keep working; cross-site hotlinks get no identity (good). Consequences: (a) old browsers without `Sec-Fetch-*` (iOS < 16.4) would see broken private media — accepted risk; (b) e2e "subscriber can fetch" checks must use in-page `fetch`/`page.goto`, not `context.request` (03-06 finding).
3. **Payload re-encodes images only when an adjustment is configured**, and sharp drops EXIF/GPS unless `withMetadata` is set (`uploads/generateFileData.js`: `fileHasAdjustments = canResizeImage && (resizeOptions || formatOptions …)`). Setting `formatOptions: webp` + `resizeOptions` on the private collection strips phone metadata from originals. Videos are never touched by sharp (`canResizeImage` lists image types only), so MP4/MOV location metadata (`moov/udta/©xyz`, `moov/meta` keys) must be neutralised by our own code before the file is written. `req.file` is set before `beforeOperation` hooks run in both REST and Local API create (`collections/operations/local/create.js` line 13, hooks at `create.js` line 73, `generateFileData` at line 135), so a `beforeOperation` hook can validate and rewrite the buffer.
4. **Next server actions are capped at 1 MB by default** (`serverActions.bodySizeLimit`, global for every action). Raising it for 100 MB videos would raise it for login too. Uploads therefore go to a dedicated **route handler** (`POST /area-do-assinante/meus-anuncios/[id]/midia`, plain `multipart/form-data` form, 303 back to the edit page — no client JS needed), which checks the session, `Content-Length` and per-type size before parsing. Route handlers do not get the server-action Origin check, but `payload.auth` already ignores a cookie whose `Origin` is not in `csrf`, so a cross-site POST arrives anonymous (test it).

Visibility is computed, not flagged: an ad is visible iff `status = 'aprovado'` AND its author's `accessUntil > now` (Phase 3 keeps `assinantes.accessUntil` = latest non-ended period end, recomputed by subscription hooks on liberar/renovar/encerrar). Expiry therefore hides ads at São Paulo midnight with no job (D-06); the members list is never cached, the public preview is cached with tag `ads` (600 s window, expired on moderation, owner edits and subscription changes).

**Primary recommendation:** ten plans. Wave 1 runs two in parallel (pure redaction + MP4 rules; ads data + owner flow); the rest are sequential because they change the Payload schema or share test helpers: moderation → members board → private media storage and protected route → upload and display → public preview → reports → phase-wide leak matrix → docs, deploy and client check.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| "Eu sou" options | Payload `ad-categories` (staff-edited, seeded Casal/Solteiro/Solteira) | — | D-01 "lista editável no painel"; deletion refused while in use |
| Ad data, status, contacts | Payload `ads` (REST staff-only for every operation) | Owner service + server actions with ownership check | Subscribers never write through REST; one enforcement point |
| Field rules (600 chars, contacts, cidade, limit 3) | Pure `src/lib/classisex/rules.ts` | collection `validate` + service | Unit-testable; same messages in admin and site |
| Contact redaction | Pure `src/lib/classisex/redact.ts` | Admin "Moderação" panel shows the public text | Server-side only (D-04); staff see what visitors will see |
| Visibility (approved + author active) | `src/lib/classisex/visibility.ts` (`visibleAdsWhere(now)`) | `assinantes.accessUntil` (Phase 3) | Computed per request; no cron (D-06) |
| Members board | Server components in `(membros)` + `requireActiveSubscription` | `src/lib/classisex/queries.ts` (server-only, never cached) | Phase 3 DAL pattern |
| Public preview | `/classisex` server page, `cached(..., ['ads'])` | Public DTO without contacts/author | Same as Phase 1/2 public queries |
| Private originals | Payload upload collection `ad-media`, `staticDir` = `PRIVATE_MEDIA_DIR` (own volume), read staff-only | Route handler `/area-do-assinante/midia/[id]/[variante]` | Outside every public static path; one auth check |
| Blurred derivative | sharp in `ad-media` `afterChange` hook (`src/lib/classisex/blur.ts`) | Public route `/classisex/previa/[id]` (visible ads only) | Generated from a ≤16 px downscale: not reversible |
| MP4/MOV duration + metadata scrub | Pure `src/lib/classisex/mp4.ts` | `ad-media` `beforeOperation` | No ffmpeg in the image; ISO-BMFF boxes are simple |
| Moderation | Service + staff endpoints `POST /api/ads/:id/{aprovar,recusar,despublicar}` | Admin UI field + `beforeDashboard` queue counts | Phase 3 staff-action pattern; audit rows |
| Reports | Payload `ad-reports` (staff-only REST) | Server action `denunciarAnuncio` | One open report per reporter/ad |

## Standard Stack

### Core (already installed — no installs in this phase)
| Library | Version | Purpose |
|---------|---------|---------|
| payload / @payloadcms/* | 3.91.0 | collections, upload collection with local storage, hooks, collection endpoints, join fields, admin UI field, `beforeDashboard`, migrations |
| next | 16.4.2 | server components, server actions, route handlers (streaming `Response`), `notFound`, `permanentRedirect` |
| sharp | 0.35.5 | re-encode originals (webp, EXIF stripped), card size, blurred derivative, `stats()` in tests |
| vitest 5.0.5 / @playwright/test 1.64.1 | — | unit/int/e2e |

### Supporting (no package)
| Need | Use | Why |
|------|-----|-----|
| Video duration and metadata scrub | `src/lib/classisex/mp4.ts`: walk ISO-BMFF boxes (`size`,`type`, 64-bit `largesize`), read `moov/mvhd` (v0: 32-bit timescale/duration; v1: 64-bit), turn `udta`/`meta` boxes under `moov` and each `trak` into `free` boxes with zeroed payload | No ffmpeg/ffprobe in the runner image; MOV and MP4 share the box format; same size keeps every offset (`stco`/`co64`) valid |
| Byte ranges | `src/lib/classisex/range.ts` `parseRange(header, size)` | Payload's `parseRangeHeader` is internal (not exported); iPhone Safari requires 206 for `<video>` |
| File streaming | `fs.createReadStream(path, { start, end })` + `Readable.toWeb` in the route handler | No dependency |
| Image validation | `sharp(buffer).metadata()` (format in jpeg/png/webp, width/height) before create | Rejects renamed/garbage files; HEIC is not decodable by the prebuilt sharp → clear message |
| Form validation | hand-written in `rules.ts` | zod not installed (Phase 3 decision) |

## Package Legitimacy Audit

No new packages are introduced in Phase 4. Nothing to audit; no package-manager install tasks exist in the plans. (Video transcoding would need ffmpeg as an apt package in the runner image — not planned; see Open Questions.)

## Architecture Patterns

### System Architecture Diagram

```
Visitor ──► /classisex (public; cached tag 'ads')
             └─ PublicAdDTO: euSou, cidade, redactContacts(texto), date, blurred photo URLs, hasVideo
             └─ <img src=/classisex/previa/{mediaId}> ─► route: media.kind=foto AND ad visible ─► PRIVATE_MEDIA_DIR/…-previa.webp
Subscriber (cookie payload-token, collection 'assinantes')
   ├─ /area-do-assinante/meus-anuncios (requireAssinante; list/delete even when inactive)
   │    ├─ novo, [id]/editar  (requireActiveSubscription) ─► server actions ─► service.ts ─► ads (status 'pendente')
   │    └─ POST [id]/midia (route handler, multipart, 1 file) ─► payload.create('ad-media', file) ─► hooks: validate,
   │         mp4 scrub, sharp webp (EXIF gone), card size, blurred derivative ─► ad back to 'pendente'
   ├─ /area-do-assinante/classisex (requireActiveSubscription; never cached) ─► visibleAdsWhere(now), filters, 20/page
   │    └─ [id] ─► MemberAdDTO (contacts, photo/video URLs) ; Denunciar ─► ad-reports
   └─ GET /area-do-assinante/midia/{id}/{miniatura|foto|video} (route handler)
         canViewMedia: staff | owner | (active subscriber AND ad visible) ─► stream file (Range → 206), private, noindex
Staff (/admin, collection 'users')
   ├─ Dashboard: "ClassiSex: N anúncios para aprovar · M denúncias abertas" (beforeDashboard)
   ├─ Anúncios: list filtered by Situação; edit page "Moderação" UI field ─► POST /api/ads/:id/aprovar|recusar|despublicar
   │      └─ service ─► status, motivo, publishedAt, audit-log row, expire(['ads'])
   └─ Denúncias: list; "Resolver" / "Despublicar o anúncio" ─► POST /api/ad-reports/:id/resolver
Payload REST /api/ads, /api/ad-media, /api/ad-reports, /api/ad-media/file/* ─► staff only
Docker volumes: media → /app/media (public flyers/videos, unchanged) ; private_media → /app/private-media (NEW)
```

### Recommended Project Structure (new/changed)
```
src/
  collections/AdCategories.ts      # slug 'ad-categories' (Eu sou options; read public; delete refused while in use)
  collections/Ads.ts               # slug 'ads' (all REST ops staff-only; endpoints aprovar/recusar/despublicar)
  collections/AdMedia.ts           # slug 'ad-media' (upload; staticDir PRIVATE_MEDIA_DIR; read staff-only)
  collections/AdReports.ts         # slug 'ad-reports' (staff-only; endpoint resolver)
  lib/classisex/
    redact.ts       # pure: redactContacts(text) → { text, removed }
    mp4.ts          # pure: readMp4Info(buf), scrubMp4Metadata(buf)
    rules.ts        # pure: validateAdInput, normaliseCidade, ACTIVE_LIMIT, limits for media
    range.ts        # pure: parseRange(header, size)
    media-access.ts # pure: canViewMedia({...})
    dto.ts          # pure: toOwnerAdDTO, toMemberAdDTO, toPublicAdDTO, mediaUrl()
    visibility.ts   # visibleAdsWhere(now), isAdVisible(ad, now)
    storage.ts      # privateMediaDir(), assertOutsidePublicMedia(), assertPrivateStorageConfigured()
    blur.ts         # makeBlurredPreview(buffer) (sharp)
    service.ts      # owner ops, moderation, media attach/remove, reports (takes payload/req; no 'server-only')
    endpoints.ts    # staff-only collection endpoints (Phase 3 shape)
    actions.ts      # 'use server': criarAnuncio, salvarAnuncio, apagarAnuncio, removerMidia, moverMidia, denunciarAnuncio
    queries.ts      # server-only, never cached: owner + members reads
    public.ts       # server-only, cached tag 'ads': public preview read
  components/classisex/*.tsx                      # AdForm, OwnerAdCard, MemberAdCard, PublicAdCard, AdFilters, Pagination, ContactLinks, MediaGallery, ReportForm
  components/admin/classisex/ModeracaoPanel.tsx   # 'use client' UI field on ads
  components/admin/classisex/FilaClassisex.tsx    # server component for beforeDashboard
  app/(frontend)/classisex/page.tsx               # public preview
  app/(frontend)/classisex/previa/[id]/route.ts   # blurred derivative (public, visible ads only)
  app/(frontend)/(membros)/area-do-assinante/classisex/page.tsx, [id]/page.tsx
  app/(frontend)/(membros)/area-do-assinante/meus-anuncios/page.tsx, novo/page.tsx, [id]/editar/page.tsx, [id]/midia/route.ts
  app/(frontend)/(membros)/area-do-assinante/midia/[id]/[variante]/route.ts
  migrations/…_classisex_ads.ts (+ seed Eu sou), …_classisex_moderation.ts, …_ad_media.ts, …_ad_reports.ts
```

### Pattern 1: Contact redaction (PREV-01, D-04)
Pure function, table-driven tests. Replace each match with the literal `[contato só para assinantes]`; collapse repeats. Rules (applied in this order): URLs (`https?://…`, `www.…`, bare domains with a TLD such as `fulano.com.br`, `wa.me/…`, `t.me/…`, `instagram.com/…`); e-mails, including spelled forms (`fulano arroba gmail ponto com`, `fulano(at)gmail.com`); handles (`@nome`, and `insta`/`instagram`/`telegram`/`tg`/`zap`/`whats` followed by `:` or space and a token); phone-like runs of **8 or more digits** allowing spaces, dots, hyphens, parentheses and a leading `+55`/`55` (`(61) 9 9988-9772`, `61999889772`, `+55 61 99988 9772`, `9988.9772`). Keep short numbers (`casal 30 e 28 anos`, `1,70 m`, `2x por mês`). Spelled-out digits ("nove nove…") are not caught: staff see the public text in the moderation panel and fix or reject (Pitfall 7). Also applied to `cidade` (which additionally only accepts letters, spaces, `-`, `'`, `.`, max 60).

### Pattern 2: Ads and the owner flow (CLAS-03, CLAS-04, D-01, D-02, D-03)
- `ads` fields: `author` (relationship `assinantes`, required, index, readOnly), `euSou` (relationship `ad-categories`, required), `cidade` (text ≤ 60), `cidadeBusca` (hidden, lower-case without accents — filter target), `texto` (textarea, required, ≤ 600), group `contato` { `whatsapp` (55 + DDD digits, same rule as `assinantes.whatsapp`), `telegram` (`@` + 5–32 of `[A-Za-z0-9_]`, stored without `@`), `email` }, at least one contact; `status` select `pendente | aprovado | recusado | despublicado` (default `pendente`, field update staff-only); `motivo` (text ≤ 300, shown to the owner); `submittedAt`, `publishedAt`, `moderatedAt`, `moderatedBy` (rel users); `consentAt` (date: the owner's declaration); `resumo` (computed `useAsTitle`, e.g. "Casal · Brasília — primeiras palavras").
- REST: create/read/update/delete all `isStaff`. Owners act through server actions → `service.ts` with `overrideAccess: true` after the DAL check and an explicit `ad.author === assinante.id` check (else `notFound()`).
- Owner write (create, edit, media add/remove) sets `status: 'pendente'`, `submittedAt: now`, clears `motivo`; context `ownerEdit: true`. Staff edits in the admin do not change the status.
- Limit (D-02): `pendente` + `aprovado` count ≤ 3 per author; creating (or resubmitting a `recusado`/`despublicado` ad) beyond that fails with "Você já tem 3 anúncios ativos. Apague um para publicar outro."
- Creating and editing need an active subscription (D-02); listing and deleting own ads only need a login (LGPD: an expired subscriber can still delete their data). Owner deletion is a hard delete (cascade: media files, then reports keep a snapshot with `ad` set null).
- Account deletion: extend the existing `Assinantes` `beforeDelete` cascade (03-03) to delete the account's ads (and through them media files) — otherwise the required FK blocks deletion exactly like 03-03 deviation #2.
- Edited approved ad: hidden until re-approved (simplest reading of D-03 "novo ou editado … só aparece depois de aprovado"); the owner page says so before saving. Alternative (keep the old version visible) is an open question.

### Pattern 3: Moderation queue (PAINEL-07, D-03)
Service functions `approveAd`, `rejectAd(motivo)`, `unpublishAd(motivo)` (motivo required, ≤ 300) + staff-only endpoints on `ads` (`POST /api/ads/:id/aprovar|recusar|despublicar`; 403 unless `isStaff`; `req.routeParams.id`; body via `req.json()` — Phase 3 A1). Approve sets `publishedAt = now` (list order D-07), `moderatedAt/By`. Each action writes an `audit-log` row (new `AUDIT_ACTIONS` values → select enum migration) and calls `expire(['ads'])`. Admin: `ModeracaoPanel` UI field at the top of the ad edit page (situação, "Como aparece na área aberta" = `redactContacts(texto)`, count of photos/video, buttons with motivo prompt); `FilaClassisex` in `beforeDashboard` with counts and links to `/admin/collections/ads?where[status][equals]=pendente&sort=submittedAt` (oldest first). Payload list `admin.defaultColumns: ['resumo','status','submittedAt','author']`.

### Pattern 4: Visibility and the members board (CLAS-01, CLAS-02, D-05, D-06, D-07)
`visibleAdsWhere(now) = { and: [ { status: { equals: 'aprovado' } }, { 'author.accessUntil': { greater_than: now.toISOString() } } ] }`. Payload's Postgres adapter supports dotted relationship paths in `where` (joins) — assumption A1; fallback: query `assinantes` ids with `accessUntil > now` (bounded) and use `author: { in: ids }`. Filters: `euSou` (id), `cidade` (normalised, `like` → `ilike` in `@payloadcms/drizzle` operatorMap), sort `-publishedAt`, `limit 20`, `page`. Members DTO: id, euSou label, cidade, texto, contatos with hrefs (`https://wa.me/<digits>?text=…`, `https://t.me/<user>`, `mailto:`), publishedAt label, photos/video URLs; **no author, no filenames, no Payload URLs**. Pages call `requireActiveSubscription`; inactive → `SubscriptionStatus` panel only (no restricted markup, T-03-05 pattern). Detail of a non-visible ad → `notFound()`. `accessUntil` approximates entitlement (ignores a future-starting period after a gap — staff never create those through Liberar); accepted and documented.

### Pattern 5: Private media storage and the protected route (CLAS-06, D-05)
- `PRIVATE_MEDIA_DIR` (compose: `/app/private-media` on named volume `private_media`; dev/test default `./private-media`, gitignored). `payload.config.ts` sets `ad-media` `staticDir` from it and **throws at config load if the resolved private dir is inside the resolved `MEDIA_DIR`** (unit-tested helper `assertOutsidePublicMedia`). The runner image creates `/app/private-media` owned by `node` (new volumes copy the owner, same as `media`). The image does **not** set `PRIVATE_MEDIA_DIR`; in production (`NODE_ENV=production`) uploads refuse with 503 "Envio de fotos indisponível no momento." when it is unset, so a VPS whose compose was not refreshed never writes private files into the container layer (lost on restart).
- `ad-media` collection: fields `owner` (rel assinantes), `ad` (rel ads, required), `kind` (`foto | video`, set by the server), `order`, `durationSeconds`, `previa` (filename of the blurred derivative, hidden). `upload`: `mimeTypes ['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']`, `formatOptions webp q82`, `resizeOptions { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }`, `imageSizes [{ name: 'card', width: 480, formatOptions webp }]`, `adminThumbnail: 'card'`, `focalPoint: false`, `crop: false`. Access read/create/update/delete `isStaff` (staff can inspect files in the admin; Payload's own `/api/ad-media/file/*` refuses everybody else).
- Hooks: `beforeOperation(create)`: storage configured (prod); `kind` from mime; images ≤ 15 MB and decodable by sharp; videos ≤ 100 MB, `readMp4Info` duration ≤ 60 s, then `req.file.data = scrubMp4Metadata(data)`; per-ad limits (≤ 5 fotos, ≤ 1 vídeo). `afterChange(create, foto)`: write `<basename>-previa.webp` with `makeBlurredPreview` into the same dir and store `previa` (via `withRequestState`). `afterDelete`: remove the `previa` file (Payload removes the original and sizes). `afterChange/afterDelete`: `expire(['ads'])`.
- Route `GET /area-do-assinante/midia/[id]/[variante]` (`miniatura` = card webp, `foto` = main webp, `video` = original video): `payload.auth({ headers })` → principal; load media (overrideAccess) and its ad; `canViewMedia({ principal, media, ad, now, viewerActive })` → staff ✓, owner ✓, subscriber with active access AND `isAdVisible(ad)` ✓, else 403 (no principal / inactive) or 404 (unknown, wrong variant, not visible). File path = `path.join(privateMediaDir(), path.basename(doc.filename or sizes.card.filename))` — never from the URL. Headers: `Content-Type` from the doc (`video/mp4` for MP4 and MOV), `Accept-Ranges: bytes`, `Cache-Control: private, max-age=600`, `Vary: Cookie`, `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`. Range → 206 with `Content-Range`; invalid → 416.

### Pattern 6: Media in the board
Plain `<img loading="lazy" decoding="async">` with explicit width/height for `miniatura`/`foto`; **never `next/image`** for private media (the optimizer fetches server-side without the cookie and caches output in `.next/cache/images`; `images.localPatterns` only allows `/api/media/file/**` and must stay so). Video: `<video controls playsinline preload="metadata" src=…/video>`; no poster frame (no ffmpeg) — show a "Vídeo" label.

### Pattern 7: Upload route (CLAS-03)
`POST /area-do-assinante/meus-anuncios/[id]/midia` (route handler; `multipart/form-data` with one `arquivo` field and hidden `tipo` = `foto|video`; plain HTML form, 303 redirect to `/area-do-assinante/meus-anuncios/[id]/editar?midia=ok|erro-codigo`). Order: principal is a subscriber (else 303 to `/entrar?next=…`) → active access (else 303 with `erro=inativo`) → ad exists and belongs to the principal (else 404) → `Content-Length` ≤ 105 MB (else 413/303 `erro=grande`) → `request.formData()` → per-type size → `payload.create({ collection: 'ad-media', data: { ad, owner, order }, file: { data, mimetype, name, size }, overrideAccess: true })` → ad back to `pendente` (service) → 303. Caddy `request_body { max_size 110MB }` as an outer guard.

### Pattern 8: Public preview (PREV-01, D-04, D-07)
`getPublicAds({ euSou, cidade, page })` = `cached(fn, ['classisex-public'], () => ['ads'])` over `visibleAdsWhere(now)`; DTO: id, euSou label, cidade (redacted), `redactContacts(texto).text`, date label, `photos: [{ previewUrl: '/classisex/previa/{mediaId}' }]` (all photos, blurred; cover first), `hasVideo`. No contact field, no author, no `/area-do-assinante/midia/` URL ever serialised. Card CTA "Assine para ver o contato" → `/assine-ja`; header link "Já é assinante? Ver anúncios completos" → `/area-do-assinante/classisex`. `/classisex/previa/[id]`: kind `foto`, ad visible → `previa` file with `Cache-Control: public, max-age=600`; else 404. Blur: `sharp(buf).rotate().resize(16, 16, { fit: 'inside' })` → `resize(480)` → `blur(8)` → webp q60 (the 16 px intermediate makes it irreversible; unit test: checkerboard input → output channel stdev below a threshold). Cache expiry: tag `ads` on moderation, owner writes, media changes, and `subscriptions`/`assinantes` changes (accessUntil moves); otherwise the 600 s window hides expired authors at most 10 minutes after midnight.

### Pattern 9: Reports (CLAS-05, D-08)
`ad-reports`: `ad` (rel ads, not required — set null when the ad is deleted), `adSnapshot` (text: "Casal · Brasília — first 120 chars", kept for the record), `reporter` (rel assinantes, set null on account deletion), `motivo` select (`contato-falso`, `golpe-ou-cobranca`, `ofensivo`, `menor-de-idade`, `sem-autorizacao-de-imagem`, `outro`), `detalhes` (≤ 500), `status` (`aberta | resolvida | descartada`), `resolvidaPor`, `resolvidaEm`, `nota`. Access staff-only. Action `denunciarAnuncio` (active subscriber, ad visible, not own ad) → one open report per reporter+ad (second attempt → "Você já denunciou este anúncio."), at most 10 reports per reporter per day. Staff: count in the dashboard queue (`menor-de-idade` first, flagged "urgente"), join "Denúncias" on the ad page, endpoint `POST /api/ad-reports/:id/resolver` { acao: 'despublicar' | 'descartar', nota } — despublicar calls `unpublishAd` and resolves every open report of that ad.

### Anti-Patterns to Avoid
- Storing private files anywhere under `MEDIA_DIR` (Finding 1) or under `public/`.
- Returning Payload docs or `url`/`filename` fields to the browser; always DTOs with our route URLs.
- Hiding contacts with CSS or client components (data still in the RSC payload).
- `next/image` for private media; `unstable_cache` for members/owner reads.
- Trusting the URL for file paths, the form for `author`/`status`, or the client for media `kind`.
- Raising `serverActions.bodySizeLimit` globally for uploads.
- Checking access only in the layout (Next layouts do not gate route handlers or actions).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image decode/resize/strip EXIF | custom parsers | Payload upload + sharp (`formatOptions`, `resizeOptions`) | Already used by Media |
| Auth/session in route handlers | cookie parsing | `payload.auth({ headers })` | Same CSRF/session rules as the rest of the site |
| Staff action plumbing | new admin views | Phase 3 pattern (service + collection endpoint + UI field) | Proven in 03-04/03-05 |
| Audit | another log | `writeAudit` (`src/lib/assinantes/audit.ts`) with new action values | Append-only already |
| Video transcoding | ffmpeg wrappers via npm | none this phase (accept MP4/MOV ≤ 60 s) | No new dependency; open question |

## Common Pitfalls

### Pitfall 1: Private files under a public staticDir
See Finding 1. Leak test: request `/api/media/file/<url-encoded relative path to a private file>` and `/api/videos/file/…` → never 200 with the file bytes.
### Pitfall 2: Payload's own file route for the private collection
If `ad-media` `read` ever returns `true` or a broad `Where`, `/api/ad-media/file/<filename>` serves originals. Keep read `isStaff`; leak test anonymous + subscriber (in-page fetch) → 403.
### Pitfall 3: `next/image` optimizer caching private media
The optimizer requests the source server-side without the subscriber cookie, then caches the optimised bytes on disk and serves them to anyone with the `/_next/image?url=` URL. Never pass private URLs to `next/image`; leak test: `/_next/image?url=%2Farea-do-assinante%2Fmidia%2F…&w=640&q=75` → not 200 image.
### Pitfall 4: CDN/proxy caching of private responses
Cloudflare may front the domain at launch. Private routes send `Cache-Control: private` + `Vary: Cookie`; the public blur route is the only cacheable one.
### Pitfall 5: Metadata in originals
JPEG EXIF GPS (fixed by re-encoding) and MP4/MOV location boxes (fixed by `scrubMp4Metadata`). Tests: EXIF written with sharp `withExif` disappears; an ISO6709 string inside `udta` disappears from the stored bytes.
### Pitfall 6: Contacts reaching the public area by other fields
`cidade` and future fields are redacted too; DTO unit test asserts that a public DTO serialised to JSON contains none of the seeded contact values, author name/e-mail, `/area-do-assinante/midia/` or `/api/ad-media`.
### Pitfall 7: Redaction is heuristic
Obfuscations ("nove nove…", images with phone numbers) pass. Mitigation: moderation shows the public text; staff guide says reject/edit ads with contacts in text or photos; public photos are blurred anyway.
### Pitfall 8: Memory and size on uploads
`request.formData()` buffers the file; check `Content-Length` first; one file per request; Caddy cap. A 100 MB video is held in memory once during the request (VPS has enough RAM for single uploads; documented).
### Pitfall 9: Migrations
Every plan that adds a collection or select option creates a migration; plans run sequentially (snapshots). Select options are Postgres enums: adding audit actions needs a migration.
### Pitfall 10: Test isolation
`resetDatabase` must delete `ad-reports`, `ad-media`, `ads`, `ad-categories` before `audit-log`/`subscriptions`/`assinantes`; deleting `ad-media` through the Local API also removes files. Global setup re-seeds the Eu sou options. Tests use `PRIVATE_MEDIA_DIR` default (`./private-media`), cleared by global setup.

## Code Examples
Shapes only (the executor writes the code):
- Route handler signature (Next 16): `export async function GET(request: Request, { params }: { params: Promise<{ id: string; variante: string }> })`; `const { id, variante } = await params`.
- Principal in a route handler: `const payload = await getPayload({ config }); const { user } = await payload.auth({ headers: request.headers })`.
- Local API upload: `payload.create({ collection: 'ad-media', data, file: { data: buffer, mimetype, name, size }, overrideAccess: true, req })` (`File` type in `payload/dist/uploads/types.d.ts`).
- Streaming: `new Response(Readable.toWeb(fs.createReadStream(p, range ? { start, end } : undefined)) as ReadableStream, { status, headers })`.

## State of the Art
- Payload 3.91 `checkFileAccess` only queries the DB when read access returns a `Where` or is denied; it also checks drafts. `getFileHandler` streams with byte ranges (used by Phase 2 videos).
- Payload 3.91 cookie extraction falls back to `Sec-Fetch-Site` when `csrf` is set (Phase 3 03-06 finding).
- Next 16.4: `experimental.serverActions.bodySizeLimit` (default 1 MB) applies to all actions.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `where` on `'author.accessUntil'` works in the Postgres adapter | Pattern 4 | Use the two-query fallback (`author in activeIds`); int test decides |
| A2 | Mutating `req.file.data` in `ad-media` `beforeOperation` changes the stored bytes and `filesize` | Pattern 5 | Scrub in the route handler/service before `payload.create` (staff REST uploads then skip scrubbing: restrict staff `create` to the admin-only case or scrub in `beforeChange` via `req.file`) |
| A3 | A mixed image+video upload collection skips image sizes for videos without errors | Pattern 5 | Split into `ad-photos` and `ad-videos` collections; DTO/route unchanged |
| A4 | Chrome/Safari play MOV (H.264/HEVC) served as `video/mp4` | Pattern 5 | Accept MP4 only and tell users to export MP4 / "Mais compatível" |
| A5 | `afterChange` can write the blurred file next to the original with the final filename known (`doc.filename`) | Pattern 5 | Generate on first request in the public route and cache on disk |
| A6 | `type: 'ui'` field + `beforeDashboard` component patterns from 03-04/03-06 work for `ads` | Pattern 3 | Same fallbacks as Phase 3 |
| A7 | Docker copies the image directory owner into a new empty named volume (`private_media`), as for `media` | Pattern 5 | Bootstrap creates and chowns the volume path |

## Open Questions

1. **Edited approved ad:** hidden until re-approved (planned) or keep the previous approved version visible while the edit waits? The latter needs drafts/versions on `ads`.
2. **Public preview depth:** planned = every photo blurred, plus a "vídeo" label; is `/classisex` listed in the sitemap/indexed (planned: yes, like the old public `/classisex1/`)? User text can be sexually explicit even without contacts.
3. **Video formats:** no transcoding in this phase (no ffmpeg in the image). MP4/MOV up to 100 MB and 60 s; HEVC videos from iPhones may not play on some Android/desktop browsers. Add ffmpeg (apt package + background job) later if the client sees problems.
4. **Reports with "menor de idade":** planned = highlighted as urgent in the queue; should such a report hide the ad immediately until staff review? (Not in D-08; needs the client's OK.)
5. **"Eu sou" options:** seeded Casal, Solteiro, Solteira (editable). More options (e.g. Casal de mulheres, Trans)?
6. **Ad lifetime:** no automatic expiry beyond the subscription (D-06). Should ads expire after N days?
7. **Old URL `/classisex1/`:** redirect belongs to Phase 6 (MIG-03).
8. **Private media volume on the VPS:** the client must re-run `bootstrap-vps.sh` once (it rewrites the compose file with the new volume; secrets kept). Off-server backup of `private_media` joins `pgdata` + `media` in Phase 7.

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Postgres `paraiso_test` | int/e2e | yes (`pg_ctl -D /home/claude/pgdata start` if stopped — 03-01) | — |
| Chromium for Playwright | e2e | /opt/pw-browsers via `PW_CHROMIUM_PATH` (no H.264) | assert 206/headers, not playback |
| sharp | images, blur | yes (0.35.5) | — |
| ffmpeg/ffprobe | — | not in the image, not needed | pure `mp4.ts` |
| Staging host / SSH from our env | final check, volume | NO (egress proxy) | client re-runs bootstrap + checks on a phone |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (unit + int against paraiso_test), Playwright 1.64.1 (mobile + desktop) |
| Config file | vitest.config.mts, playwright.config.ts |
| Quick run command | `pnpm exec vitest run tests/unit` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREV-01 | redaction table; MP4 duration/scrub | unit (TDD) | `pnpm exec vitest run tests/unit/redact-contacts.test.ts tests/unit/mp4.test.ts` | ❌ (04-01) |
| CLAS-03/04, D-01/02 | field rules, limit 3, owner-only writes, pendente on edit, cascade on account delete | unit + int + e2e | `vitest run tests/unit/ad-rules.test.ts tests/int/ads.int.test.ts`, `playwright test tests/e2e/meus-anuncios.spec.ts` | ❌ (04-02) |
| PAINEL-07, D-03 | approve/reject/unpublish staff-only, audit, queue | int + e2e | `vitest run tests/int/ad-moderation.int.test.ts`, `playwright test tests/e2e/moderacao.spec.ts --project=desktop` | ❌ (04-03) |
| CLAS-01/02, D-05/06/07 | visibility, filters, pagination, contacts, expiry hides | unit + int + e2e | `vitest run tests/unit/ad-dto.test.ts tests/int/ad-visibility.int.test.ts`, `playwright test tests/e2e/classisex-assinante.spec.ts` | ❌ (04-04) |
| CLAS-06 | storage outside MEDIA_DIR, staff-only file route, EXIF/MP4 scrub, protected route rules, ranges | unit + int + e2e | `vitest run tests/unit/private-storage.test.ts tests/unit/blur.test.ts tests/unit/media-access.test.ts tests/unit/range.test.ts tests/int/ad-media.int.test.ts`, `playwright test tests/e2e/midia-protegida.spec.ts` | ❌ (04-05) |
| CLAS-01/02/03 media | upload/remove/reorder; gallery and video in the board | e2e | `playwright test tests/e2e/anuncio-midia.spec.ts` | ❌ (04-06) |
| PREV-01, D-04 | public DTO, blur, public page leak checks | unit + e2e | `vitest run tests/unit/public-ad-dto.test.ts tests/int/ad-visibility.int.test.ts`, `playwright test tests/e2e/classisex-publico.spec.ts` | ❌ (04-07) |
| CLAS-05, D-08 | report once, staff resolve/unpublish | int + e2e | `vitest run tests/int/ad-reports.int.test.ts`, `playwright test tests/e2e/denuncia.spec.ts` | ❌ (04-08) |
| all | phase leak matrix | e2e | `playwright test tests/e2e/classisex-seguranca.spec.ts` | ❌ (04-09) |

### Sampling Rate
- Per task commit: `pnpm exec vitest run tests/unit` + the task's own int/e2e file
- Per wave merge: `pnpm test`
- Phase gate: full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None separate (Phase 2/3 convention: each task writes its failing tests first). Helpers grow per slice: 04-02 `seedAd`, `createAd`/`updateAd` (staff REST), RESET_ORDER + Eu sou seed in global setup; 04-03 `aprovar`/`recusar`/`despublicar`; 04-05 `uploadAdMedia` (staff REST multipart) and fixture builders for EXIF/MP4; 04-08 `resolverDenuncia`. Global setup clears `./private-media`.

## Security Domain

### Applicable ASVS Categories (L1)
| Category | Applies | Control |
|----------|---------|---------|
| V4 Access control | yes | REST staff-only on all new collections; owner checks in the service; entitlement per request; protected media route |
| V5 Validation | yes | field rules, mime + sharp decode, MP4 parse, sizes, limits; reasons ≤ 300/500 chars |
| V8 Data protection | yes | contacts never in public DTOs; EXIF/location scrub; private cache headers; noindex |
| V12 Files | yes | storage outside web roots, server-chosen paths, nosniff, no SVG/HTML, size caps |
| V7 Logging | yes | moderation and report resolutions in `audit-log` |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Contact data in the open area | I | separate fields never in public DTO; redaction; HTML leak tests |
| Direct link to original media | I | separate volume; staff-only Payload file route; route handler rules; tests anonymous/expired/other |
| Traversal into private dir through public file routes | I | private dir outside `MEDIA_DIR`; encoded-path leak test |
| Subscriber approves own ad / edits others' ads | E/T | REST staff-only; status field staff-only; ownership check |
| Expired subscriber keeps access to contacts/media | I | `requireActiveSubscription` and `canViewMedia` per request |
| GPS/location in uploads | I | sharp re-encode; MP4 box scrub |
| Optimizer/CDN caching of private bytes | I | no `next/image`; `private` + `Vary: Cookie` |
| Oversized/malicious uploads | D/T | Content-Length + per-type caps + Caddy cap; sharp decode; nosniff |
| Report flooding | D | one open per reporter/ad; 10/day |
| Unaccountable moderation | R | audit rows with actor |

## Sources

### Primary (HIGH confidence)
- `node_modules/payload@3.91.0` (local working copy /home/claude/paraiso-site): `uploads/endpoints/getFile.js`, `uploads/checkFileAccess.js`, `uploads/generateFileData.js`, `uploads/canResizeImage.js`, `uploads/types.d.ts` (`File`), `auth/extractJWT.js`, `collections/operations/local/create.js`, `collections/operations/create.js`, `collections/operations/local/create.d.ts`.
- `@payloadcms/drizzle@3.91.0` `dist/queries/operatorMap.js` (`like`/`contains` → `ilike`).
- `next@16.4.2` docs: `01-app/02-guides/server-actions.md` (security, 1 MB limit), `03-api-reference/05-config/01-next-config-js/serverActions.md`.
- Repository (2026-10-19, HEAD 568008b): src/payload.config.ts, src/collections/{Media,Videos,Assinantes,AuditLog}.ts, src/lib/assinantes/{status,access,session,audit}.ts, src/access/roles.ts, src/lib/cache/*, next.config.ts, Dockerfile, Caddyfile, docker-compose.staging*.yml, scripts/deploy/bootstrap-vps.sh, tests/helpers/seed.ts, tests/e2e/helpers/api.ts, tests/e2e/assinantes-seguranca.spec.ts, tests/unit/deploy-files.test.ts.
- 04-CONTEXT.md, docs/discovery/WORDPRESS.md (ClassiSex aggregates).

### Secondary (MEDIUM confidence)
- ISO/IEC 14496-12 box layout (mvhd, udta, meta, free) and QuickTime location atoms — training knowledge; pinned by unit tests on fixtures.
- Browser `Sec-Fetch-Site` support (Safari ≥ 16.4) — training knowledge.

## Metadata
**Confidence breakdown:** file-serving/storage HIGH; access model HIGH; MP4 handling MEDIUM; video playback without transcoding MEDIUM/LOW (client check).
**Research date:** 2026-10-19 · **Valid until:** 2026-11-19
