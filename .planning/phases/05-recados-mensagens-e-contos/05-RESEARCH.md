# Phase 5: Recados, mensagens e contos - Research

**Researched:** 2026-10-20
**Domain:** Members-only short notes board with staff moderation, private text messages between active subscribers (threads, unread counter, block, report), stories (contos) with an open excerpt and a members-only remainder, public teasers with "Assine Já", and a one-off idempotent import of the 50 WordPress contos from a gzip SQL dump. Payload 3.91 + Next 16.4 + Postgres 16, built on the Phase 3 access model and the Phase 4 ClassiSex patterns.
**Confidence:** HIGH for codebase patterns (Phase 3/4 code and summaries read 2026-10-20, HEAD 42eb9d3); HIGH for Payload/Lexical APIs used (read from `node_modules` 3.91.0 in /home/claude/paraiso-site: `convertHTMLToLexical` needs a `JSDOM` constructor (not installed), `convertLexicalToPlaintext` at `@payloadcms/richtext-lexical/plaintext`, `payload run <script>` in `payload/dist/bin/index.js`, `migrate:create --force-accept-warning` creates a blank migration in `@payloadcms/drizzle` `buildCreateMigration.js`); MEDIUM for the exact shape of the real dump (MariaDB 11.8 `mysqldump`, facts from docs/discovery/WORDPRESS.md only — this research did NOT open the dump).

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 Recados:** short text notes (text only, up to 500 characters) visible only to active subscribers; every new note goes through the staff moderation queue (REC-01, REC-04). Author shown by apelido (same concept as ClassiSex). Hidden when the author's subscription ends. Contacts in the text are removed automatically (same `redactContacts`) — contact happens through private messages.
- **D-02 Mensagens privadas:** text only, between active subscribers, started by the "Enviar mensagem" button on a ClassiSex ad (and on a recado). Threaded conversation with replies (REC-02). Block (the blocked person can no longer send) and report (goes to staff, like ad reports) (REC-03). No prior moderation of private messages.
- **D-03 Contos:** import the 50 WordPress contos (category Contos; ~1,280 words average; 10 were restricted). Each conto has an open excerpt (default: first ~3 paragraphs, editable by staff) and the rest only for subscribers (PREV-03, PAINEL-03). Staff publish new contos and set the open excerpt in the panel. The import is a script that reads the WP dump from a path given by an environment variable (the dump stays out of git, in /mnt/project-files/private; the orchestrator runs it) and creates contos through the Local API, idempotent.
- **D-04 Aviso de mensagem nova:** unread counter in the members-area menu. E-mail stays off.
- **D-05 Prévias (PREV-02, PREV-04):** the open area shows teasers of recados without contact and without identifiable apelido (e.g. "N recados novos esta semana" + short redacted snippets) and every preview has an "Assine Já" call.

### Deferred (OUT OF SCOPE)
- "Dicas Hot" (30 posts) — not a requirement.
- Subscriber-submitted contos (CONT-01, v2).

### Orchestrator constraints (this planning run)
- Import script reads a gzip WordPress SQL dump from `WP_DUMP_PATH`; tables `wp26_posts`, `wp26_terms`, `wp26_term_taxonomy`, `wp26_term_relationships`, restricted flag from `wp26_postmeta._members_access_role`; HTML incl. Elementor leftovers → Lexical; open excerpt = first ~3 paragraphs; keep the slug for Phase 6 redirects; no author personal data. Tests use a small synthetic SQL fixture, never the real dump. Planner/executors never read /mnt/project-files/private. Running against the real dump is an orchestrator step.
- Leak tests: anonymous/expired cannot read recados, messages or the restricted part of contos via pages, RSC or REST; blocked users cannot message.
- Last plan: staff guide/runbook, staging smoke, `git push github master:main`, blocking client check.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-01 | Assinante publica recado visível para outros assinantes | Pattern 3 (recados collection, owner service, members board, visibility = approved AND author active) |
| REC-02 | Assinante envia mensagem a outro perfil e vê as respostas | Pattern 5 (conversations + messages, start from ad/recado, threads, unread) |
| REC-03 | Assinante bloqueia ou denuncia quem envia mensagem | Pattern 6 (blocks, message-reports, staff resolution, messaging suspension) |
| REC-04 | Recados passam por moderação da equipe | Pattern 4 (Phase 4 moderation shape: service + staff endpoints + UI field + dashboard line + audit) |
| PREV-02 | Visitante vê chamadas de recados, sem contato | Pattern 7 (public `/recados`: weekly count + short redacted snippets, no apelido) |
| PREV-03 | Visitante lê o início de cada conto; o restante só para assinantes | Pattern 1 (excerpt split by top-level blocks), Pattern 2 (separate public and members read models/routes) |
| PREV-04 | Toda prévia tem chamada clara "Assine Já" | Pattern 7 (`AssineJaCta` on /classisex, /recados, /contos, /contos/[slug]) |
| PAINEL-03 | Equipe publica contos e define o trecho aberto | Pattern 1 (contos collection with drafts, `paragrafosAbertos`, admin preview panel), Pattern 8 (import) |

Note: PAINEL-07 ("aprova ou recusa perfis e recados") was closed in Phase 4 for ads; its recados half is delivered by REC-04 here (05-06).

## Project Constraints (from CLAUDE.md / PROJECT.md / STATE.md)

- Open area: no contacts, no explicit nudity; contacts are the value of the subscription. LGPD: subscriber data, messages and who-reports-whom are sensitive; minimise what staff and the public can see.
- Staff operate alone: Portuguese labels/help on every field; named buttons (Aprovar, Recusar, Despublicar, Resolver).
- Pin `@payloadcms/*` 3.91.0. **No new dependency** in this phase (see Package Legitimacy Audit). Read `node_modules/next/dist/docs/` before Next code (AGENTS.md).
- Phase 3/4 conventions: role = `req.user.collection` (`src/access/roles.ts`); members pages and actions guard through the DAL (`requireAssinante`/`requireActiveSubscription`, src/lib/assinantes/session.ts); members reads never cached; public reads cached with tags and DTO out; modules reachable from `payload.config.ts` never import `'server-only'`; staff actions = service + staff-only collection endpoint + admin UI field; nested Local API calls in hooks wrapped in `withRequestState`; migrations via `CI=true PAYLOAD_MIGRATING=true pnpm payload migrate:create <name>`; schema-changing plans run in sequential waves; new gated collections join a leak matrix.
- CSRF: `src/proxy.ts` rejects non-GET requests with a foreign `Origin` (Payload `csrf` allowlist removed in 1ad4546). Server actions also get Next's own Origin check. e2e "subscriber can do X" checks use in-page `fetch`/forms (03-06 finding still valid for header realism).
- The /mnt/project-files mount rewrites committed binaries: before committing run `git checkout -- public src/app tests/fixtures docs/screens`. New fixtures should be text (the SQL fixture is plain `.sql`, gzipped in a temp dir at test time).
- Layouts do not re-run on client navigation (comment in `src/app/(frontend)/(membros)/layout.tsx`): anything per-request in the members menu (unread counter) must not depend on the layout re-rendering.

## Summary

Phase 5 adds three things on top of the Phase 3 entitlement model and reuses most Phase 4 machinery:

1. **Recados** are ClassiSex ads without media or contact fields: owner-written (apelido + up to 500 characters), contacts stripped on save by `redactContacts`, staff-moderated, visible iff approved AND the author's `accessUntil > now` (same computed visibility as `visibleAdsWhere`, so they vanish at São Paulo midnight with no job). The public `/recados` page only shows a weekly count and a few short redacted snippets with no apelido.
2. **Private messages** are new: one conversation per pair of subscribers, messages are plain text, never moderated, never exposed through REST (not even to staff — staff only see what a report snapshots). A conversation can only be started from a visible ad or recado, so the recipient id is always derived on the server (no account enumeration). Block and report live on the thread; staff resolve reports and can suspend a person's messaging.
3. **Contos** are a drafts-enabled staff collection with one rich-text body and a number "parágrafos abertos" (default 3). The public page renders only the first N top-level blocks (always leaving at least one block for subscribers); the full text lives on a separate members route. The 50 WordPress contos are imported by an idempotent script that streams the gzip dump, keeps only the five tables it needs, converts post HTML to Lexical JSON with a small in-house converter (Payload's `convertHTMLToLexical` needs JSDOM, which is not installed), strips bylines/contacts, and never reads `wp26_users`.

Findings that shape the design:

1. **`convertHTMLToLexical` requires a `JSDOM` constructor argument** (`dist/features/converters/htmlToLexical/index.js` calls `new JSDOM(html)`); `jsdom` is not a dependency. Going through markdown (`convertMarkdownToLexical`, already used by the pages seed) would misread story text containing `*`, `_`, `#` or leading digits+dot. Decision: build Lexical JSON directly from a tiny tolerant HTML tokenizer (paragraph/heading/list/text/linebreak nodes; bold=1, italic=2 formats) — the node shape is already pinned by `tests/helpers/seed.ts lexicalParagraph`. No new package.
2. **No MySQL is available** and `mysql2` is not installed; the dump is MariaDB 11.8 `mysqldump` output (gzip). A streaming state machine over `zlib.createGunzip()` that buffers only statements for wanted tables is enough: `CREATE TABLE` gives the column order (default dumps have no column list in `INSERT`), `INSERT INTO \`t\` VALUES (...),(...);` gives rows. It must handle MySQL string escapes (`\0 \' \" \b \n \r \t \Z \\ \% \_`, doubled `''`), `NULL`, numbers, `_binary '...'`, `0x..` hex, comments (`--`, `/* */`, `/*!40101 ...*/;`), and an optional column list (`--complete-insert`). Strings can contain `),(`, `;` and newlines; chunk boundaries can split an escape — tests feed the stream in 7-byte chunks.
3. **WordPress post HTML is not always HTML:** classic-editor posts are stored without `<p>` (WP's `wpautop` adds them at render time): blank line = paragraph, single newline = `<br>`. Gutenberg adds `<!-- wp:... -->` comments; Elementor leaves wrapper `<div class="elementor-...">`, `<section>`, inline styles and shortcodes like `[elementor-template id="12"]`. Elementor "builder" posts keep a plain-HTML copy in `post_content` (the real layout is in `_elementor_data`); the import reads `post_content` only and reports how many contos had `_elementor_edit_mode = builder` so the orchestrator can spot-check them.
4. **Payload `run` loads a script inside the Payload CLI context** (`payload run scripts/import/contos.ts -- …`, argv rewritten), so the Local API can be used with the same env as migrations. The `migrate` Docker image (`COPY . .` minus `.dockerignore`, which excludes `scripts/`, `docs/`, `tests/`) contains `src/` — so any logic a migration needs on the VPS must live under `src/`. The CLI stays in `scripts/import/contos.ts` (developer machine only) and calls `src/lib/contos/import.ts`.
5. **Staging cannot be reached from our environment** (egress proxy, no SSH). Running the script on the real dump therefore produces data in a local database; getting the contos onto staging needs a carrier. Recommended: the CLI `--export` writes a sanitized bundle (title, slug, wpSlug, date, restricted flag, Lexical JSON, paragrafosAbertos — no author data), the orchestrator reviews it and commits it as `src/migrations/seed/contos-wp.json`; a blank migration `contos_wp_bundle` loads that file **if present** (idempotent by `wpId`) when the VPS runs migrations. This commits story text (including the 10 formerly members-only stories) to the private repo — an orchestrator/client decision (Open Question 1). Without the file the migration is a no-op.
6. **Layouts do not re-render on client navigation** in the App Router, so a server-rendered unread counter in `(membros)/layout.tsx` would go stale after reading a thread. The counter is a small client component that fetches `GET /area-do-assinante/mensagens/nao-lidas` (no-store JSON `{ count }`) on mount and on every pathname change.
7. **Phase 4 already exposes the right building blocks:** `redactContacts` + `REDACTED_LABEL` (src/lib/classisex/redact.ts), `apelidoError` (rules.ts), moderation shape (`moderateAd`, `adEndpoints`, `ModeracaoPanel` with form-state sync, `FilaClassisex`), report shape (`ad-reports`, `reportAd`, `resolveReport`, urgent minor reports), `findVisibleAdDoc` (board.ts) to validate "Enviar mensagem" from an ad, `accessStatusFor(payload, id, now)` (status.ts, no 'server-only') for the "recipient must be active" rule, `fetchAs`/`buildClassisexScenario` for leak tests.

**Primary recommendation:** twelve plans. Wave 1 runs the pure import core (dump reader + HTML→Lexical, unit tests only) in parallel with the contos collection; everything after is sequential because it changes the Payload schema, shares layout/test helpers, or runs int/e2e suites on the single paraiso_test database: contos reading pages → import CLI + bundle migration (+ the orchestrator run on the real dump) → recados → recados moderation → public previews + Assine Já → messages data → messages UI + unread → block/report → leak matrix → docs, deploy and client check.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dump reading | `src/lib/contos/wp-dump.ts` (pure streaming parser) | CLI `scripts/import/contos.ts` | Unit-testable on a synthetic fixture; no DB; no MySQL |
| HTML → Lexical | `src/lib/contos/html-to-lexical.ts` (pure) | — | No JSDOM; text-only nodes; nothing executable stored |
| Import records, report, load | `src/lib/contos/import.ts` | migration `contos_wp_bundle` (bundle on VPS) | One loader for CLI and migration; idempotent by `wpId` |
| Contos data | Payload `contos` (drafts; every REST op staff-only) | `TrechoAbertoPanel` UI field | PAINEL-03 in the admin; public never touches REST |
| Excerpt rule | `src/lib/contos/excerpt.ts` (pure: `splitConto`, `plainTextOf`) | public DTO, admin panel, import report | Same split everywhere; panel imports it client-side (pure) |
| Public contos | `/contos`, `/contos/[slug]` cached (tags `contos`, `conto:{slug}`), DTO with open blocks only | `AssineJaCta` | Restricted blocks never reach the public render/RSC |
| Members contos | `/area-do-assinante/contos[/slug]` + `requireActiveSubscription`, never cached | `src/lib/contos/queries.ts` | Phase 3 DAL pattern |
| Recados data | Payload `recados` (REST staff-only) | owner service + server actions | Phase 4 ads pattern |
| Recados visibility | `visibleRecadosWhere(now)` (approved AND `author.accessUntil > now`) | expire tag `recados` on subscription changes | D-01 "some quando vence" with no job |
| Recados moderation | service + staff endpoints `/api/recados/:id/{moderacao,aprovar,recusar,despublicar}` | `RecadoModeracaoPanel`, dashboard line | Phase 4 04-03 shape; audit rows |
| Public recados teaser | `/recados` cached (tag `recados`) | `toPublicRecadoTeaser` (no apelido, redacted, truncated) | D-05 |
| Messages data | `conversations`, `messages` (REST: nobody — `() => false`, admin hidden) | `src/lib/mensagens/service.ts` (Local API, overrideAccess after DAL + participant checks) | Staff do not browse private messages (LGPD) |
| Start conversation | server derives recipient from a visible ad/recado | `iniciarConversa` action | No user-id input → no enumeration |
| Unread counter | `GET /area-do-assinante/mensagens/nao-lidas` (no-store) | `UnreadBadge` client component in members nav | Layouts don't re-render (Finding 6) |
| Block | `blocks` (REST nobody) | `canSend` | D-02 "bloqueado não consegue mais mandar" |
| Message reports | `message-reports` (REST staff-only) with snapshot of the last 20 messages | staff endpoint `/api/message-reports/:id/resolver`, `mensagensSuspensas` on assinantes | Staff see only what was reported |

## Standard Stack

### Core (already installed — no installs in this phase)
| Library | Version | Purpose |
|---------|---------|---------|
| payload / @payloadcms/* | 3.91.0 | collections (drafts on contos), hooks, endpoints, UI fields, `beforeDashboard`, migrations, `payload run` |
| @payloadcms/richtext-lexical | 3.91.0 | `lexicalEditor` features for contos (Paragraph, Heading h2/h3, Bold, Italic, lists), `RichText` React renderer (src/components/RichText.tsx), `convertLexicalToPlaintext` (`/plaintext`) for word counts/meta |
| next | 16.4.2 | server components, server actions (`useActionState`), route handlers, `notFound` |
| node:zlib, node:stream, node:readline (built-in) | Node 22 | streaming gunzip and parsing of the dump |
| vitest 5.0.5 / @playwright/test 1.64.1 | — | unit/int/e2e |

### Supporting (no package)
| Need | Use | Why |
|------|-----|-----|
| MySQL dump parsing | `wp-dump.ts` state machine | No `mysql2`, no MySQL server; read-only, a handful of tables |
| HTML → Lexical | `html-to-lexical.ts` | No JSDOM; WP/Elementor HTML is shallow; markdown path mangles story text |
| HTML entities | small table (`&nbsp; &amp; &lt; &gt; &quot; &#39; &hellip; &ndash; &mdash; &laquo; &raquo; &ldquo; &rdquo; &lsquo; &rsquo;`) + numeric `&#NNN;`/`&#xHH;` | WP content uses few named entities |
| Contact stripping | `redactContacts` (Phase 4) | Same rule for recados (D-01), public snippets and imported contos |
| Validation | hand-written rules modules | zod not installed (Phase 3 decision) |

## Package Legitimacy Audit

No new packages are introduced in Phase 5. `jsdom` (for Payload's `convertHTMLToLexical`) and `mysql2` were considered and rejected (Findings 1–2). No package-manager install tasks exist in the plans.

## Architecture Patterns

### System Architecture Diagram

```
Visitor
  ├─ /contos (cached 'contos')            ─► ContoCardDTO: title, date, chamada (plain text of the open part ≤ 200)
  ├─ /contos/[slug] (cached 'conto:{slug}')─► PublicContoDTO: title, date, open blocks only ─► <RichText> + AssineJaCta
  │                                          "Já é assinante? Ler o conto completo" ─► /area-do-assinante/contos/[slug]
  ├─ /recados (cached 'recados')          ─► { semana: N, trechos: [≤ 80 chars, redacted, no apelido] } + AssineJaCta
  └─ /classisex (Phase 4)                 ─► + AssineJaCta (PREV-04)
Subscriber (cookie payload-token, collection 'assinantes')
  ├─ /area-do-assinante/contos[/slug]     requireActiveSubscription ─► full Lexical (never cached)
  ├─ /area-do-assinante/recados           requireActiveSubscription ─► board (visible recados, 20/page)
  │     ├─ form "Novo recado" ─► publicarRecado ─► service: apelido rule, 500 chars, redactContacts, ≤ 3 active ─► 'pendente'
  │     ├─ "Seus recados" (status, motivo, Apagar — also when inactive, LGPD)
  │     └─ card "Enviar mensagem" ─► /area-do-assinante/mensagens/nova?recado={id}
  ├─ /area-do-assinante/classisex/[id]    + "Enviar mensagem" ─► /mensagens/nova?anuncio={id}
  ├─ /area-do-assinante/mensagens         inbox (other apelido, assunto, last snippet, "nova")
  │     ├─ nova?anuncio|recado ─► iniciarConversa ─► recipient from visible ad/recado; find-or-create pair; first message
  │     ├─ [id] ─► participant check ─► last 50 messages; markRead; responder; Bloquear/Desbloquear; Denunciar
  │     └─ nao-lidas (GET JSON, no-store) ◄─ UnreadBadge (client) on mount + pathname change
  └─ canSend: sender active · recipient active · no block either way · sender not suspended · daily limits
Staff (/admin, collection 'users')
  ├─ Dashboard: ClassiSex line (Phase 4) + "Recados: N para aprovar" + "Mensagens: N denúncias abertas · M urgentes"
  ├─ Recados: RecadoModeracaoPanel ─► POST /api/recados/:id/aprovar|recusar|despublicar ─► audit, expire(['recados'])
  ├─ Denúncias de mensagens: MensagemDenunciaPanel (snapshot) ─► POST /api/message-reports/:id/resolver {acao, nota}
  └─ Contos: edit Lexical text, "Parágrafos abertos", TrechoAbertoPanel preview, Publicar/Despublicar (drafts)
REST: /api/contos, /api/recados, /api/message-reports ─► staff only ; /api/conversations, /api/messages, /api/blocks ─► nobody
Import (developer machine / orchestrator): WP_DUMP_PATH (.sql.gz) ─► wp-dump ─► extractContos ─► html-to-lexical
   ─► buildImportRecords (byline + contacts stripped, report) ─► --dry-run | --export bundle.json | Local API create (idempotent)
   bundle committed as src/migrations/seed/contos-wp.json (decision) ─► migration contos_wp_bundle on the VPS
```

### Recommended Project Structure (new/changed)
```
src/
  collections/Contos.ts            # slug 'contos' (drafts; REST staff-only; TrechoAbertoPanel UI field)
  collections/Recados.ts           # slug 'recados' (REST staff-only; endpoints moderacao/aprovar/recusar/despublicar)
  collections/Conversations.ts     # slug 'conversations' (REST: nobody; admin hidden)
  collections/Messages.ts          # slug 'messages' (REST: nobody; admin hidden)
  collections/Blocks.ts            # slug 'blocks' (REST: nobody; admin hidden)
  collections/MessageReports.ts    # slug 'message-reports' (REST staff-only; endpoint resolver)
  collections/Assinantes.ts        # + apelido (≤ 40), + mensagensSuspensas (staff-only), cascades
  lib/contos/{wp-dump,html-to-lexical,excerpt,import,dto,public,queries,revalidate}.ts
  lib/recados/{rules,visibility,service,dto,board,public,queries,actions,endpoints}.ts
  lib/mensagens/{rules,service,dto,queries,actions,endpoints}.ts
  components/contos/{ContoCard,AssineJaCta}.tsx ; components/recados/{RecadoForm,RecadoCard,OwnRecadoCard}.tsx
  components/mensagens/{InboxList,ThreadView,MessageForm,UnreadBadge,BlockReportPanel}.tsx
  components/admin/contos/TrechoAbertoPanel.tsx ; components/admin/recados/RecadoModeracaoPanel.tsx
  components/admin/mensagens/MensagemDenunciaPanel.tsx ; components/admin/FilaModeracao lines (extend FilaClassisex)
  app/(frontend)/contos/page.tsx, contos/[slug]/page.tsx, recados/page.tsx
  app/(frontend)/(membros)/area-do-assinante/{contos,contos/[slug],recados,mensagens,mensagens/nova,mensagens/[id]}/page.tsx
  app/(frontend)/(membros)/area-do-assinante/mensagens/nao-lidas/route.ts
  migrations/…_contos.ts, …_contos_wp_bundle.ts (blank), …_recados.ts, …_recados_moderation.ts, …_mensagens.ts, …_mensagens_seguranca.ts
scripts/import/contos.ts           # CLI (dev machine only; scripts/ is not in the Docker image)
tests/fixtures/wp-contos-mini.sql  # synthetic, plain text (gzipped in a temp dir by tests)
```

### Pattern 1: Contos and the open excerpt (PREV-03, PAINEL-03, D-03)
- `contos` fields: `title` (required, ≤ 160, 'Título'), `slug` (required, unique, index, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, ≤ 200; default from title on create), `publishedAt` (date, required, 'Data de publicação', `dd/MM/yyyy`), `texto` (richText: Paragraph, Heading h2/h3, Bold, Italic, Unordered/Ordered list — no links, images or uploads), `paragrafosAbertos` (number, default 3, min 1, max 20, 'Parágrafos abertos', description 'Quantos parágrafos do início qualquer visitante lê. O resto é só para assinantes.'), `trechoAberto` UI field (TrechoAbertoPanel), sidebar read-only `wpId` (number, unique, index — import key), `wpSlug` (text — the WordPress `post_name`, for Phase 6 redirects `/{wpSlug}/` → `/contos/{slug}`), `wpRestrito` (checkbox, 'No site antigo era só para assinantes'), `importadoEm` (date). `versions: { drafts: true, maxPerDoc: 20 }`; access read/create/update/delete `isStaff` (T-05-01: no public REST — public pages read through server DTOs); hooks `afterChange`/`afterDelete` expire `['contos', 'conto:{slug}']` (and the previous slug).
- `splitConto(state, n)`: top-level blocks = `root.children`. If blocks ≥ 2: open = first `min(n, blocks − 1)` blocks (always ≥ 1, always leaves ≥ 1 for subscribers). If blocks = 1: open = one paragraph with the first 60 words of that block + "…", restricted = the full text (members page shows the whole text anyway). Returns `{ open: LexicalState, openBlocks, totalBlocks, openWords, totalWords }`.
- Public DTO carries only the `open` state; the members DTO carries the full `texto`. Public metadata description = first 155 characters of `plainTextOf(open)`. `chamada` for cards = first 200 characters of the open plain text (word boundary + "…").

### Pattern 2: Two read models, two routes for contos
Same as ClassiSex 04-07: the public page never imports the members read model. `/contos/[slug]` is cached (`cached(fn, ['contos:one'], (slug) => ['contos', 'conto:'+slug])` — follow `src/lib/pages/queries.ts`/parties), published only (`_status = 'published'`, `draft: false`). `/area-do-assinante/contos/[slug]` is `force-dynamic`, `requireActiveSubscription`, inactive → `InactivePanel` only, never cached, `robots: noindex`. Leak sentinel tests (05-03, 05-11): a restricted-block sentence must not appear in the public HTML, the RSC payload (`RSC: 1` request), metadata, or `/api/contos*` for anonymous/subscriber callers.

### Pattern 3: Recados (REC-01, D-01)
- `assinantes.apelido` (optional, ≤ 40, validated with Phase 4 `apelidoError`; 'Apelido nos recados e mensagens'; subscribers set it from the recado/compose forms — never their real name by default).
- `recados` fields: `author` (rel assinantes, required, index, readOnly), `apelido` (snapshot ≤ 40, required — what staff approve is what members see), `texto` (textarea, required, ≤ 500; stored ALREADY redacted), `contatosRemovidos` (number, readOnly — shows the owner/staff that something was removed), `status` (pendente | aprovado | recusado | despublicado; default pendente; read-only in the admin after 05-06), `motivo` (≤ 300), `submittedAt`, `publishedAt`, `moderatedAt`, `moderatedBy` (rel users), `resumo` (useAsTitle 'Apelido — first 60 chars').
- Rules (`src/lib/recados/rules.ts`): `RECADO_MAX = 500`, `RECADO_ACTIVE_LIMIT = 3` (pendente + aprovado), messages in pt: 'Escreva o recado.', 'O recado pode ter até 500 caracteres.', 'Você já tem 3 recados ativos. Apague um para publicar outro.', apelido messages from Phase 4. Redaction is applied on the server to the trimmed text; if the result is only the redaction label(s) → 'Escreva um recado além do contato. Para trocar contato, use Enviar mensagem.'
- Owner: publish needs active access; list and delete own recados need only a login (LGPD). No edit: delete and post again (each post is moderated anyway).
- Visibility: `visibleRecadosWhere(now) = { and: [{ status: { equals: 'aprovado' } }, { 'author.accessUntil': { greater_than: now.toISOString() } }] }` (A1 of Phase 4 confirmed the nested where). Board: sort `-publishedAt`, 20/page, DTO `{ id, apelido, texto, publishedLabel, isOwn }` — no author id.
- Cache tag `recados` (public teaser) expired by recado writes/moderation and by the existing subscription/accessUntil hooks (add `'recados'` next to `'ads'` in Subscriptions.ts and Assinantes.ts `expireAdsOnAccessChange`).

### Pattern 4: Recados moderation (REC-04)
Copy 04-03: `moderateRecado(req, id, action, motivo, now)` with transitions aprovar from pendente/recusado/despublicado; recusar from pendente; despublicar from aprovado/pendente; wrong state → 409 'Este recado já está …'; motivo required for recusar/despublicar (≤ 300). Staff-only endpoints on `recados` (`GET /:id/moderacao`, `POST /:id/aprovar|recusar|despublicar`), audit actions `recado-aprovado`, `recado-recusado`, `recado-despublicado` (select enum → migration), `RecadoModeracaoPanel` (UI field; shows the text exactly as members see it and how many contacts were removed; syncs form state after an action like ModeracaoPanel), dashboard line "Recados: N para aprovar" linking to `/admin/collections/recados?where[status][equals]=pendente&sort=submittedAt`.

### Pattern 5: Conversations and messages (REC-02, D-02, D-04)
- `conversations`: `participantA`, `participantB` (rel assinantes, required, index; A = lower id), `pairKey` (text, unique: `${low}-${high}`), `apelidoA`, `apelidoB` (snapshots ≤ 40), `assunto` (≤ 120: 'Anúncio: {apelido} · {tipo}' or 'Recado: {first 40 chars}…'), `lastMessageAt` (index), `lastSender` (rel assinantes), `lastReadA`, `lastReadB` (date). `messages`: `conversation` (rel, required, index), `sender` (rel assinantes, required, index), `texto` (textarea, required, ≤ 2000). Both: access `() => false` for every operation, `admin.hidden: true` (T-05-09); all writes/reads through `src/lib/mensagens/service.ts` with `overrideAccess: true` after the DAL and participant checks.
- Start: `/area-do-assinante/mensagens/nova?anuncio={id}` or `?recado={id}`. The service resolves the recipient from a **visible** ad (`findVisibleAdDoc`) or recado; own → message 'Este anúncio é seu.'/'Este recado é seu.'; existing pair → redirect to that thread (assunto kept); else compose form. Sender apelido snapshot = account apelido (required; the compose form asks once and saves it to the account); recipient apelido snapshot = the ad's or recado's apelido.
- `canSend(payload, { senderId, recipientId, now })` → `null | errorCode`: sender active, recipient active (`accessStatusFor`), (05-10) no block either way, sender not suspended; limits: ≤ 20 new conversations and ≤ 200 messages per sender per São Paulo day (`spDate`). Messages: trimmed, 1–2000 chars, no redaction (contact exchange is the point, D-02).
- Thread: newest 50 shown oldest→newest, "Ver mensagens anteriores" (`?antes={messageId}`); opening the thread sets `lastReadX = now` (service; GET side effect accepted, it only touches the viewer's own read marker).
- Unread: `countUnread(payload, me)` = count of `messages` with `sender != me` in my conversations newer than my `lastReadX` (pre-filter conversations where `lastMessageAt > lastReadX` and `lastSender != me`, then one `count` with an `or` of per-conversation clauses); shown as "Mensagens (N)", capped at "99+".
- Inactive subscribers: inbox/thread render `InactivePanel` only (T-05-06); the unread route answers `{ count: 0 }` for inactive and 401 for anonymous; both `Cache-Control: private, no-store`.

### Pattern 6: Block, report, suspension (REC-03)
- `blocks`: `blocker`, `blocked` (rel assinantes, required, index), `pairKey` unique `${blocker}-${blocked}`; access nobody, admin hidden. If A blocked B: B cannot send to A ('Não é possível enviar mensagens para esta pessoa.' — neutral, does not say "bloqueado"), A cannot send to B until unblocking ('Você bloqueou esta pessoa. Desbloqueie para voltar a conversar.'), neither can start a new conversation with the other. Thread UI shows "Bloquear" / "Desbloquear".
- `message-reports`: `conversation` (rel, optional), `reported` and `reporter` (rel assinantes, optional — set null on account deletion), `reportedApelido` (snapshot), `motivo` select (`assedio` 'Assédio ou insistência', `golpe-ou-cobranca` 'Golpe ou cobrança', `ofensivo` 'Ofensa ou ameaça', `menor-de-idade` 'Pessoa menor de idade', `spam` 'Propaganda ou spam', `outro` 'Outro'), `detalhes` (≤ 500), `mensagens` (textarea, readOnly — snapshot of the last 20 messages of the conversation: 'Apelido · dd/MM HH:mm: texto'), `urgente` (computed: motivo = menor-de-idade), `status` (aberta | resolvida | descartada), `resolvidaPor`, `resolvidaEm`, `nota`. REST staff-only. One open report per reporter+conversation; 10 reports per reporter per day (reuse `DAILY_LIMIT`). The report form has "Também bloquear esta pessoa" checked by default.
- Staff: `POST /api/message-reports/:id/resolver { acao: 'descartar' | 'resolver' | 'suspender', nota }` — `suspender` sets `assinantes.mensagensSuspensas = true` (staff-only field; suspended people cannot send; 'Seu envio de mensagens foi suspenso pela equipe. Fale com a casa pelo WhatsApp.'), resolves every open report against that person, writes audit `mensagens-suspensas`; every resolution writes `denuncia-mensagem-resolvida`. Staff lift a suspension by unticking the field on the account (already audited by the Assinantes diff hook). Dashboard line "Mensagens: N denúncias abertas · M urgentes".

### Pattern 7: Public previews and Assine Já (PREV-02, PREV-04, D-05)
- `/recados`: H1 'Recados', intro 'Assinantes deixam recados para se conhecer e conversam por mensagem privada. Aqui você vê só um trecho, sem apelido e sem contato.', line 'N recados novos esta semana' (visible recados with `publishedAt ≥ now − 7 days`; 0 → 'Novos recados toda semana.'), up to 6 latest teasers: `toPublicRecadoTeaser(texto)` = `redactContacts(texto).text` → remove the label and any `@token` → collapse spaces → cut at 80 characters on a word boundary + '…'. No apelido, no date more precise than 'esta semana' / 'há mais de uma semana', no id in markup. Cached tag `recados`.
- `AssineJaCta` (server component): heading + one sentence per context + primary link 'Assine Já' → `/assine-ja` + secondary 'Já sou assinante' → members URL. Used on `/classisex` (page level, keeps the per-card "Assine para ver"), `/recados`, `/contos`, `/contos/[slug]` (after the excerpt: 'Continue lendo: o restante deste conto é só para assinantes.'). e2e asserts every preview page has a link with accessible name 'Assine Já' pointing to `/assine-ja`.
- Nav (src/lib/site/nav.ts) and footer: Festas · Quem somos · Espaço · (Modelos) · ClassiSex · Recados · Contos · Contato · Assine Já · Área do assinante. Sitemap: `/recados`, `/contos`, `/contos/{slug}` (published). Members sub-nav: Minha assinatura · ClassiSex · Recados · Mensagens (N) · Contos · Meus anúncios · Trocar senha · Sair.

### Pattern 8: Import of the WordPress contos (D-03)
- `readWpTables(source, { prefix = 'wp26_', tables })`: source = path (gzip detected by magic bytes `1f 8b`; plain `.sql` accepted for tests) or a Readable; returns `{ [table]: Record<string, string | number | null>[] }` for requested tables only; statements for other tables are skipped without buffering. Required tables: `posts`, `terms`, `term_taxonomy`, `term_relationships`, `postmeta` (postmeta rows filtered while parsing to `meta_key IN ('_members_access_role', '_elementor_edit_mode')` to keep memory small). `users`/`usermeta`/`comments` are never requested (T-05-14).
- `extractContos(tables, { categorySlug = 'contos' })` → `WpConto[] = { wpId, wpSlug, title, html, publishedAt, restricted, builder }`: `post_type = 'post'`, `post_status = 'publish'`, related to a term with `taxonomy = 'category'` and slug `contos`; `publishedAt` from `post_date_gmt` (`0000-00-00 00:00:00` → `post_date` read as São Paulo local time); `restricted` = any `_members_access_role` row; `builder` = `_elementor_edit_mode = 'builder'`; title HTML entities decoded. `post_author` is never copied.
- `htmlToLexical(html)`: pre-clean (comments, shortcodes `[name …]…[/name]` and `[name …]`, `<script|style|iframe|noscript|form|button|svg|figure|img|video|audio>` dropped with content, other tags unwrapped), decode entities, apply wpautop semantics when the content has no block tags, map blocks (p/div leaf → paragraph; h1/h2 → heading h2; h3–h6 → heading h3; ul/ol → list/listitem; blockquote → paragraph; br → linebreak; strong/b → format 1; em/i → format 2; a → its text only), collapse whitespace, drop empty blocks.
- `buildImportRecords(wpContos)` → `{ records: ContoRecord[], report }`: drop a trailing byline block (≤ 12 words, starting with 'Por ', 'Autor', 'Autora', 'Enviado por', 'Escrito por', or '— Nome') → flag `assinatura-removida`; apply `redactContacts` to every text node → flag `contatos-removidos:N`; slug = `slugify(decodeURIComponent(wpSlug))` with `-2`, `-3` on collisions → flag `slug-alterado`; `paragrafosAbertos = 3`; flags `curto` (open part < 60 words), `aberto-demais` (open part > 40% of words), `sem-paragrafos` (1 block), `shortcode-restante`, `builder`; `vazio` (0 words) → skipped. The report prints counts and slug + words + flags only — never story text (T-05-15).
- `importContos(payload, records, { req? })`: for each record, skip if a conto with the same `wpId` exists (report 'já existia'); if the slug is taken by a different conto, use the next free suffix; create `_status: 'published'`, `importadoEm: now`. Running twice creates nothing the second time. Staff edits are never overwritten.
- CLI `scripts/import/contos.ts` (run with `pnpm import:contos -- [--dry-run] [--export <file>] [--from-bundle <file>]`): reads `WP_DUMP_PATH` (required unless `--from-bundle`), `WP_TABLE_PREFIX` (default `wp26_`), refuses an export path inside the repo unless it is `src/migrations/seed/contos-wp.json`, prints the report, exits non-zero when the dump has no Contos category.
- Bundle `{ version: 1, generatedAt, contos: ContoRecord[] }`; migration `contos_wp_bundle` (blank schema; `migrate:create … --force-accept-warning`) loads `src/migrations/seed/contos-wp.json` when the file exists; `down` is a no-op (never deletes content).

### Anti-Patterns to Avoid
- Public REST read on `contos` with field-level hiding (one mistake exposes the whole text); a single URL that serves both excerpt and full text (cache + RSC leak risk).
- Splitting the excerpt in a client component (the full text would be in the RSC payload).
- Accepting a recipient user id from the browser; returning author ids in DTOs.
- Giving staff a REST/admin window on private messages; storing message text in audit rows.
- Rendering the unread count in the layout only (stale after navigation).
- Printing story text, titles of restricted contos with author names, or anything from `wp26_users` in logs; committing the dump or a raw extract; reading the dump in tests.
- `convertMarkdownToLexical` for story text; `dangerouslySetInnerHTML` for imported HTML.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich-text rendering | custom renderer | `src/components/RichText.tsx` (Lexical React, safe links) | Already used by pages and parties |
| Plain text from Lexical | ad-hoc walkers for metadata | `convertLexicalToPlaintext` (`@payloadcms/richtext-lexical/plaintext`) or `plainTextOf` in excerpt.ts (pure, also needed in the client panel) | One helper per context |
| Contact stripping | new regexes | `redactContacts`, `apelidoError` (Phase 4) | Tested table, same behaviour site-wide |
| Moderation/reports plumbing | new admin views | 04-03/04-08 shape (service + endpoints + UI field + dashboard) | Proven, audited |
| Auth in route handlers | cookie parsing | `payload.auth({ headers })` | Same session rules |
| Entitlement | flags/jobs | `accessStatusFor` / `author.accessUntil` | Phase 3 single source |

## Common Pitfalls

### Pitfall 1: Restricted conto text reaching the public response
Even a client component that receives the full text and hides part leaks it in the RSC payload. Only the open blocks are passed to the public page; `generateMetadata` uses the open text. Test with a sentinel sentence in a restricted block (HTML, RSC, `/api/contos`, `/api/contos?draft=true`, `/api/contos/versions`).
### Pitfall 2: Staff-only REST on a drafts collection
Payload's version endpoints (`/api/contos/versions`, `/api/contos/versions/:id`) use `readVersions` access (defaults to `read`); set `readVersions: isStaff` explicitly and test.
### Pitfall 3: Excerpt that equals the whole conto
Short contos (or wpautop failures that yield 1 block) would be fully open. `splitConto` always leaves ≥ 1 block for subscribers and truncates single-block texts; the import report flags `sem-paragrafos`, `aberto-demais`.
### Pitfall 4: Dump parsing on chunk boundaries
An escape (`\'`) or a string containing `),(`/`;` split across gunzip chunks breaks naive parsers. Feed the fixture in 7-byte chunks in unit tests.
### Pitfall 5: Mojibake
Old WP tables can be `latin1` holding UTF-8 bytes; the dump's `SET NAMES utf8mb4` plus the table charset decide. Decode the gunzip stream as UTF-8; the report counts titles containing `Ã` or `â€` (`mojibake`) so the orchestrator notices; fix (re-decode latin1→utf8) only if the flag fires.
### Pitfall 6: Personal data inside story text
Bylines and contacts written inside stories. The importer strips trailing bylines and redacts contacts; the orchestrator reviews flagged slugs before committing a bundle.
### Pitfall 7: Unread counter staleness
See Finding 6; e2e: open a thread then navigate to another members page — the badge is gone without a reload.
### Pitfall 8: Conversation IDOR
Every thread read/write checks the principal is participant A or B (else `notFound()`); the reply action takes only the conversation id and text; tests with a third subscriber.
### Pitfall 9: Block bypass through a new conversation
The pair has one conversation (`pairKey` unique); `canSend` checks blocks on every send and on start, from both directions.
### Pitfall 10: Migrations and enums
New audit actions are select options (Postgres enum) → migration. Every schema plan runs alone in its wave. The blank `contos_wp_bundle` migration must still be registered in `src/migrations/index.ts`.
### Pitfall 11: Test isolation
`RESET_ORDER` gains (front first) `message-reports`, `blocks`, `messages`, `conversations`, `recados`, `contos`; global setup unchanged otherwise.

## Code Examples
Shapes only (the executor writes the code):
- Lexical node shapes (match `tests/helpers/seed.ts lexicalParagraph`): text `{ type: 'text', text, format, detail: 0, mode: 'normal', style: '', version: 1 }`; linebreak `{ type: 'linebreak', version: 1 }`; paragraph `{ type: 'paragraph', children, direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, textStyle: '' }`; heading `{ type: 'heading', tag: 'h2' | 'h3', children, direction: 'ltr', format: '', indent: 0, version: 1 }`; list `{ type: 'list', listType: 'bullet' | 'number', tag: 'ul' | 'ol', start: 1, children: [listitem], direction: 'ltr', format: '', indent: 0, version: 1 }`; listitem `{ type: 'listitem', value: n, children, direction: 'ltr', format: '', indent: 0, version: 1 }`; root `{ root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 } }`.
- Streaming gunzip: `fs.createReadStream(p).pipe(zlib.createGunzip())`, `setEncoding('utf8')` on the output (StringDecoder handles split multi-byte characters).
- Script entry: `pnpm payload run scripts/import/contos.ts -- --dry-run`; inside, `const payload = await getPayload({ config })` only when writing.

## State of the Art
- Payload 3.91 `convertHTMLToLexical({ editorConfig, html, JSDOM })` — JSDOM injected by the caller.
- Payload 3.91 CLI `run` imports the script after rewriting `process.argv`; `migrate:create --force-accept-warning` writes a blank migration.
- Next 16 App Router: layouts persist across client navigation; route handler `params` is a Promise.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The real dump is standard MariaDB `mysqldump` (CREATE TABLE + extended INSERT, utf8mb4) | Pattern 8 | Parser also accepts column lists and per-row INSERTs; the orchestrator's dry run reveals format issues before any write |
| A2 | Contos `post_content` holds usable HTML even for Elementor-edited posts | Finding 3 | Report flags `builder` and `vazio`; fallback (only if needed): extract text widgets from `_elementor_data` JSON in a follow-up |
| A3 | `payload run` loads `.env` like the other CLI commands | Pattern 8 | Pass `DATABASE_URI`/`PAYLOAD_SECRET` explicitly in the documented command |
| A4 | `readVersions: isStaff` closes `/api/contos/versions` for non-staff | Pitfall 2 | Leak test fails → add `versions` access via collection `access.readVersions` and re-test |
| A5 | Lexical JSON built by hand is accepted by the richText field and renders with `RichText` | Pattern 8 | Int test saves an imported record and renders plain text; fallback: run each record through `editorConfigFactory` + headless editor parse in the loader |
| A6 | A pair-level conversation (one per two people) matches "conversa em fio" | Pattern 5 | Per-origin threads would need `origin` in the unique key; UI unchanged |
| A7 | Committing the reviewed bundle to the private repo is acceptable | Finding 5 | Orchestrator chooses another carrier (Open Question 1); migration stays a no-op |

## Open Questions

1. **Carrier for the contos to staging:** commit the reviewed bundle as `src/migrations/seed/contos-wp.json` (recommended; the VPS imports on deploy) or keep story text out of git and run the loader on the VPS another way (needs the client's terminal and a copy of the bundle on the server). Decide in 05-04 Task 3.
2. **The 40 contos that were fully open on WordPress** now become partial (D-03 says every conto has an open excerpt and the rest for subscribers). Fine for the business goal; SEO loses full-text pages. Client may later raise `paragrafosAbertos` for some.
3. **Recados limits/lifetime:** planned 3 active per person, no expiry other than the subscription. Should recados expire after N days?
4. **Account apelido:** planned one optional apelido on the account used by recados and messages (ads keep their own per-ad apelido). OK?
5. **Urgent message reports (minor):** planned = flagged urgent in the queue, no automatic action (unlike ads, which auto-hide). Should a "menor de idade" report suspend the reported person's messaging immediately?
6. **Covers/images of contos:** WP had featured images (uploads not shared). Planned text-only contos. Add a cover later?
7. **`/recados` and contos in the sitemap:** planned yes (same as `/classisex`).

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Postgres `paraiso_test` | int/e2e | yes (`pg_ctl -D /home/claude/pgdata start` if stopped) | — |
| Chromium for Playwright | e2e | /opt/pw-browsers via `PW_CHROMIUM_PATH` | — |
| WordPress dump | 05-04 Task 3 only | orchestrator-side at /mnt/project-files/private (planner/executors never read it) | — |
| MySQL/MariaDB | — | no, not needed | streaming parser |
| Staging host / SSH | final check | NO (egress proxy) | bundle migration + client check on a phone |

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
| PAINEL-03, D-03 | dump reader, HTML→Lexical | unit (TDD) | `pnpm exec vitest run tests/unit/wp-dump.test.ts tests/unit/html-to-lexical.test.ts` | ❌ (05-01) |
| PREV-03, PAINEL-03 | split rule; contos staff-only REST; admin panel | unit + int + e2e | `vitest run tests/unit/conto-excerpt.test.ts tests/int/contos.int.test.ts`, `playwright test tests/e2e/painel-contos.spec.ts --project=desktop` | ❌ (05-02) |
| PREV-03, PREV-04 | public excerpt pages, members full text, sentinel | unit + e2e | `vitest run tests/unit/conto-dto.test.ts`, `playwright test tests/e2e/contos.spec.ts` | ❌ (05-03) |
| PAINEL-03, D-03 | import records/report/idempotent load, CLI, bundle migration | unit + int | `vitest run tests/unit/contos-import.test.ts tests/int/contos-import.int.test.ts` | ❌ (05-04) |
| REC-01, D-01 | recado rules, redaction, limit, visibility, board | unit + int + e2e | `vitest run tests/unit/recado-rules.test.ts tests/int/recados.int.test.ts`, `playwright test tests/e2e/recados.spec.ts` | ❌ (05-05) |
| REC-04 | moderation endpoints/audit/panel | int + e2e | `vitest run tests/int/recados-moderation.int.test.ts`, `playwright test tests/e2e/moderacao-recados.spec.ts --project=desktop` | ❌ (05-06) |
| PREV-02, PREV-04 | teaser DTO, /recados, Assine Já on every preview | unit + e2e | `vitest run tests/unit/recado-teaser.test.ts`, `playwright test tests/e2e/previas.spec.ts` | ❌ (05-07) |
| REC-02, D-02 | canSend, start/reply, participant check, unread count | unit + int | `vitest run tests/unit/mensagens-rules.test.ts tests/int/mensagens.int.test.ts` | ❌ (05-08) |
| REC-02, D-04 | inbox/thread/compose, buttons, badge | e2e | `playwright test tests/e2e/mensagens.spec.ts` | ❌ (05-09) |
| REC-03 | block both ways, report snapshot, resolve/suspend | int + e2e | `vitest run tests/int/mensagens-seguranca.int.test.ts`, `playwright test tests/e2e/bloqueio-denuncia.spec.ts` | ❌ (05-10) |
| all | phase leak matrix | e2e | `playwright test tests/e2e/fase5-seguranca.spec.ts` | ❌ (05-11) |

### Sampling Rate
- Per task commit: `pnpm exec vitest run tests/unit` + the task's own int/e2e file
- Per wave merge: `pnpm test`
- Phase gate: full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None separate (Phase 2–4 convention: each task writes its failing tests first). Helpers grow per slice: 05-01 `tests/fixtures/wp-contos-mini.sql` + `tests/helpers/wp-dump-fixture.ts` (gzip to temp, chunked stream); 05-02 `seedConto` + RESET_ORDER `contos`; 05-05 `seedRecado`, `seedVisibleRecado`, staff REST `createRecado`/`setRecadoStatus`; 05-06 `aprovarRecado`/`recusarRecado`; 05-08 `seedConversation`, `seedMessage`; 05-10 `seedBlock`, `resolverDenunciaMensagem`; 05-11 `buildFase5Scenario`.

## Security Domain

### Applicable ASVS Categories (L1)
| Category | Applies | Control |
|----------|---------|---------|
| V4 Access control | yes | staff-only or closed REST on every new collection; participant checks; entitlement per request; recipient derived server-side |
| V5 Validation | yes | lengths, apelido rule, redaction, rate limits, select reasons; dump parser bounded to wanted tables |
| V8 Data protection | yes | public DTOs without restricted text/apelido/contacts; no staff window on messages; private no-store headers; noindex |
| V7 Logging | yes | moderation, report resolutions and suspensions in `audit-log` (never message text beyond the report snapshot) |
| V13 API | yes | REST matrix in the leak tests; GraphQL already disabled |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Restricted conto text in public HTML/RSC/REST | I | open-blocks-only DTO, separate members route, staff-only REST incl. versions, sentinel tests |
| Recados/messages read by anonymous/expired | I | `requireActiveSubscription` on pages/actions/route; REST closed; leak matrix |
| Contacts in recados or public teasers | I | redact on save + teaser re-redaction and truncation, no apelido |
| Self-approval / REST writes by subscribers | E/T | REST staff-only; status never read from forms |
| Thread IDOR / account enumeration | I/S | participant check; recipient from visible ad/recado only |
| Blocked or suspended user keeps sending | E | `canSend` on start and every send |
| Message spam | D | 20 new conversations/day, 200 messages/day, 10 reports/day |
| Staff browsing private messages | I (LGPD) | collections closed to REST and hidden; only report snapshots |
| Author personal data from WordPress | I (LGPD) | users tables never read; bylines stripped; contacts redacted; report review before commit |
| Real dump leaking to git/logs | I | path outside repo; aggregate-only report; synthetic fixtures; `.gitignore` `/private/` |
| Imported HTML executing | T | text-only Lexical nodes; `RichText` safe links; no raw HTML stored |
| Unaccountable moderation | R | audit rows with actor |

## Sources

### Primary (HIGH confidence)
- `node_modules` 3.91.0 in /home/claude/paraiso-site: `@payloadcms/richtext-lexical/dist/features/converters/htmlToLexical/index.{d.ts,js}` (JSDOM parameter), `dist/exports/plaintext/index.d.ts`, `package.json` exports; `payload/dist/bin/index.js` (`run`); `@payloadcms/drizzle/dist/utilities/buildCreateMigration.js` (`forceAcceptWarning`, `skipEmpty`).
- Repository HEAD 42eb9d3: src/payload.config.ts, src/proxy.ts, src/access/roles.ts, src/collections/{Pages,AdReports,Assinantes}.ts, src/lib/assinantes/{session,status,audit}.ts, src/lib/classisex/{visibility,endpoints,…}.ts (exports), src/migrations/seed/markdown-to-lexical.ts, src/components/RichText.tsx, src/app/(frontend)/(membros)/layout.tsx and classisex/[id]/page.tsx, src/lib/site/nav.ts, src/lib/seo/sitemap.ts, Dockerfile, .dockerignore, tests/helpers/seed.ts, vitest/playwright configs.
- Phase 4 summaries 04-03..04-10 and quick tasks 2026-10-20 (apelido, public preview shape, Origin guard).
- docs/discovery/WORDPRESS.md (aggregates only: prefix `wp26_`, MariaDB 11.8, 50 contos / 10 restricted via `_members_access_role`, posts at `/{slug}/`, Elementor 3.29).

### Secondary (MEDIUM confidence)
- MySQL dump string escaping and WordPress `wpautop` semantics — training knowledge; pinned by unit tests on the synthetic fixture.

## Metadata
**Confidence breakdown:** access model and patterns HIGH; Lexical/Payload API facts HIGH; real-dump specifics MEDIUM (verified only by the orchestrator's dry run).
**Research date:** 2026-10-20 · **Valid until:** 2026-11-20
