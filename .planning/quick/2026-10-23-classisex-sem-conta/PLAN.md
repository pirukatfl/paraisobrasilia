---
phase: quick-2026-10-23-classisex-sem-conta
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [Q-01, Q-02, Q-03, Q-04, Q-05, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11, S-12, S-13]
files_modified:
  - src/collections/AdMedia.ts
  - src/lib/classisex/blur.ts (deleted)
  - src/app/(frontend)/classisex/previa/[id]/route.ts
  - src/lib/classisex/dto.ts
  - src/lib/classisex/board.ts
  - src/components/classisex/PublicAdCard.tsx
  - src/components/classisex/PublicBoard.tsx
  - src/components/classisex/InactivePanel.tsx
  - src/components/classisex/AdMediaPicker.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/classisex/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/novo/page.tsx
  - src/collections/Ads.ts
  - src/migrations/<timestamp>_classisex_sem_conta.ts (+ .json, index.ts)
  - src/payload-types.ts
  - src/lib/classisex/rules.ts
  - src/lib/classisex/media-messages.ts
  - src/lib/assinantes/tier.ts
  - src/lib/classisex/visitante.ts (new)
  - src/lib/classisex/service.ts
  - src/lib/email/anuncio-visitante.ts (new)
  - src/components/admin/classisex/ModeracaoPanel.tsx
  - src/components/admin/classisex/FilaClassisex.tsx
  - src/components/classisex/AdFormFields.tsx (new)
  - src/components/classisex/AdForm.tsx
  - src/components/classisex/VisitorAdForm.tsx (new)
  - src/app/(frontend)/classisex/page.tsx
  - src/app/(frontend)/classisex/anunciar/page.tsx (new)
  - src/app/(frontend)/classisex/anunciar/enviar/route.ts (new)
  - src/app/(frontend)/classisex/anunciar/recebido/page.tsx (new)
  - tests/unit/blur.test.ts (deleted), tests/unit/tier.test.ts, tests/unit/public-ad-dto.test.ts
  - tests/unit/visitante-rules.test.ts (new), tests/unit/anuncio-visitante-email.test.ts (new)
  - tests/int/ad-media.int.test.ts, tests/int/anuncio-visitante.int.test.ts (new)
  - tests/e2e/classisex-publico.spec.ts, tests/e2e/classisex-seguranca.spec.ts, tests/e2e/classisex-sem-conta.spec.ts (new)
  - docs/painel/GUIA-DA-EQUIPE.md
must_haves:
  truths:
    - "A visitor without an account opens /classisex, clicks Anunciar, fills the same fields as the subscriber form plus e-mail, 18+ and terms, attaches 1 photo, sends, and lands on 'Recebemos seu anúncio'"
    - "A request with 2 photos or a video is refused by the server and creates nothing"
    - "The visitor ad is 'pendente' until staff approve it; staff see a 'Sem conta' column/filter and the e-mail in the ad sidebar only"
    - "After approval the ad shows on /classisex with full redacted text and a SHARP cover photo, no contacts; an active subscriber sees the contacts"
    - "No ClassiSex photo is blurred anywhere; what is visible (cover only for the open area and free accounts) is unchanged"
    - "The visitor e-mail never appears in any DTO, page HTML/RSC, audit row or log"
    - "Logged-in accounts that open /classisex/anunciar go to /area-do-assinante/meus-anuncios/novo"
  artifacts:
    - path: "src/lib/classisex/visitante.ts"
      provides: "ensureVisitantesAccount, createVisitorAd, VISITANTES_EMAIL"
    - path: "src/app/(frontend)/classisex/anunciar/enviar/route.ts"
      provides: "POST multipart endpoint (fields + 0/1 photo)"
      exports: ["POST"]
    - path: "src/collections/Ads.ts"
      contains: "enviadoSemConta"
    - path: "src/app/(frontend)/classisex/previa/[id]/route.ts"
      provides: "sharp card of the cover of a visible ad"
  key_links:
    - from: "src/components/classisex/VisitorAdForm.tsx"
      to: "/classisex/anunciar/enviar"
      via: "fetch POST FormData (and native form action fallback)"
    - from: "src/app/(frontend)/classisex/anunciar/enviar/route.ts"
      to: "createVisitorAd"
      via: "import from @/lib/classisex/visitante"
    - from: "src/lib/classisex/service.ts moderateAd"
      to: "notifyVisitorAd"
      via: "call after the audit row when ad.enviadoSemConta"
---

<objective>
Two client decisions of 2026-10-23 in one quick task (see CONTEXT.md, IDs Q-xx and S-xx):
1. ClassiSex photos are no longer blurred for non-subscribers (Q-01..Q-06).
2. Visitors without an account can publish a ClassiSex ad through an open form, same fields and rules as a paying
   author but at most 1 photo and no video, always moderated (S-01..S-13).

Output: code, one migration, tests (unit/int/e2e), staff guide, and `SUMMARY.md` in this folder.
</objective>

<execution_context>
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/quick/2026-10-23-classisex-sem-conta/CONTEXT.md
@CLAUDE.md
@src/lib/classisex/service.ts (createAd, attachMedia, moderateAd, getModerationView, countActive, validated, assertActiveCategory)
@src/lib/classisex/rules.ts
@src/lib/assinantes/tier.ts
@src/collections/Ads.ts
@src/collections/AdMedia.ts
@src/components/classisex/AdForm.tsx
@src/lib/migracao/load.ts (lines ~270-330: EQUIPE_LEGADO_EMAIL / ensureEquipeLegadoAccount = the pattern to copy)
@src/lib/assinantes/signup.ts (honeypot `website`, allowAttempt per IP/e-mail, maior18/termos messages)
@src/components/assinantes/SignupForm.tsx (markup of honeypot + 18+ + terms checkboxes)
@src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/[id]/midia/route.ts (upload route checks, mimeOf, MAX_BODY pattern)
@src/lib/email/new-signup-notice.ts (e-mail builder + never-throw sender pattern)

<interfaces>
service.ts (existing):
- `class ServiceError(code, message, status = 400, errors?: AdErrors)`
- `createAd(payload, { assinanteId, input: AdInput, now })` → `{ id }` (validates, checks category, 3-active by author, creates 'pendente' with `context: { ownerEdit: true }`)
- `attachMedia(payload, { assinanteId, adId, file: UploadFile, now })` → `{ id }`; `UploadFile = { data: Buffer; mimetype; name; size }`. Works for the placeholder owner (loadOwnedAd checks author === assinanteId); on a 'pendente' ad backToModeration only re-sets pendente.
- `moderateAd(req, id, kind: 'aprovar'|'recusar'|'despublicar', { motivo, now, auditDetails })` — approveAd/rejectAd/unpublishAd/approveAds all go through it.
- `ModerationView.contaAutor: 'Conta gratuita' | 'Assinante'` (also typed in ModeracaoPanel.tsx line ~24).
rules.ts: `validateAdInput(input: AdInput, { legacy })`, `ACTIVE_LIMIT = 3`, `ACTIVE_STATUSES`, `AD_MESSAGES`.
tier.ts: `TIER_LIMITS.gratis = { fotos: 1, videos: 0, anunciosAtivos: 3 }`, `TIER_COMPARISON` row 'Ver anúncios do ClassiSex'.
media-messages.ts: `MAX_AD_PHOTO_BYTES = 15_000_000`, `PHOTO_MIME_TYPES`, `VIDEO_MIME_TYPES`, `UploadErrorCode`, `uploadCodeFor`.
rate limit: `allowAttempt(key: string, now: number, max = 5, windowMs = 3_600_000): boolean` in src/lib/email/rate-limit.ts.
e-mail: `emailEnabled()`, `fromIdentity()` in src/lib/email/config.ts; send with `payload.sendEmail({ to, subject, text, html })`.
session: `getAssinante()` (cached, returns principal or null) in src/lib/assinantes/session.ts.
e2e helpers: age gate cookie `{ name: 'pb_age_ok', value: '1' }`; `staffApi(request)` in tests/e2e/helpers/api.ts has `aprovar(id)` (POST /api/ads/:id/aprovar); photo fixtures tests/fixtures/flyer-square.jpg, flyer-portrait.jpg.
</interfaces>
</context>

<executor_environment>
Run in your own git worktree. Do not touch the shared `paraiso_test` DB or port 3000.
1. `createdb -T paraiso_test paraiso_test_semconta` (template copy; nobody else may be connected to paraiso_test — if it
   fails with "being accessed by other users", retry after a few seconds).
2. Copy `.env.test` into the worktree and set `DATABASE_URI=postgres://paraiso:paraiso_dev@127.0.0.1:5432/paraiso_test_semconta`,
   `E2E_PORT=3107` (any free port), `PRIVATE_MEDIA_DIR=<worktree>/.tmp/private-media`, `EMAIL_CAPTURE_DIR=<worktree>/test-results/emails`.
3. After the schema change: `pnpm payload migrate:create classisex_sem_conta` then `pnpm payload migrate` (both with the
   worktree env), `pnpm generate:types`. Exactly one new migration; `migrate:create` again must report no changes.
4. E2E against a production build (the dev server is too slow): `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=<mock file>
   pnpm next build --webpack` (the mock file is not in the repo: ask the coordinator for the path used by previous
   executors, or create a CommonJS module exporting `{ [googleFontsCssUrl]: '<css>' }` for the fonts in src/app; never
   reach fonts.googleapis.com), then
   `pnpm next start -p 3107` in background with the same env, then `pnpm playwright test <specs>` (reuseExistingServer
   picks it up via E2E_PORT).
5. At the end drop the DB copy (`dropdb paraiso_test_semconta`) and stop the server.
</executor_environment>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fotos nítidas no ClassiSex aberto (Q-01..Q-05)</name>
  <files>src/collections/AdMedia.ts, src/lib/classisex/blur.ts, src/app/(frontend)/classisex/previa/[id]/route.ts, src/lib/classisex/dto.ts, src/lib/classisex/board.ts, src/components/classisex/PublicAdCard.tsx, src/components/classisex/PublicBoard.tsx, src/components/classisex/InactivePanel.tsx, src/components/classisex/AdMediaPicker.tsx, src/lib/assinantes/tier.ts, member pages listed in frontmatter, src/app/(frontend)/classisex/page.tsx (copy only), src/components/admin/classisex/ModeracaoPanel.tsx (copy only), tests/unit/blur.test.ts, tests/unit/tier.test.ts, tests/unit/public-ad-dto.test.ts, tests/int/ad-media.int.test.ts, tests/e2e/classisex-publico.spec.ts, tests/e2e/classisex-seguranca.spec.ts</files>
  <behavior>
    - toPublicAdDTO points at `/classisex/previa/{coverId}` for the cover even when the media row has no `previa` (field no longer required); still no video, no second photo, no author.
    - TIER_COMPARISON 'Ver anúncios do ClassiSex' gratis = 'todos, sem contato'.
    - GET /classisex/previa/{coverId} of a visible ad → 200 image/webp whose bytes equal the stored `sizes.card` file (fallback: original); header X-Robots-Tag contains 'noindex'; non-cover photo, video, pending/refused/unpublished ad → 404 (unchanged).
    - Uploading a photo no longer writes a `-previa.webp` file.
  </behavior>
  <action>
Per Q-03 remove the `writePreview` afterChange hook and the `makeBlurredPreview` import from AdMedia.ts; delete src/lib/classisex/blur.ts and tests/unit/blur.test.ts; keep the `previa` field and the `removePreview` afterDelete hook (it cleans old blurred files); update the comment at the legacy-import note ("size, decoding, EXIF strip still apply").
Per Q-01/Q-02/Q-04 rewrite the previa route: keep every existing check (numeric id, foto kind, ad visible via isAdVisible, cover via coverOf, 404 otherwise) but select `filename` and `sizes` instead of requiring `previa`; serve `path.basename(sizes.card.filename ?? filename)` from privateMediaDir(), Content-Type image/webp, Cache-Control unchanged (`public, max-age=600`), add `X-Robots-Tag: noindex, noimageindex`; rewrite the doc comment (sharp cover, why it is safe: re-encoded webp, no EXIF, cover only).
In dto.ts toPublicAdDTO drop the `found.previa` requirement (cover exists → URL) and fix comments; in board.ts select `kind, order, ad` (previa no longer needed) and fix comments.
Per Q-05: PublicAdCard alt 'Foto do anúncio' and comments; TIER_COMPARISON text; every user-facing "desfocada(s)/desfoque" string in the files listed (InactivePanel, AdMediaPicker help, area-do-assinante pages, meus-anuncios/novo, ModeracaoPanel preview text, /classisex intro and AssineJaCta copy → "o contato, todas as fotos e os vídeos ficam para assinantes"). Use `grep -rni "desfoc" src` to find any left.
Tests: update tier.test, public-ad-dto.test (no previa needed; still cover-only), ad-media.int (no previa file expected on new uploads), e2e classisex-publico (alt text, test titles, add assertion that the served bytes are the card file: compare length with the stored card via the API helper, and X-Robots-Tag) and classisex-seguranca (titles/comments; keep cover-only and 404 assertions). Do not loosen any leak assertion (contacts, filenames, non-cover photos, video).
  </action>
  <verify>
    <automated>pnpm vitest run tests/unit/tier.test.ts tests/unit/public-ad-dto.test.ts tests/int/ad-media.int.test.ts && test ! -e src/lib/classisex/blur.ts && ! grep -rniI "desfoc" src | grep -v "^src/migrations/"</automated>
  </verify>
  <done>No blur is generated or served; open board/free board show the sharp cover only; tests updated and green; no "desfocada" product text left in src.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Schema, regras e serviço do anúncio sem conta (S-02..S-05, S-08, S-09)</name>
  <files>src/collections/Ads.ts, src/migrations/*_classisex_sem_conta.ts(.json), src/migrations/index.ts, src/payload-types.ts, src/lib/classisex/rules.ts, src/lib/classisex/media-messages.ts, src/lib/assinantes/tier.ts, src/lib/classisex/visitante.ts, tests/unit/visitante-rules.test.ts, tests/int/anuncio-visitante.int.test.ts</files>
  <behavior>
    - validateVisitorExtras({ email, maior18, termos }) → errors for empty/invalid e-mail (> 254 or no a@b.c shape), missing 18+, missing terms; normaliseVisitorEmail lower-cases and trims.
    - createVisitorAd with valid input + 1 JPEG → ad 'pendente', author = visitantes placeholder, enviadoSemConta true, emailVisitante lower-cased, 1 ad-media photo.
    - 2 photos → ServiceError 'fotos-sem-conta', nothing created; any video → 'video-sem-conta', nothing created.
    - Same text/contact rules as subscribers: no contact → errors.contato; 601 characters → errors.texto.
    - 4th active ad with the same e-mail in different case → ServiceError 'limite' (S-09); a refused one does not count.
    - 6th attempt from the same IP within the hour → 'envios' 429; honeypot filled → returns { id: null } and creates nothing.
    - Photo rejected by AdMedia hook (bad bytes) → the ad is deleted and the error code is returned.
    - Ensure-account is idempotent and the account cannot log in (`_verified: false`).
    - JSON of getPublicAds / member board DTO / getModerationView for that ad never contains the e-mail.
  </behavior>
  <action>
Ads.ts (per S-05): add fields `enviadoSemConta` (checkbox, label 'Enviado sem conta', index, defaultValue false) and `emailVisitante` (text, maxLength 254, index, label 'E-mail de quem anunciou sem conta (só a equipe vê)'), both with access `{ create: () => false, update: () => false, read: isStaff }`, sidebar, readOnly, descriptions in pt; add 'enviadoSemConta' to admin.defaultColumns (before 'aprovarNaLista'); extend the collection description and the `author` description with one sentence about "Visitantes (sem conta)". Generate the migration and types (see executor_environment).
rules.ts: add `VISITOR_MESSAGES` (email: 'Informe um e-mail válido. Só a equipe vê.', maior18 and termos copied from SIGNUP_MESSAGES, limite: 'Este e-mail já tem 3 anúncios em análise ou publicados. Espere a análise ou crie uma conta para gerenciar seus anúncios.', envios: 'Muitos envios seguidos. Tente de novo mais tarde.'), `EMAIL_MAX = 254`, `normaliseVisitorEmail`, `validateVisitorExtras`. Pure module, no imports added besides existing.
media-messages.ts: messages + UploadErrorCode entries 'fotos-sem-conta' ('Anúncio sem conta: 1 foto, sem vídeo. Assinantes enviam até 10 fotos e 2 vídeos.') and 'video-sem-conta'.
tier.ts: export `VISITANTE_LIMITS = { fotos: 1, videos: 0, anunciosAtivos: ACTIVE_LIMIT }` (S-03).
visitante.ts (no 'server-only', no Next imports, like service.ts): `VISITANTES_EMAIL = 'visitantes@invalid.paraiso.local'`, `VISITANTES_NAME = 'Visitantes (sem conta)'`, `ensureVisitantesAccount(payload, now)` copying ensureEquipeLegadoAccount (random password, `origem: 'equipe'`, staffNotes 'Conta técnica: dona dos anúncios enviados sem conta pelo formulário aberto. Ninguém entra com ela.', context trustedCreate+skipAudit, then `_verified: false`, race re-find; no audit row). `createVisitorAd(payload, { input: AdInput, email, maior18, termos, website, files: UploadFile[], ip, now })` → `{ id: number | null }`, order: (1) honeypot non-empty → `{ id: null }`; (2) media count rules (more than VISITANTE_LIMITS.fotos photos → 'fotos-sem-conta'; any VIDEO_MIME_TYPES file → 'video-sem-conta'; photo with mimetype not in PHOTO_MIME_TYPES → 'tipo'; size > MAX_AD_PHOTO_BYTES → 'grande'); (3) validateAdInput(input) (no legacy, per S-02) merged with validateVisitorExtras → ServiceError('invalido', 'Confira os campos destacados.', 400, errors) — widen the errors type to Record<string,string> where needed; (4) assertActiveCategory (export it from service.ts if not exported); (5) allowAttempt(`anuncio-visitante-ip:${ip}`, now, 5) and (`anuncio-visitante-email:${email}`, now, 5) → ServiceError('envios', ..., 429); (6) count ads where enviadoSemConta true, emailVisitante equals normalised e-mail, status in ACTIVE_STATUSES → ≥ ACTIVE_LIMIT → ServiceError('limite', VISITOR_MESSAGES.limite, 409); (7) ensureVisitantesAccount; payload.create ads with author placeholder, normalised fields, status 'pendente', submittedAt/consentAt now, enviadoSemConta true, emailVisitante, overrideAccess, context ownerEdit; (8) for the photo call attachMedia(payload, { assinanteId: placeholderId, adId, file, now }); on any error delete the ad (overrideAccess) and rethrow (ServiceError as is). Never log the e-mail.
Tests: unit for rules; int (pattern of tests/int/ads.int.test.ts and ad-media.int.test.ts for payload setup, PRIVATE_MEDIA_DIR and image buffers via sharp) covering every behavior line above; reset the limiter between tests by using distinct ip/e-mail keys (do not export internals).
  </action>
  <verify>
    <automated>pnpm vitest run tests/unit/visitante-rules.test.ts tests/int/anuncio-visitante.int.test.ts tests/int/ads.int.test.ts tests/int/ad-media.int.test.ts && pnpm tsc --noEmit</automated>
  </verify>
  <done>One new migration applied; visitor ads are created only through createVisitorAd with server-enforced 1-photo/no-video, regular text/contact rules, per-IP/e-mail rate limits, 3-active-per-e-mail limit; e-mail absent from DTOs; tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Moderação, painel e aviso por e-mail (S-06, S-07, S-12)</name>
  <files>src/lib/classisex/service.ts, src/lib/email/anuncio-visitante.ts, src/components/admin/classisex/ModeracaoPanel.tsx, src/components/admin/classisex/FilaClassisex.tsx, tests/unit/anuncio-visitante-email.test.ts, tests/int/anuncio-visitante.int.test.ts</files>
  <behavior>
    - buildVisitorAdEmail({ kind: 'aprovar'|'recusar'|'despublicar', apelido, motivo, siteBase }) → subject/text/html in pt; HTML-escaped apelido/motivo; links to {siteBase}/classisex and {siteBase}/cadastro; never contains contacts or the ad text.
    - Approving (single and via approveAds) / refusing / unpublishing a visitor ad sends exactly one e-mail to emailVisitante when emailEnabled(); a member ad sends none; a sendEmail failure does not fail the moderation.
    - getModerationView of a visitor ad → contaAutor 'Sem conta (visitante)', semConta true, no e-mail anywhere in the JSON.
    - Audit rows of the moderation never contain the visitor e-mail (the placeholder account e-mail is fine).
  </behavior>
  <action>
New src/lib/email/anuncio-visitante.ts following new-signup-notice.ts: `buildVisitorAdEmail` and `notifyVisitorAd(payload, { to, kind, apelido, motivo }, siteBase)` that returns early if !emailEnabled(), wraps sendEmail in try/catch and logs only 'Falha no aviso do anúncio sem conta #<id>' (pass the ad id, never the address). siteBase from NEXT_PUBLIC_SERVER_URL as done elsewhere (grep how notifyNewSignup gets siteBase and reuse).
service.ts moderateAd (per S-07): after writeAudit, if `ad.enviadoSemConta && ad.emailVisitante` call notifyVisitorAd with the transition kind and cleaned reason; extend the AdDoc type with the two fields. getModerationView (per S-06): add `semConta: boolean`, contaAutor type becomes `'Conta gratuita' | 'Assinante' | 'Sem conta (visitante)'` (visitor ad → that label without calling accessStatusFor). Do not add the e-mail to ModerationView.
ModeracaoPanel.tsx: update the type and the "Conta do anunciante" line: for 'Sem conta (visitante)' show 'Sem conta (visitante) — 1 foto, sem vídeo, não recebe recados. A pessoa não consegue editar nem apagar; o e-mail para aviso está na barra lateral.'
FilaClassisex.tsx: add a count of `enviadoSemConta = true AND status = pendente` with a link `${adminRoute}/collections/ads?where[enviadoSemConta][equals]=true&where[status][equals]=pendente` labelled 'N sem conta em análise' (follow the existing equipe link markup; hide when 0).
Tests: unit for the builder; extend the int test with a spy/mocked `payload.sendEmail` (or EMAIL_CAPTURE_DIR files) for approve, bulk approve, refuse; member ad → no visitor e-mail; ModerationView/audit JSON without the e-mail.
  </action>
  <verify>
    <automated>pnpm vitest run tests/unit/anuncio-visitante-email.test.ts tests/int/anuncio-visitante.int.test.ts tests/int/ad-moderation.int.test.ts tests/int/ad-aprovacao-lote.int.test.ts</automated>
  </verify>
  <done>Staff can find and moderate visitor ads (column, filter, dashboard link, panel label); visitor is e-mailed on approve/refuse/unpublish; existing moderation tests still green.</done>
</task>

<task type="auto">
  <name>Task 4: Formulário aberto, rota de envio e entradas (S-01, S-10, S-11, S-13)</name>
  <files>src/components/classisex/AdFormFields.tsx, src/components/classisex/AdForm.tsx, src/components/classisex/VisitorAdForm.tsx, src/app/(frontend)/classisex/anunciar/page.tsx, src/app/(frontend)/classisex/anunciar/enviar/route.ts, src/app/(frontend)/classisex/anunciar/recebido/page.tsx, src/app/(frontend)/classisex/page.tsx</files>
  <action>
Per S-01 extract from AdForm.tsx the markup of apelido, Eu sou, cidade, texto, contato fieldset and the DECLARACAO consent into `AdFormFields({ categories, values, errors, legacy })` (same ids/names/aria/classes byte-for-byte, FieldError moved with it, DECLARACAO stays exported from AdForm.tsx or moves and is re-exported so existing imports keep working). AdForm renders AdFormFields; behaviour of AdForm must not change (existing e2e meus-anuncios/anuncio-midia-criacao stay green).
VisitorAdForm.tsx ('use client'): `<form action="/classisex/anunciar/enviar" method="post" encType="multipart/form-data" noValidate>` with AdFormFields, then: e-mail input (name 'email', type email, autoComplete email, help 'Só a equipe vê. Usamos para avisar quando o anúncio for publicado ou recusado.'), honeypot exactly like SignupForm (name 'website', visually hidden, tabIndex -1), checkboxes 'maior18' and 'termos' (value 'sim', same texts/links as SignupForm), one `<input type="file" name="foto" accept="image/jpeg,image/png,image/webp">` WITHOUT `multiple`, help 'Sem conta: 1 foto (JPG, PNG ou WebP, até 15 MB), sem vídeo. Assinantes enviam até 10 fotos e 2 vídeos.', a notice (per S-10) 'Depois de enviar, não dá para editar nem apagar este anúncio. Crie uma conta gratuita para editar e apagar seus anúncios.' with link /cadastro, submit 'Enviar para aprovação'. onSubmit: preventDefault, POST new FormData(form) with `Accept: application/json`, disable while sending ('Enviando…'), on `{ ok: true, redirect }` router.push(redirect), on `{ ok: false, errors }` show errors (field errors + `form`) without clearing inputs, focus the first error. Show `?erro=<code>` (no-JS fallback) as a form-level message mapped to text.
enviar/route.ts (per S-13/S-08, pattern of meus-anuncios/[id]/midia/route.ts; `dynamic = 'force-dynamic'`; no-store + noindex headers): reject Content-Length > MAX_AD_PHOTO_BYTES + 1_000_000 ('grande'); parse formData (failure → 'tipo'); read the same fields as actions.ts readInput (copy the parsing; author/status never read), email, maior18/termos === 'sim', website; files = all `foto` and `video` entries that are non-empty File (mimeOf with extension fallback); ip as in src/lib/assinantes/actions.ts; call createVisitorAd. JSON mode (Accept includes application/json): `{ ok: true, redirect: '/classisex/anunciar/recebido' }` or `{ ok: false, errors }` (ServiceError.errors, else `{ form: message }`; media codes mapped to the field 'foto'), status 200/4xx. Non-JSON: 303 to recebido or to `/classisex/anunciar?erro=<code>`. Unknown errors: console.error without e-mail/body, generic message. A logged-in assinante posting here is still treated as a visitor (no session read) — acceptable and documented in a comment.
anunciar/page.tsx: `dynamic = 'force-dynamic'`; if getAssinante() returns a principal → redirect('/area-do-assinante/meus-anuncios/novo') (S-11); else render heading 'Anunciar no ClassiSex', short intro (aparece depois da análise da equipe; visitantes veem o texto e a foto, só assinantes veem o contato), categories from the same source meus-anuncios/novo uses (active Eu sou options), VisitorAdForm. Metadata noindex (use buildPageMetadata's noindex option if it has one, else `robots: { index: false, follow: false }`).
recebido/page.tsx: static, noindex: 'Recebemos seu anúncio' + 'Ele aparece no ClassiSex depois da análise da equipe. Avisamos no e-mail informado.' + links /classisex and /cadastro.
/classisex page: add a primary link 'Anunciar' → /classisex/anunciar next to the existing "Já é assinante?" link; adjust the intro sentence to say anyone can post (keep the page free of session reads).
  </action>
  <verify>
    <automated>pnpm tsc --noEmit && pnpm eslint src/components/classisex src/app/\(frontend\)/classisex && pnpm vitest run tests/unit</automated>
  </verify>
  <done>Logged-out visitor can reach and submit the form (JS and no-JS), logged-in accounts are sent to the members flow, AdForm unchanged in behaviour.</done>
</task>

<task type="auto">
  <name>Task 5: E2E, guia da equipe e verificação completa</name>
  <files>tests/e2e/classisex-sem-conta.spec.ts, docs/painel/GUIA-DA-EQUIPE.md, .planning/quick/2026-10-23-classisex-sem-conta/SUMMARY.md</files>
  <action>
New spec classisex-sem-conta.spec.ts (unique sentinel text/e-mail per run; set a unique `x-forwarded-for` header per test context so the in-memory limiter of a reused server does not interfere):
(a) logged-out visitor with age-gate cookie opens /classisex, clicks 'Anunciar', fills apelido/Eu sou/texto (with a planted phone inside the text)/WhatsApp/e-mail/18+/terms, attaches tests/fixtures/flyer-square.jpg, submits → URL /classisex/anunciar/recebido and the heading; the ad is not on /classisex yet.
(b) the file input has no `multiple`; a direct request POST to /classisex/anunciar/enviar with two `foto` files (Accept JSON) → ok false with the 1-photo message, and a post with an mp4 (tests/fixtures/espaco.mp4) → refused; staff API confirms no ad was created for those sentinels.
(c) staff (staffApi) find the ad (filter enviadoSemConta=true + sentinel), check status pendente, enviadoSemConta true, then aprovar → the e-mail capture dir has a message to the visitor e-mail.
(d) anonymous /classisex shows the card with the full text with the planted phone redacted, one img with src /classisex/previa/{id} answering 200 image/webp with X-Robots-Tag noindex, no WhatsApp/visitor e-mail anywhere in the HTML.
(e) an active subscriber (reuse a scenario helper from tests/e2e/helpers/classisex.ts or conta-gratuita.ts) opens /area-do-assinante/classisex/{id} and sees the WhatsApp link; no 'Enviar recado' link (free/placeholder author).
(f) a logged-in free account opening /classisex/anunciar lands on /area-do-assinante/meus-anuncios/novo.
Staff guide (docs/painel/GUIA-DA-EQUIPE.md): replace every "desfocada" sentence (lines ~257, 287, 332, 474, 481, 485, 590) with the sharp-cover wording; add a subsection "Anúncios sem conta" under ClassiSex: what visitors can send (same fields, 1 foto, sem vídeo), always Em análise, column/filter "Enviado sem conta" and the dashboard link, the e-mail in the sidebar is private (never share it, it goes away when the ad is deleted), the visitor gets an e-mail when the ad is approved/refused/unpublished, the visitor cannot edit or delete (staff delete on request), no recados, limit 3 active per e-mail, and that the cover is now visible to every visitor 18+ — check it before approving (Q-06).
Full verification: `pnpm tsc --noEmit`, `pnpm eslint .`, `pnpm vitest run` (all), production build, then Playwright desktop+mobile for classisex-sem-conta, classisex-publico, classisex-seguranca, conta-gratuita, conta-gratuita-seguranca, meus-anuncios, anuncio-midia-criacao, anuncio-midia, moderacao, admin-aprovar-lista, cadastro, previas. Fix regressions caused by this work; note unrelated pre-existing failures (e.g. seo.spec on the copied DB) in SUMMARY.
Write SUMMARY.md (pt, short, like previous quick SUMMARYs): what changed, migration name, test results, and the three client confirmation items from CONTEXT (Q-06, S-07, privacy policy).
  </action>
  <verify>
    <automated>pnpm playwright test tests/e2e/classisex-sem-conta.spec.ts tests/e2e/classisex-publico.spec.ts tests/e2e/classisex-seguranca.spec.ts && ! grep -ni "desfoc" docs/painel/GUIA-DA-EQUIPE.md</automated>
  </verify>
  <done>E2E green on both projects; guide updated; SUMMARY.md written; DB copy dropped.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| anonymous browser → POST /classisex/anunciar/enviar | untrusted fields + file, no session |
| anonymous browser → GET /classisex/previa/{id} | public image route over private media dir |
| staff admin → moderation | triggers e-mail to an unverified address |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-Q-01 | Tampering | enviar route / createVisitorAd | mitigate | author, status, marker and limits set only in the service; >1 photo or any video refused before writes; AdMedia hook (placeholder = gratis) as last line |
| T-Q-02 | Denial of service | enviar route | mitigate | Content-Length cap before parsing; allowAttempt 5/h per IP and per e-mail; 3 active per e-mail; honeypot |
| T-Q-03 | Information disclosure | emailVisitante | mitigate | field read isStaff, create/update false; not in any DTO/ModerationView/audit/log; int + e2e assertions |
| T-Q-04 | Information disclosure | previa route | mitigate | cover of visible ads only (unchanged checks); serves re-encoded webp (no EXIF/GPS); path from DB basename; X-Robots-Tag noindex, noimageindex |
| T-Q-05 | Spoofing | visitor e-mail notices | accept | address is unverified; notice sent only after a staff action, carries no contact/text; no receipt e-mail on submit |
| T-Q-06 | Elevation of privilege | placeholder account | mitigate | random password, `_verified: false`, no period → cannot log in, never active (recados blocked server-side) |
| T-Q-07 | Spoofing | IP for rate limit | accept | x-forwarded-for trust same as /cadastro (Caddy in front); in-memory, single container |
| T-Q-08 | Tampering (CSRF) | enviar route | mitigate | src/proxy.ts foreign-Origin rejection already covers POST route handlers |
</threat_model>

<verification>
- `pnpm tsc --noEmit`, `pnpm eslint .`, `pnpm vitest run` all green.
- Playwright specs from Task 5 green on desktop and mobile against `next start`.
- `grep -rniI "desfoc" src docs/painel` returns nothing product-facing.
- `pnpm payload migrate:create` after the work reports no pending changes.
</verification>

<success_criteria>
- Visitors post ads without an account (1 photo, no video, regular rules), staff moderate them, visitors are e-mailed on the decision.
- ClassiSex covers are sharp for everyone; contacts still only for active subscribers; visible-media rules unchanged.
- Visitor e-mail is staff-only.
</success_criteria>

<output>
Create `.planning/quick/2026-10-23-classisex-sem-conta/SUMMARY.md` when done.
</output>
