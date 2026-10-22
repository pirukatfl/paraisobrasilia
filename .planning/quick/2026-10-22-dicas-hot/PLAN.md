---
type: quick
slug: dicas-hot
date: 2026-10-22
priority: medium (client decision M-08, SEO traffic)
autonomous: false
depends_on: ["06-01..06-09 (done)", "quick 2026-10-22-mural-e-anuncios-publicados (done)"]
requirements: [MIG-03, INST-05, PAINEL-03]
decisions: [DH-01, DH-02, DH-03, DH-04, DH-05, DH-06, DH-07, DH-08, DH-09, DH-10, I-1, I-2, I-3, I-4, I-5, I-6, I-7]
plans: "6 (A → {B, C} → D → E → F). B and C share no file and may run in parallel; D is ORCHESTRATOR-only; F is the client check"
waves:
  A: 1
  B: 2
  C: 2
  D: 3 (checkpoint, orchestrator)
  E: 4
  F: 5 (checkpoint, client)
migrations:
  - "<generated>_dicas (Plan A, schema: `pnpm payload migrate:create dicas`)"
  - "<later timestamp>_dicas_wp_bundle (Plan E, hand-written, no schema; committed TOGETHER with src/migrations/seed/dicas-wp.json)"
files_modified:
  # Plan A
  - src/collections/Dicas.ts
  - src/payload.config.ts
  - src/payload-types.ts (regenerated)
  - src/migrations/<ts>_dicas.ts, .json, src/migrations/index.ts
  - src/lib/dicas/dto.ts, src/lib/dicas/reads.ts, src/lib/dicas/public.ts, src/lib/dicas/revalidate.ts
  - src/lib/cache/expire.ts (comment only)
  - tests/helpers/seed.ts, tests/unit/dica-dto.test.ts, tests/int/dicas.int.test.ts
  # Plan B
  - src/app/(frontend)/dicas-hot/page.tsx, src/app/(frontend)/dicas-hot/[slug]/page.tsx
  - src/components/dicas/DicaCard.tsx, src/components/dicas/DicaJsonLd.tsx, src/components/home/DicasTeaser.tsx
  - src/app/(frontend)/page.tsx, src/components/Footer.tsx
  - src/lib/seo/sitemap.ts, src/app/sitemap.ts
  - src/lib/redirects/build.ts, src/lib/redirects/legacy-redirects.ts (regenerated)
  - tests/unit/sitemap.test.ts, tests/unit/legacy-redirects.test.ts
  - tests/e2e/helpers/api.ts, tests/e2e/dicas-hot.spec.ts
  # Plan C
  - src/lib/contos/import.ts (export 6 existing helpers, no behavior change)
  - src/lib/dicas/wp-dump.ts, src/lib/dicas/import.ts
  - scripts/import/dicas.ts, package.json
  - tests/fixtures/wp-dicas-mini.sql, tests/helpers/wp-dicas-fixture.ts
  - tests/unit/dicas-import.test.ts, tests/int/dicas-import.int.test.ts
  # Plan D (orchestrator)
  - src/migrations/seed/dicas-wp.json (written by the orchestrator, committed in Plan E)
  # Plan E
  - src/migrations/<ts>_dicas_wp_bundle.ts, src/migrations/index.ts
  - src/lib/redirects/build.ts, src/lib/redirects/legacy-redirects.ts (regenerated)
  - tests/unit/legacy-redirects.test.ts, tests/unit/dicas-bundle.test.ts, tests/e2e/redirects-site-antigo.spec.ts
  - docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md, .env.example
  - .planning/STATE.md
  # Plan F
  - .planning/quick/2026-10-22-dicas-hot/SUMMARY.md

must_haves:
  truths:
    - "A visitor (age gate accepted) opens /dicas-hot, sees the published Dicas Hot newest first, 12 per page with ?pagina=N, and never a draft"
    - "A visitor opens /dicas-hot/<slug> and reads the WHOLE text (no paywall, no Assine Já inside the text); a draft or unknown slug answers 404"
    - "Each dica page has title '<título> · Paraíso Brasília', meta description = Resumo or the first ~155 characters of the text, canonical /dicas-hot/<slug>, og:image = the cover's og size ONLY when 'Capa conferida' is ticked (else /og-default.jpg), and one JSON-LD Article script"
    - "The footer has 'Dicas Hot' → /dicas-hot; the home shows a 'Dicas Hot' section with the 3 newest and 'Ver todas as Dicas Hot' (hidden when none); the main menu is unchanged"
    - "sitemap.xml lists /dicas-hot and every published dica, never drafts"
    - "Anonymous REST /api/dicas returns no documents (staff-only), drafts included"
    - "Staff create, edit, save draft and publish Dicas Hot in the admin; changes show at once (cache tags 'dicas', 'dica:{slug}')"
    - "pnpm import:dicas -- --dry-run on the synthetic fixture prints counts and slugs only, never a title or a sentence of text; a write is idempotent by wpId and never overwrites staff edits; --uploads attaches each cover once, unconfirmed, and refuses paths outside the folder"
    - "Every one of the 30 old dicas-hot slugs, /dicas-hot/, /category/dicas-hot/ and /dicas-hot/page/2/ ends on /dicas-hot or /dicas-hot/<slug> through permanent redirects; LEGACY_SEM_DESTINO is only /o-que-e-dogging"
    - "Vitest + Playwright (both projects) green; typecheck, lint, build pass"
  artifacts:
    - path: "src/collections/Dicas.ts"
      provides: "staff-only collection with drafts, capaConferida, revisar, wpId"
      contains: "slug: 'dicas'"
    - path: "src/lib/dicas/dto.ts"
      provides: "public DTOs; cover only when capaConferida"
      contains: "capaConferida"
    - path: "src/app/(frontend)/dicas-hot/[slug]/page.tsx"
      provides: "public detail with metadata + JSON-LD"
    - path: "src/lib/dicas/import.ts"
      provides: "buildDicaRecords, importDicas, attachCovers, writeDicasBundle, readDicasBundle, loadDicasBundleIfPresent, formatDicasReport"
    - path: "scripts/import/dicas.ts"
      provides: "CLI --dry-run --export --from-bundle --uploads --listar-capas"
    - path: "src/migrations/seed/dicas-wp.json"
      provides: "reviewed bundle (Plan D) with dicas[] and legado[]"
    - path: "tests/e2e/dicas-hot.spec.ts"
      provides: "public section, SEO, drafts, cover gate, REST closed"
  key_links:
    - from: "src/lib/redirects/build.ts buildLegacyRedirects"
      to: "src/migrations/seed/dicas-wp.json legado[]"
      via: "third argument dicas: { wpSlug, slug | null }[]"
      pattern: "dicas-hot/"
    - from: "src/lib/dicas/dto.ts"
      to: "Media sizes.card / sizes.og"
      via: "capa populated (depth 1) and capaConferida === true"
      pattern: "capaConferida === true"
    - from: "src/migrations/<ts>_dicas_wp_bundle.ts"
      to: "loadDicasBundleIfPresent"
      via: "seed/dicas-wp.json"
      pattern: "dicas-wp.json"
---

# Quick: Dicas Hot (DH-01..DH-10)

<objective>
Bring the 30 "Dicas Hot" posts of the old WordPress site back as a NEW, fully public, SEO-first section: staff-editable
collection `dicas` (draft/publish), list `/dicas-hot` with pagination, detail `/dicas-hot/<slug>`, footer link + home
section, sitemap, share previews; an importer modelled on the Contos import (Phase 5) that reuses the streaming dump
parser and HTML→Lexical conversion, ships a reviewed bundle in the repo plus a loader migration, optionally attaches the
featured images with `--uploads`; and the legacy redirect map sends the 30 old slugs, `/dicas-hot/` and
`/category/dicas-hot/` to the new pages.

Purpose: keep the Google traffic those posts bring (M-08) without opening any member content.
Output: 6 plans. A–C and E are executor plans (each ends green, one commit per task). D is an ORCHESTRATOR step (real
dump). F is the client check on staging.

HARD RULES (all plans):
- No executor ever opens the real WordPress dump or anything under /mnt/project-files/private. Executors use only the
  synthetic fixture `tests/fixtures/wp-dicas-mini.sql`. Plan D is done by the orchestrator (main session); an executor
  that reaches Plan D stops and hands back.
- Importer output = counts + slugs only. Never titles, text, excerpts, file names of people, authors (DH-10).
- Do not add "Dicas Hot" to the main menu (DH-03). Do not touch `/quem-somos/dicas` (institutional "Dicas").
</objective>

<execution_context>
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/workflows/execute-plan.md
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/2026-10-22-dicas-hot/CONTEXT.md
@.planning/PROJECT.md
@.planning/phases/06-migra-o-do-wordpress/06-OLD-URLS.md
@.planning/phases/05-recados-mensagens-e-contos/05-04-SUMMARY.md

Analogs to copy (read each once):
- Collection: `src/collections/Contos.ts` (prepare hook, slug rules, versions/drafts, staff-only access, editor features)
- Reads/DTO/cache: `src/lib/contos/{reads,dto,public,revalidate}.ts`, `src/lib/cache/{cached,expire}.ts`
- Pages: `src/app/(frontend)/contos/page.tsx`, `src/app/(frontend)/contos/[slug]/page.tsx`, `src/components/contos/ContoCard.tsx`
- Home teaser: `src/components/home/AboutTeaser.tsx`; home: `src/app/(frontend)/page.tsx` (`optional()` fail-soft)
- SEO: `src/lib/seo/metadata.ts` (`buildPageMetadata`), `src/lib/seo/sitemap.ts`, `src/app/sitemap.ts`,
  `src/lib/parties/queries.ts` (`toAbsoluteOgUrl`, lines 71-77)
- Import: `src/lib/contos/import.ts`, `src/lib/contos/wp-dump.ts`, `scripts/import/contos.ts`,
  `src/migrations/20261020_132231_contos_wp_bundle.ts`, uploads safety in `src/lib/migracao/load.ts` `addPhotos` (lines ~376-430)
- Tests: `tests/int/contos-import.int.test.ts`, `tests/unit/contos-import.test.ts`, `tests/helpers/wp-dump-fixture.ts`,
  `tests/fixtures/wp-contos-mini.sql`, `tests/e2e/contos.spec.ts`, `tests/e2e/helpers/api.ts` (`createConto`, `upload`),
  `tests/unit/legacy-redirects.test.ts`, `tests/e2e/redirects-site-antigo.spec.ts`

<interfaces>
From src/lib/contos/wp-dump.ts (reuse, do not modify):
  export type Row = Record<string, string | number | null>; export type WpTables = Record<string, Row[]>
  export type WpConto = { wpId; wpSlug; title; html; publishedAt /* ISO UTC */; restricted: boolean; builder: boolean }
  export const DEFAULT_WP_PREFIX = 'wp26_'
  export async function readWpTables(source, opts: { prefix?; tables: string[]; rowFilter?: (table, row) => boolean }): Promise<WpTables>
  export function extractContos(tables, opts?: { categorySlug?: string }): WpConto[]   // filters metas by ['_members_access_role','_elementor_edit_mode']; oldest first; throws 'Categoria "<slug>" não encontrada no dump.'
From src/lib/contos/html-to-lexical.ts: export function htmlToLexical(html): LexicalState; export function decodeEntities(text): string; export type LexicalNode, LexicalState
From src/lib/contos/excerpt.ts: SLUG_RE, SLUG_MAX (200), slugify, plainTextOf, wordCount, chamadaOf(state, max) (word-boundary cut + '…')
From src/lib/contos/import.ts (private today; Plan C adds `export` only): redactTextNodes(node): number, stripShortcodes(node): number,
  dedupeKey(plain): string, firstWords(plain, n): string, baseSlugOf(conto: WpConto): string, withSuffix(base, n): string; also exported: TITLE_MAX = 160
From src/lib/classisex/redact.ts: export const REDACTED_LABEL = '[contato só para assinantes]'; export function redactContacts(text): { text; removed }
From src/lib/seo/metadata.ts: buildPageMetadata({ title, description?, path, image?: { url, width, height, alt } }): Metadata
From src/components/classisex/Pagination.tsx: Pagination({ basePath, page, totalPages, params: Record<string, string | undefined> })
From src/lib/format/date.ts: formatShortDate(iso): string ('dd/MM/yyyy')
From src/lib/redirects/build.ts: buildLegacyRedirects(markdown, contos: { wpSlug; slug }[]): { redirects; semDestino }; PAGE_DESTINATIONS (has 'dicas-hot': '/quem-somos/dicas' today); renderLegacyModule(result)
Media collection (src/collections/Media.ts): public read; required `alt`; imageSizes card (640w webp), gallery (≤1600 webp), og (1200×630 jpeg); 15 MB cap; mimeTypes jpeg/png/webp.
</interfaces>

Environment notes for executors (from 05-04): local Postgres may need starting
(`/usr/lib/postgresql/16/bin/pg_ctl -D /home/claude/pgdata start` as the postgres user); `.env` in this clone is a
directory — export the dev env yourself (`set -a; . ./.env/.env; set +a`) before `pnpm payload migrate:create` /
`pnpm generate:types`. Tests use the `paraiso_test` database as today.
</context>

---

## Plan A — Collection `dicas`, migration, public read layer (wave 1)

<tasks>

<task type="auto" tdd="true">
  <name>Task A1: Dicas collection + schema migration + types</name>
  <files>src/collections/Dicas.ts, src/payload.config.ts, src/payload-types.ts, src/migrations/&lt;ts&gt;_dicas.ts, src/migrations/&lt;ts&gt;_dicas.json, src/migrations/index.ts, src/lib/dicas/revalidate.ts, src/lib/cache/expire.ts, tests/helpers/seed.ts, tests/int/dicas.int.test.ts</files>
  <behavior>
    - Anonymous and assinante Local API/REST reads of `dicas` return nothing (access = isStaff for read, readVersions, create, update, delete), drafts included
    - Staff create with empty slug gets slugify(title); duplicate slug → ValidationError 'Já existe uma dica com este endereço.'; invalid slug → 'Use só letras minúsculas, números e hífens.'
    - capaConferida defaults to true on create; revisar defaults to false
    - Publishing/editing calls expire(['dicas', 'dica:<slug>']) and also the previous slug when it changed (unit-mock not needed: follow the contos revalidate shape)
  </behavior>
  <action>
    Per DH-05, DH-01, I-5, I-6. Create `src/collections/Dicas.ts` by copying the structure of `src/collections/Contos.ts`:
    slug 'dicas'; labels { singular: 'Dica Hot', plural: 'Dicas Hot' }; admin group 'Dicas Hot', useAsTitle 'title',
    defaultColumns ['title', 'publishedAt', '_status', 'revisar'], listSearchableFields ['title', 'slug'], description
    'Dicas Hot do site: textos abertos a qualquer visitante e ao Google. Salve como rascunho para revisar; Publicar coloca no ar.';
    defaultSort '-publishedAt'; versions { drafts: true, maxPerDoc: 20 }; access all isStaff; hooks beforeValidate (a
    `prepare` like Contos but querying collection 'dicas', messages in `DICA_MESSAGES` with slugTaken 'Já existe uma dica
    com este endereço.'), afterChange/afterDelete from a new `src/lib/dicas/revalidate.ts` (same as contos/revalidate.ts
    with tags 'dicas' and `dica:${slug}`). Fields, in this order: title (text, required, maxLength 160, 'Título');
    slug (text, required, unique, index, maxLength SLUG_MAX, sidebar, label 'Endereço', description 'Endereço:
    /dicas-hot/…  Se ficar vazio, é criado a partir do título. Mudar o endereço quebra links já compartilhados e o Google.',
    validate SLUG_RE); publishedAt (date, required, index, sidebar dayOnly dd/MM/yyyy, 'Data de publicação', description
    'Ordena a lista: mais recentes primeiro.'); resumo (textarea, maxLength 300, 'Resumo', description 'Aparece na lista e
    como descrição no Google e nas prévias do WhatsApp (o Google mostra uns 155 caracteres). Se ficar vazio, usamos o começo
    do texto.'); capa (upload relationTo 'media', optional, 'Imagem de capa', description 'Sem nudez explícita: esta parte do
    site é aberta.'); capaConferida (checkbox, defaultValue true, 'Capa conferida (sem nudez explícita)', description 'A capa
    só aparece no site e nas prévias de compartilhamento com esta caixa marcada. Capas trazidas do site antigo chegam
    desmarcadas: olhe a imagem e marque.' — per I-1); texto (richText, required, 'Texto', same lexicalEditor feature list as
    Contos: Paragraph, Heading h2/h3, Bold, Italic, Unordered/Ordered list, Fixed + Inline toolbar); revisar (checkbox,
    defaultValue false, sidebar, 'Conferir texto importado', description 'Marcado pela importação quando o post antigo era
    montado no Elementor, perdeu imagens, shortcodes ou contatos, ou era curto. Confira o texto e desmarque.' — per DH-08);
    wpId (number, unique, index, sidebar readOnly 'Código no site antigo'); wpSlug (text, sidebar readOnly 'Endereço no site
    antigo', description 'Usado para redirecionar o link antigo.'); importadoEm (date, sidebar readOnly); capaImportadaEm
    (date, sidebar readOnly, 'Capa importada em', description 'Preenchido quando a importação trouxe a capa. A importação
    nunca troca uma capa de novo.'). Do NOT add the seo plugin to this collection (I-5).
    Register `Dicas` in payload.config.ts right after Contos. Add 'dicas' to RESET_ORDER in tests/helpers/seed.ts right
    after 'contos' (before 'media', since capa references media). Add a `seedDica(payload, { title, slug?, paragrafos,
    publishedAt?, status?, resumo?, capa?, capaConferida?, revisar? })` helper next to `seedConto` (lexicalParagraphs).
    Extend the comment in src/lib/cache/expire.ts with "'dicas' (lists, home, sitemap) and 'dica:{slug}' (quick dicas-hot)".
    Then `pnpm payload migrate:create dicas` (dev DB, env exported), check the generated SQL creates `dicas`, `_dicas_v`,
    the enum for _status and the capa FK to media, and nothing else (no drift on other tables — if drift appears, stop and
    report it); `pnpm generate:types`.
    Write tests/int/dicas.int.test.ts (getTestPayload/resetDatabase pattern of tests/int/contos.int.test.ts) for the behaviors.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/int/dicas.int.test.ts tests/int/contos.int.test.ts</automated>
  </verify>
  <done>Migration + index entry committed; types regenerated; int test green; contos tests unchanged and green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task A2: Public reads, DTOs and cached accessors</name>
  <files>src/lib/dicas/reads.ts, src/lib/dicas/dto.ts, src/lib/dicas/public.ts, tests/unit/dica-dto.test.ts, tests/int/dicas.int.test.ts</files>
  <behavior>
    - findPublishedDicas(payload, { page, limit = DICAS_PAGE_SIZE (12) }) returns published only, newest first, depth 1 (capa populated); drafts never
    - findPublishedDica(payload, slug) → published doc or null (draft slug → null); findPublishedDicaSlugs → [{ slug, updatedAt }] published only; findLatestDicas(payload, n) → n newest published
    - toDicaCardDTO: { slug, title, dateLabel, resumo, capa } where resumo = doc.resumo trimmed or chamadaOf(texto, 200); capa = null unless capaConferida === true AND capa is a populated Media with a url
    - toPublicDicaDTO: { slug, title, dateLabel, publishedAt, updatedAt, texto, description (≤155, from resumo cut at word boundary with '…', else chamadaOf(texto, 155)), capa: { url (sizes.gallery?.url ?? url), width, height, alt } | null, ogImage: { url absolute from sizes.og.url, width 1200, height 630, alt } | null } — both null when capaConferida !== true
  </behavior>
  <action>
    Per DH-01, DH-04, I-1. Mirror src/lib/contos/reads.ts (no 'server-only', takes payload) and src/lib/contos/public.ts
    ('server-only', `cached(...)` with key parts 'dicas:list', 'dicas:one', 'dicas:slugs', 'dicas:latest' and tags
    ['dicas'] / ['dicas', `dica:${slug}`]). Exports from public.ts: getPublicDicas(page), getPublicDica(slug),
    getPublicDicaSlugs(), getLatestDicas(n). DTO module has no server-only import (unit-testable): build the absolute og url
    exactly like `toAbsoluteOgUrl` in src/lib/parties/queries.ts (NEXT_PUBLIC_SERVER_URL fallback 'http://localhost:3000');
    the card image uses sizes.card (url/width/height), falling back to the original only when the card size is missing.
    The full text IS public here (DH-01) — there is no open/closed split; do not import splitConto.
    Unit tests: cover gate (capaConferida false/true/undefined, capa as id number vs object), description cut, resumo fallback.
    Int tests (append to dicas.int.test.ts): drafts never returned by any read; pagination 13 docs → 2 pages; latest(3).
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/unit/dica-dto.test.ts tests/int/dicas.int.test.ts</automated>
  </verify>
  <done>Reads/DTOs/public accessors exported with the shapes above; tests green.</done>
</task>

</tasks>

---

## Plan B — Public pages, footer, home, sitemap (wave 2, after A; parallel with C)

<tasks>

<task type="auto">
  <name>Task B1: /dicas-hot list + detail, card, JSON-LD; unshadow /dicas-hot in the legacy map</name>
  <files>src/app/(frontend)/dicas-hot/page.tsx, src/app/(frontend)/dicas-hot/[slug]/page.tsx, src/components/dicas/DicaCard.tsx, src/components/dicas/DicaJsonLd.tsx, src/lib/redirects/build.ts, src/lib/redirects/legacy-redirects.ts, tests/unit/legacy-redirects.test.ts</files>
  <action>
    Per DH-02, DH-04, DH-09 (first half). List page copies contos/page.tsx: `dynamic = 'force-dynamic'`; parse ?pagina;
    metadata via generateMetadata: title 'Dicas Hot', description 'Dicas Hot do Paraíso Brasília: swing, casais liberais,
    fetiches e prazer a dois, com respeito e sem tabu.', path '/dicas-hot' on page 1 and `/dicas-hot?pagina=N` on N>1;
    eyebrow 'Leitura', h1 'Dicas Hot' (id titulo-dicas), one intro line, grid of DicaCard (showImage true), EmptyState
    ('Nenhuma dica publicada ainda.') when empty, Pagination basePath '/dicas-hot'. No Assine Já CTA, no members link.
    DicaCard: like ContoCard (article aria-labelledby, h2 link, date, resumo) plus, when `showImage` and dto.capa, a
    next/image of the card size above the title (alt from capa, `sizes="(min-width: 768px) 50vw, 100vw"`), and the link
    'Ler: <título>'.
    Detail page: generateMetadata → buildPageMetadata({ title, description, path: `/dicas-hot/${slug}`, image: ogImage ??
    undefined }) and 'Dica não encontrada' when missing; render article max-w-[720px]: eyebrow link 'Dicas Hot' → /dicas-hot,
    h1 (id titulo-dica), date, capa (next/image, priority, width/height from DTO) when present, `<RichText data={texto} />`,
    then section 'Leia também' (h2) with up to 3 of getLatestDicas(4) excluding the current slug, then a link 'Voltar para
    as Dicas Hot'. notFound() when missing. Render `<DicaJsonLd dica={...} />`: a server component emitting one
    `<script type="application/ld+json">` with @type Article, headline, datePublished, dateModified, mainEntityOfPage
    (absolute canonical from NEXT_PUBLIC_SERVER_URL), image [ogImage.url] only when present, author and publisher
    { @type Organization, name 'Paraíso Brasília' }, inLanguage 'pt-BR'. Serialize with JSON.stringify and replace every
    '<' with '<' before dangerouslySetInnerHTML (XSS via title, T-DH-05).
    Legacy map (so the new route is not shadowed before Plan E): in build.ts set PAGE_DESTINATIONS['dicas-hot'] = null,
    leave the dicas posts in semDestino for now, regenerate with `UPDATE_REDIRECTS=1 pnpm exec vitest run
    tests/unit/legacy-redirects.test.ts`, then run it again without the flag. In the test add `expect(get('/dicas-hot')).toBeUndefined()`;
    the other assertions stay as they are until Plan E.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run tests/unit/legacy-redirects.test.ts</automated>
  </verify>
  <done>Both routes render; `/dicas-hot` is no longer redirected; legacy map regenerated and its test green.</done>
</task>

<task type="auto">
  <name>Task B2: Footer + home section + sitemap; e2e for the whole public section</name>
  <files>src/components/Footer.tsx, src/components/home/DicasTeaser.tsx, src/app/(frontend)/page.tsx, src/lib/seo/sitemap.ts, src/app/sitemap.ts, tests/unit/sitemap.test.ts, tests/e2e/helpers/api.ts, tests/e2e/dicas-hot.spec.ts</files>
  <action>
    Per DH-03, DH-04. Footer: add { href: '/dicas-hot', label: 'Dicas Hot' } right after Contos in `navigate`. Do NOT
    touch src/lib/site/nav.ts. DicasTeaser({ dicas: DicaCardDTO[] }): returns null when empty; section aria-labelledby
    'titulo-dicas-home', same box styling as AboutTeaser, h2 'Dicas Hot', a list of up to 3 links (title + date, text only,
    no images — keeps the home light, MIG-04), and `Link` '/dicas-hot' with class btn-secondary 'Ver todas as Dicas Hot'.
    Home: load `optional(() => getLatestDicas(3))` in the existing Promise.all and render `<DicasTeaser>` between
    AboutTeaser and DirectionsTeaser (tests/e2e/home.spec.ts pins Próximas festas < Quem somos < Como chegar; this order
    keeps it).
    Sitemap: `SitemapInput.dicas?: { slug; updatedAt }[]`; add `${root}/dicas-hot` (weekly, 0.6) always, and each
    `/dicas-hot/<slug>` (lastModified, monthly, 0.6); app/sitemap.ts passes getPublicDicaSlugs(). Update
    tests/unit/sitemap.test.ts: first case length 12 → 13 and contains '/dicas-hot'; new case lists dica slugs.
    e2e helper api.ts: `createDica({ title, slug?, paragrafos, publishedAt?, status?, resumo?, capa?, capaConferida? })`
    POST /api/dicas (like createConto) and expose the existing `upload('media', 'flyer-square.jpg', { alt })` as
    `createMedia(alt)` if not already public.
    tests/e2e/dicas-hot.spec.ts (serial; beforeAll deleteAll('dicas'); afterAll deleteAll('dicas'); visitor context with
    cookie pb_age_ok=1): (1) footer link 'Dicas Hot' → /dicas-hot, main menu has NO 'Dicas Hot' (desktop 'Principal' /
    mobile 'Menu'); (2) home shows heading 'Dicas Hot' with the 3 newest and 'Ver todas as Dicas Hot'; (3) /dicas-hot lists
    published newest first, not the draft; with 13 published, page 2 via 'pagina=2' has the 13th oldest; (4) detail shows
    every paragraph (including the last one) and no 'Assine Já' inside the article; (5) meta description equals the
    resumo; canonical ends with /dicas-hot/<slug>; exactly one script[type="application/ld+json"] containing '"@type":
    "Article"'; (6) a dica whose capa has capaConferida false → no img in the article and og:image contains og-default.jpg;
    after staff PATCH capaConferida true → og:image contains '/api/media/file/' and the img shows; (7) draft slug → 404;
    (8) anonymous `request.get('/api/dicas?draft=true')` → no docs (status 403 or totalDocs 0); (9) /sitemap.xml contains
    `/dicas-hot</loc>` and the published slug, not the draft slug. Run both Playwright projects.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run tests/unit/sitemap.test.ts && pnpm exec playwright test tests/e2e/dicas-hot.spec.ts tests/e2e/home.spec.ts tests/e2e/home-sem-festas.spec.ts tests/e2e/assine-ja.spec.ts tests/e2e/seo.spec.ts</automated>
  </verify>
  <done>Footer link, home section, sitemap entries live; dicas-hot.spec green on both projects; existing home/footer/SEO specs green.</done>
</task>

</tasks>

---

## Plan C — Importer: extractor, records, loader, covers, CLI (wave 2, after A; parallel with B)

<tasks>

<task type="auto" tdd="true">
  <name>Task C1: Synthetic fixture, extractor and record builder (pure)</name>
  <files>src/lib/contos/import.ts, src/lib/dicas/wp-dump.ts, src/lib/dicas/import.ts, tests/fixtures/wp-dicas-mini.sql, tests/helpers/wp-dicas-fixture.ts, tests/unit/dicas-import.test.ts</files>
  <behavior>
    - extractDicas(tables) returns only published `post` rows of category 'dicas-hot' (also those in postdev), oldest first, with excerpt, seoDescription (Yoast `_yoast_wpseo_metadesc` or Rank Math `rank_math_description`), capaWp (`_thumbnail_id` → attachment's `_wp_attached_file`, relative path like '2024/05/capa-dica.jpg', or null), builder, restricted
    - dicasRowFilter keeps postmeta only for DICAS_META_KEYS and posts only with post_type 'post'; `_elementor_data` rows are never kept; users/comments tables are never requested
    - buildDicaRecords: htmlToLexical → stripShortcodes → redactTextNodes, then every REDACTED_LABEL removed from text nodes (I-7); NO byline removal (I-4); 0 words → not imported, flag 'vazio', legado slug null; identical text → only the oldest imported, the other gets 'duplicado-de:<slug>' and legado → keeper slug; numeric or empty title/slug → derived like contos ('sem-titulo'); publicar = words >= 60 (I-3), else draft with flag 'curto'; revisar = any of builder, shortcode-restante, imagens-removidas (html had <img), contatos-removidos, mojibake, sem-titulo, curto
    - resumo = pickResumo: seoDescription → excerpt → null (I-2), each entity-decoded, tags stripped, whitespace collapsed, contacts removed, cut to 300 at a word boundary; flag 'resumo-do-texto' when null
    - legado has exactly one entry per extracted post (imported, duplicate or empty) — { wpSlug, slug | null }, slug null also for drafts
    - formatDicasReport prints 'Dicas encontradas: N · montadas no Elementor: N · com capa: N · restritas no site antigo: N · rascunhos: N · ignoradas: N · duplicadas: N · para conferir: N', then one line per post 'slug · N palavras · publicada|rascunho|ignorada|duplicada · capa|sem capa · flags'; a title or sentence from the fixture never appears in the output
  </behavior>
  <action>
    Per DH-06, DH-08, DH-10, I-2, I-3, I-4, I-7. In src/lib/contos/import.ts add `export` to redactTextNodes,
    stripShortcodes, dedupeKey, firstWords, baseSlugOf, withSuffix — no other change (contos tests must stay green).
    src/lib/dicas/wp-dump.ts: DICAS_TABLES = ['posts','terms','term_taxonomy','term_relationships','postmeta'];
    DICAS_META_KEYS = ['_members_access_role','_elementor_edit_mode','_thumbnail_id','_wp_attached_file',
    '_yoast_wpseo_metadesc','rank_math_description']; dicasRowFilter(table, row) — postmeta: meta_key in DICAS_META_KEYS; posts: post_type
    'post' only (`_wp_attached_file` lives in the attachment's postmeta, so attachment rows are not needed); `type WpDica = WpConto & { excerpt; seoDescription: string |
    null; capaWp: string | null }`; extractDicas(tables) = extractContos(tables, { categorySlug: 'dicas-hot' }) enriched
    from tables.posts (post_excerpt) and postmeta maps. capaWp must be rejected (null) when it is absolute, contains '..'
    or a backslash. Never read post_author.
    src/lib/dicas/import.ts (pure part now; loader in C2): `export const DICAS_BUNDLE_VERSION = 1`; `export type
    DicaRecord = { wpId; wpSlug; slug; title; publishedAt; resumo: string | null; texto: LexicalState; publicar: boolean;
    revisar: boolean; capaWp: string | null }`; `export type DicaLegado = { wpSlug: string; slug: string | null }`;
    buildDicaRecords(dicas: WpDica[]): { records; legado; report }; formatDicasReport(report, load?, covers?).
    Fixture tests/fixtures/wp-dicas-mini.sql (copy the header/CREATE TABLE style of wp-contos-mini.sql; all data invented;
    first comment line 'Fixture sintético: todos os dados abaixo são inventados.'): terms dicas-hot, postdev, contos;
    posts 201 normal dica (excerpt, thumbnail → attachment 290 with `_wp_attached_file` '2024/05/capa-dica.jpg'), 202
    Elementor (meta builder + a large `_elementor_data` row + `[elementor-template id="1"]` + an <img>), 203 slug '7013-2'
    with a real title, 204 same text as 201 but newer, 205 empty, 206 under 60 words, 207 with a phone '(61) 99999-0000'
    and an e-mail, 208 with `_yoast_wpseo_metadesc`, 209 dica in post_status 'draft', 210 contos only, 211 dicas-hot +
    postdev, 212 thumbnail pointing to '../../etc/passwd'; plus a wp26_users table with one invented row (never
    requested). Helper tests/helpers/wp-dicas-fixture.ts: fixturePath(), gzip-to-temp (copy wp-dump-fixture.ts).
    Unit tests for every behavior, including "output contains no fixture title" (pick 3 titles as sentinels).
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/unit/dicas-import.test.ts tests/unit/contos-import.test.ts tests/unit/wp-dump.test.ts tests/unit/html-to-lexical.test.ts</automated>
  </verify>
  <done>Pure extractor/record builder exported and unit-tested on the synthetic fixture; contos unit tests unchanged.</done>
</task>

<task type="auto" tdd="true">
  <name>Task C2: Loader, covers (--uploads), bundle, CLI</name>
  <files>src/lib/dicas/import.ts, scripts/import/dicas.ts, package.json, tests/int/dicas-import.int.test.ts</files>
  <behavior>
    - importDicas(payload, records, { req?, now? }) creates missing dicas by wpId (published if publicar, else draft; revisar as recorded; wpId, wpSlug, importadoEm; capaConferida left at its default), returns { criados, existentes, renomeados }; a second run creates 0; a staff-edited dica (title/text/status changed) is never touched
    - attachCovers(payload, records, { uploadsDir, now? }) for each record with capaWp: dica not found → semDica; dica with capa already set OR capaImportadaEm set → jaTinham (never re-attaches after staff removed it); path resolving or symlinking outside realpath(uploadsDir) → foraDaPasta; missing file → ausentes; extension not .jpg/.jpeg/.png/.webp or sharp format not jpeg/png/webp or Media create error (e.g. > 15 MB) → recusadas; else creates `media` { alt: title (≤120 chars) } with the file and updates the dica { capa, capaConferida: false, capaImportadaEm: now, _status: current status } → gravadas. Records without capaWp count as semCapa
    - writeDicasBundle(file, records, legado, now) / readDicasBundle(file) → { records, legado }: version check; every record validated (SLUG_RE ≤ SLUG_MAX, title non-empty, ISO date, booleans, resumo string ≤300 or null, capaWp null or relative without '..', texto.root.children array); every legado slug null or SLUG_RE; any invalid → Error('Arquivo de dicas inválido.')
    - loadDicasBundleIfPresent(payload, file, { req? }) → { skipped: true } when the file is missing, else importDicas(readDicasBundle(file).records)
    - CLI: `--dry-run` (report, nothing written), `--export <file>` (only outside the repo or exactly src/migrations/seed/dicas-wp.json), `--from-bundle <file>` (load from bundle), `--uploads <dir>` (after a write or a --from-bundle load, attach covers; the dir must exist), `--listar-capas` (prints 'Capas referenciadas: N' then one relative path per line, nothing written); WP_DUMP_PATH required except with --from-bundle; unknown option → exit 1; errors print a generic message (only plain Error messages from our modules)
  </behavior>
  <action>
    Per DH-06, DH-07, DH-10, I-1. Loader mirrors importContos/freeSlug (collection 'dicas'). attachCovers copies the
    safety sequence of `addPhotos` in src/lib/migracao/load.ts (path.resolve inside realpath, extension allow-list,
    fs.realpath again for symlinks, sharp(data).metadata() format → mimetype) and calls payload.create({ collection:
    'media', data: { alt }, file: { data, mimetype, name: path.basename(capaWp), size }, overrideAccess: true }) then
    payload.update({ collection: 'dicas', id, data: {...}, overrideAccess: true, draft: false }) keeping `_status` as
    found (read with draft: true). Counters type `CoverLoad = { gravadas; ausentes; recusadas; foraDaPasta; jaTinham;
    semDica; semCapa }` and `formatCovers(c)` → 'Capas: gravadas N · ausentes N · recusadas N · fora da pasta N · já tinham
    N · sem dica N · sem capa no site antigo N'.
    scripts/import/dicas.ts copies scripts/import/contos.ts (top-level await; lazy import of payload + config only when
    writing; BUNDLE_PATH = src/migrations/seed/dicas-wp.json; readWpTables with DICAS_TABLES, prefix WP_TABLE_PREFIX ||
    'wp26_', rowFilter dicasRowFilter) and the generic-error catch of scripts/import/wordpress.ts. Header comment lists
    the commands. package.json: "import:dicas": "cross-env NODE_OPTIONS=--no-deprecation payload run scripts/import/dicas.ts".
    Int tests (pattern of tests/int/contos-import.int.test.ts, incl. spawnSync CLI cases on the gzipped fixture): import +
    idempotency + staff edit kept; draft for short post; attachCovers with a temp uploads dir built at test time
    (copy tests/fixtures/flyer-square.jpg to 2024/05/capa-dica.jpg; a symlink inside pointing to a file outside → fora da
    pasta; a .gif → recusada; 212's '../' path is already null from C1); second attach → jaTinham; staff clears capa →
    still jaTinham; published stays published and capaConferida is false after attach; bundle round-trip and a tampered
    bundle (slug 'A B', capaWp '../x') rejected; CLI --dry-run output has counts/slugs and no fixture title; --export
    inside the repo (other path) refused; --listar-capas prints '2024/05/capa-dica.jpg'.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run tests/int/dicas-import.int.test.ts tests/int/contos-import.int.test.ts tests/unit/dicas-import.test.ts</automated>
  </verify>
  <done>`pnpm import:dicas` works on the synthetic fixture for all options; outputs aggregate-only; tests green.</done>
</task>

</tasks>

---

## Plan D — ORCHESTRATOR STEP: real dump → reviewed bundle (wave 3)

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task D1: ORCHESTRATOR — dry-run, export the bundle, local DEV load, covers list</name>
  <files>src/migrations/seed/dicas-wp.json</files>
  <what-built>Plans A–C: collection, public section and importer, all tested on synthetic data only.</what-built>
  <action>An executor subagent does NOTHING here and hands back. The orchestrator (main session) runs the steps below.</action>
  <how-to-verify>
    ORCHESTRATOR (main session; dev env exported; DEV database, never paraiso_test):
    1. `WP_DUMP_PATH=<real .sql.gz> pnpm import:dicas -- --dry-run` — expect 'Dicas encontradas: 30' (8 also in postdev;
       if the count differs, explain it). Review the per-slug lines: flags builder, imagens-removidas, contatos-removidos,
       mojibake, sem-titulo, curto, vazio, duplicado-de (beijo-grego vs beijo-grego-2 is a likely pair). Every slug of the
       30 in 06-OLD-URLS.md must appear.
    2. `… --export src/migrations/seed/dicas-wp.json` (the only in-repo path allowed). Spot-check 3 dicas in the JSON for
       leftover shortcodes/markup and that no author/user data exists (grep for '@', 'post_author', 'user').
    3. `… pnpm import:dicas` (DEV write), then again: second run 'Criados: 0'. Open /dicas-hot locally and two dicas.
    4. `… --listar-capas` → record only the COUNT. If the WordPress uploads backup is available locally, run
       `pnpm import:dicas -- --from-bundle src/migrations/seed/dicas-wp.json --uploads <uploads dir>` against DEV and record
       the 'Capas:' line. Otherwise note "capas: aguardando pasta".
    5. Write in the quick SUMMARY draft only aggregate lines (counts, flagged slugs). Nothing else from the dump.
    Do not commit the bundle here; Plan E commits it together with its loader migration.
  </how-to-verify>
  <resume-signal>Paste the aggregate report lines (counts + flagged slugs) or describe the problem.</resume-signal>
</task>

</tasks>

---

## Plan E — Loader migration, redirect map, docs (wave 4, after D)

<tasks>

<task type="auto" tdd="true">
  <name>Task E1: Bundle loader migration (committed with the bundle)</name>
  <files>src/migrations/&lt;ts&gt;_dicas_wp_bundle.ts, src/migrations/index.ts, src/migrations/seed/dicas-wp.json, tests/unit/dicas-bundle.test.ts</files>
  <behavior>
    - readDicasBundle(src/migrations/seed/dicas-wp.json) is valid; legado has one entry per old dicas-hot slug of 06-OLD-URLS.md (30) and every non-null legado slug is a record slug with publicar true
    - the loader migration file exists only together with the bundle (test asserts both or neither)
  </behavior>
  <action>
    Per DH-06. STOP and hand back if src/migrations/seed/dicas-wp.json does not exist (Plan D not done). Hand-write
    `src/migrations/<timestamp>_dicas_wp_bundle.ts` as a copy of 20261020_132231_contos_wp_bundle.ts calling
    loadDicasBundleIfPresent with seed/dicas-wp.json, logging 'dicas_wp_bundle: N criadas, M já existiam.'; down() never
    deletes. Timestamp later than the Plan A schema migration; append it LAST in src/migrations/index.ts. Lesson from 05-04
    (contos needed a second "carga" migration because the loader shipped before the file): the migration and the bundle go
    in the SAME commit. Unit test reads the bundle and 06-OLD-URLS.md (parseOldUrls) for the coverage assertions. Run
    `pnpm payload migrate` on the test DB path used by int tests (or the int suite) to prove the migration applies.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/unit/dicas-bundle.test.ts tests/int/dicas-import.int.test.ts</automated>
  </verify>
  <done>Bundle + loader migration committed together; tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task E2: Redirect map for the 30 slugs, /dicas-hot/ and /category/dicas-hot/</name>
  <files>src/lib/redirects/build.ts, src/lib/redirects/legacy-redirects.ts, tests/unit/legacy-redirects.test.ts, tests/e2e/redirects-site-antigo.spec.ts</files>
  <behavior>
    - buildLegacyRedirects(markdown, contos, dicas) — posts whose categorias include 'dicas-hot' map to `/dicas-hot/<slug>` when the bundle legado slug is non-null, else '/dicas-hot'; a dicas-hot slug missing from legado → '/dicas-hot'
    - '/category/dicas-hot' and '/category/dicas-hot/:path*' → '/dicas-hot' placed BEFORE '/category/:slug'; '/dicas-hot/page/:n' → '/dicas-hot'
    - semDestino === ['/o-que-e-dogging']; no redirect source equals '/dicas-hot'
  </behavior>
  <action>
    Per DH-09. In build.ts add the third parameter `dicas: { wpSlug: string; slug: string | null }[]` (pairs from
    readDicasBundle(...).legado), replace the `semDestino.push` branch for dicas-hot, add the three rules, update the
    header comments (and renderLegacyModule's second comment line: 'Fonte: 06-OLD-URLS.md + contos-wp.json +
    dicas-wp.json'). Test: load the dicas bundle like the contos one; validDestination accepts `/dicas-hot/<slug>` only
    for slugs of published records; replace the '/beijo-grego' assertions with "maps to the bundle destination";
    'accounts for every inventoried path' now expects semDestino to be exactly ['/o-que-e-dogging']; shadow samples add
    '/dicas-hot' and '/dicas-hot/x'. Regenerate with UPDATE_REDIRECTS=1, rerun without it. e2e
    redirects-site-antigo.spec.ts: import LEGACY_REDIRECTS; add cases '/dicas-hot/' → '/dicas-hot' (final 200),
    '/category/dicas-hot/' → '/dicas-hot', '/dicas-hot/page/2/' → '/dicas-hot', and for every old dicas-hot slug assert
    the final path equals its LEGACY_REDIRECTS destination with only 301/308 hops; replace the '/beijo-grego/ termina em
    404' test with '/o-que-e-dogging/ termina em 404'.
  </action>
  <verify>
    <automated>pnpm exec vitest run tests/unit/legacy-redirects.test.ts && pnpm exec playwright test tests/e2e/redirects-site-antigo.spec.ts</automated>
  </verify>
  <done>Map regenerated; the 30 slugs + /dicas-hot/ + /category/dicas-hot/ redirect to the new section; only /o-que-e-dogging stays 404.</done>
</task>

<task type="auto">
  <name>Task E3: Staff guide, staging runbook, state; full gate</name>
  <files>docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md, .env.example, .planning/STATE.md</files>
  <action>
    GUIA-DA-EQUIPE.md: new section '## Dicas Hot' (after the Contos section) in the guide's plain Portuguese: what it is
    (textos abertos, contam para o Google, ninguém precisa assinar), criar/editar/rascunho/publicar, Endereço (não mudar
    depois de publicado), Resumo (descrição no Google e no WhatsApp, até ~155 caracteres), Imagem de capa sem nudez
    explícita + "Capa conferida" (I-1: capas antigas chegam desmarcadas; olhar e marcar), filtro "Conferir texto importado"
    (DH-08: o que conferir — trechos soltos, imagens que sumiram, contatos apagados; desmarcar depois), onde aparece
    (rodapé, home, /dicas-hot, sitemap; não no menu), e a diferença para "Dicas" de Quem somos (I-6). Replace the line
    'As **Dicas Hot** antigas não têm página nova.' with 'Os links das **Dicas Hot** antigas levam às dicas novas
    (/dicas-hot).'
    STAGING.md: new '### 7.7 Dicas Hot (22/10/2026)' — the deploy runs `dicas` and `dicas_wp_bundle` (journalctl grep
    'dicas'), expected log 'dicas_wp_bundle: 30 criadas' minus ignored/duplicated (use the Plan D numbers); covers: the
    client extracts ONLY the files printed by `--listar-capas` from the uploads backup into
    /opt/paraiso-site/importacao/uploads (same AAAA/MM structure), chown 1000:1000, then runs
    `docker compose --env-file .env.staging run --rm -v /opt/paraiso-site/importacao:/importacao:ro -v
    paraiso-staging_media:/app/media -e MEDIA_DIR=/app/media migrate node_modules/.bin/payload run scripts/import/dicas.ts
    -- --from-bundle src/migrations/seed/dicas-wp.json --uploads /importacao/uploads` (backup first, as 7.6 step 2;
    confirm the volume name with `docker volume ls | grep media`), sends back only the 'Capas:' line; repeating is safe.
    .env.example: comment that import:dicas uses the same WP_DUMP_PATH and --uploads. STATE.md: add the Quick Tasks row
    (2026-10-22 · dicas-hot · description with DH-01..DH-10 and the migration names) and remove nothing else.
    Then the full gate.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm test && pnpm build</automated>
  </verify>
  <done>Docs updated; Vitest + Playwright (both projects) green; build passes.</done>
</task>

</tasks>

---

## Plan F — Client check on staging (wave 5)

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task F1: Deploy + client check (phone and panel)</name>
  <files>.planning/quick/2026-10-22-dicas-hot/SUMMARY.md</files>
  <what-built>Dicas Hot section (public, SEO), importer + bundle + loader migration, redirects for the old links, guide and runbook 7.7.</what-built>
  <how-to-verify>
    Orchestrator: push/deploy per docs/deploy/STAGING.md §4; ask the client to confirm `journalctl -u paraiso-update -n 80 | grep -i dicas`
    shows both migrations and the 'dicas_wp_bundle: N criadas' line; if the covers are wanted now, the client follows §7.7
    and sends back only the 'Capas:' line.
    Client, on a phone (https://novo.swingbrasilia.com.br):
    1. Rodapé → "Dicas Hot" abre a lista; a home mostra a seção "Dicas Hot" com 3 dicas e "Ver todas as Dicas Hot"; o menu
       de cima continua igual.
    2. Abrir 2 dicas: texto inteiro, sem pedir assinatura; "Leia também" funciona.
    3. Digitar 3 links antigos: /beijo-grego/ , /como-funciona-o-swing/ , /dicas-hot/ → caem nas páginas novas.
    4. Compartilhar uma dica no WhatsApp: título e resumo aparecem (imagem só se a capa estiver conferida).
    Client, in the panel (Dicas Hot):
    5. Filtrar "Conferir texto importado", abrir uma marcada, corrigir o que precisar, desmarcar e Publicar.
    6. Se houver capas importadas: olhar, marcar "Capa conferida", conferir que aparece na dica.
    7. Criar uma dica de teste como rascunho (não aparece no site), publicar (aparece), excluir.
    8. Responder: o menu de cima fica sem "Dicas Hot" (DH-03)? Ordem da descrição (I-2) e capas só após conferência (I-1) ok?
    Record in SUMMARY.md only: pass/fail per step, counts, client answers.
  </how-to-verify>
  <resume-signal>"aprovado" or the list of problems (step number + what happened).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| visitor → /dicas-hot pages | anonymous, untrusted; must see only published, public fields |
| visitor → /api/dicas REST | Payload REST is reachable from the internet |
| WordPress dump / uploads folder → importer | third-party legacy data (HTML, file paths) |
| repo bundle → loader migration on the VPS | file in git loaded at deploy |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-DH-01 | Information disclosure | Dicas REST / reads | mitigate | access isStaff on every op incl. readVersions; public reads only `_status: published` + `draft: false` via DTO; int + e2e (anonymous `/api/dicas?draft=true`, draft slug 404, sitemap without drafts) |
| T-DH-02 | Information disclosure | imported text/resumo (LGPD, "área aberta sem contatos") | mitigate | redactContacts on every text node and on resumo, label removed (I-7), dica flagged `revisar`; post_author/users/comments never read; report prints counts + slugs only (unit test with title sentinels) |
| T-DH-03 | Tampering / policy (explicit images in the open area) | imported covers | mitigate | attachCovers sets capaConferida false; DTO exposes capa/og only when `capaConferida === true`; e2e proves og-default until ticked |
| T-DH-04 | Tampering (path traversal) | `--uploads` | mitigate | capaWp rejected when absolute/'..'/backslash; realpath containment before and after symlink resolution; extension + sharp format allow-list; Media 15 MB cap; int tests for symlink, gif, '../' |
| T-DH-05 | Tampering (XSS) | JSON-LD, rich text | mitigate | JSON-LD serialized with '<' → '<'; texto rendered by the Lexical RichText converter (no raw HTML; htmlToLexical outputs text nodes only) |
| T-DH-06 | Spoofing (open redirect) | legacy map | mitigate | destinations fixed strings built from SLUG_RE-validated bundle slugs; unit test validates every destination is an existing route/published slug |
| T-DH-07 | Tampering | bundle → migration | mitigate | readDicasBundle validates every field and rejects the file; loader idempotent by wpId and never updates existing docs; down() never deletes |
| T-DH-08 | Information disclosure | real dump handling | mitigate | executors never open it (HARD RULES); dump stays outside git under the private mount; staging copy shredded per runbook 7.6 step 6 |
| T-DH-09 | Information disclosure | unconfirmed cover files at /api/media/file/… | accept | images were already public on the old site; not linked, not in sitemap or OG until confirmed; staff can delete the media |
</threat_model>

<verification>
- Plan gates as listed per task; final: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (Vitest + Playwright both projects).
- grep gates: `grep -v '^\s*//' src/lib/site/nav.ts | grep -c "dicas-hot"` → 0 (menu unchanged, DH-03);
  `grep -c '"/dicas-hot"' src/lib/redirects/legacy-redirects.ts` ≥ 1 and no `source: "/dicas-hot"` line.
- Source audit: GOAL (public SEO section + redirects) → A, B, E2; DH-01 → A2/B1; DH-02 → B1; DH-03 → B2; DH-04 → A2/B1/B2;
  DH-05 → A1/E3; DH-06 → C1/C2/D1/E1; DH-07 → C2/E3; DH-08 → A1/C1/E3; DH-09 → B1/E2; DH-10 → C1/C2/D1; I-1 → A1/A2/C2;
  I-2/I-3/I-4/I-7 → C1; I-5/I-6 → A1/B2; tests unit/int/e2e → A–C/E; migrations → A1/E1; staff guide → E3; client check → F1.
  Deferred items (menu entry, inline images, Search Console) appear in no task.
</verification>

<success_criteria>
- /dicas-hot and /dicas-hot/<slug> live, public, SEO-complete, in footer/home/sitemap; drafts invisible everywhere.
- 30 old slugs + /dicas-hot/ + /category/dicas-hot/ end on the new section with permanent redirects.
- Importer reproducible and aggregate-only; bundle and loader migration shipped together; covers optional and gated.
- Staff guide + runbook 7.7 written; full test gate and build green; client approves on staging.
</success_criteria>

<output>
Each executor plan appends its section (tasks, commits, deviations) to `.planning/quick/2026-10-22-dicas-hot/SUMMARY.md`;
Plan D adds only aggregate import lines; Plan F adds the client answers.
</output>
