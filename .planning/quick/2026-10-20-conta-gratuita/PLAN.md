---
type: quick
slug: conta-gratuita
date: 2026-10-20
priority: high (client request)
autonomous: false
depends_on: ["05-11"]
requirements: [CONTA-01, CONTA-02, CONTA-03, CONTA-04, CLAS-01, CLAS-02, CLAS-03, CLAS-06, PREV-01, ASS-04, REC-01, REC-02, PAINEL-08]
decisions: [G-01, G-02, G-03, G-04, G-05, G-06]
plans: 6
files_modified:
  - tests/e2e/modelos.spec.ts
  - src/components/Nav.tsx
  - src/lib/site/nav.ts
  - src/lib/assinantes/tier.ts
  - src/lib/classisex/visibility.ts
  - src/lib/classisex/dto.ts
  - src/lib/classisex/board.ts
  - src/lib/classisex/media-access.ts
  - src/lib/classisex/service.ts
  - src/lib/classisex/actions.ts
  - src/lib/classisex/media-messages.ts
  - src/lib/classisex/queries.ts
  - src/app/(frontend)/classisex/previa/[id]/route.ts
  - src/app/(frontend)/(membros)/area-do-assinante/midia/[id]/[variante]/route.ts
  - src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/[id]/midia/route.ts
  - src/collections/AdMedia.ts
  - src/collections/Assinantes.ts
  - src/migrations/*_conta_gratuita.ts
  - src/lib/assinantes/signup.ts
  - src/lib/assinantes/actions.ts
  - src/lib/email/verify-account.ts
  - src/app/(frontend)/cadastro/page.tsx
  - src/app/(frontend)/cadastro/confirmar/page.tsx
  - src/app/(frontend)/entrar/page.tsx
  - src/app/(frontend)/assine-ja/page.tsx
  - src/components/assinantes/PlanComparison.tsx
  - src/components/classisex/InactivePanel.tsx
  - src/components/classisex/AdForm.tsx
  - src/components/classisex/AdMediaPicker.tsx
  - src/components/classisex/OwnerMediaManager.tsx
  - src/components/classisex/OwnerAdCard.tsx
  - src/components/admin/classisex/ModeracaoPanel.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/**
  - docs/painel/GUIA-DA-EQUIPE.md
  - docs/deploy/STAGING.md
  - tests/** (see each task)

must_haves:
  truths:
    - "The full test suite (Vitest + Playwright, both projects) is green before any conta-gratuita change lands; modelos.spec.ts:55 passes"
    - "Anyone 18+ creates an account at /cadastro (e-mail, senha, apelido, 18+ declaration, Termos/Privacidade consent), confirms the e-mail through a link and logs in as a free account; with e-mail not configured /cadastro is closed with a message and the action creates nothing"
    - "Existing accounts (staff-created, seeds, migrated) keep logging in after `auth.verify` is turned on: all are `_verified = true` and staff creates never send a verification e-mail"
    - "A free account can create up to 3 active ads with 1 photo and no video; a paying account keeps 10 photos and 2 videos; the server refuses the excess in create, edit, upload route, hooks and admin uploads"
    - "A free account sees only Meus anúncios; the members ClassiSex board/detail, contacts, recados and mensagens show the Assine Já panel with the Grátis × Assinante comparison and no restricted markup"
    - "Approved ads of free accounts appear for paying members (with 1 photo, contacts, no Enviar mensagem) and in the open preview (apelido, tipo, blurred cover)"
    - "When a subscription expires the ads stay on the board as free: only the cover photo is served and listed, videos and other photos answer 404 to other members, and everything comes back on renewal without re-upload"
    - "The comparison block appears on /cadastro, Meus anúncios, Novo anúncio and /assine-ja"
    - "Staff see each account's tier (Gratuita / Assinante), origin (Cadastro no site / Equipe) and e-mail confirmation in the panel"
  artifacts:
    - path: "src/lib/assinantes/tier.ts"
      provides: "Tier, tierOf, tierFromAccessUntil, TIER_LIMITS, coverOf, visibleMediaFor, TIER_COMPARISON"
      exports: ["tierOf", "tierFromAccessUntil", "TIER_LIMITS", "coverOf", "visibleMediaFor", "TIER_COMPARISON"]
    - path: "src/lib/assinantes/signup.ts"
      provides: "signUp, resendVerification, confirmEmail (rate-limited, neutral answers)"
    - path: "src/app/(frontend)/cadastro/page.tsx"
      provides: "public sign-up page"
    - path: "src/components/assinantes/PlanComparison.tsx"
      provides: "Grátis × Assinante block"
    - path: "tests/e2e/conta-gratuita-seguranca.spec.ts"
      provides: "tier leak matrix"
  key_links:
    - from: "src/collections/AdMedia.ts validateAndClean"
      to: "TIER_LIMITS[tier of the ad author]"
      via: "accessStatusFor(author) inside the hook"
      pattern: "TIER_LIMITS"
    - from: "src/app/(frontend)/(membros)/area-do-assinante/midia/[id]/[variante]/route.ts"
      to: "canViewMedia({ authorTier, isCover })"
      via: "coverOf(photos of the ad)"
      pattern: "authorTier"
    - from: "src/lib/classisex/board.ts findMemberAds/findMemberAd"
      to: "visibleMediaFor(tierFromAccessUntil(author.accessUntil))"
      via: "one query for authors' accessUntil per page"
      pattern: "visibleMediaFor"
    - from: "src/collections/Assinantes.ts auth.verify"
      to: "src/lib/email/verify-account.ts"
      via: "generateEmailHTML/generateEmailSubject → /cadastro/confirmar?token="
      pattern: "cadastro/confirmar"
---

# Quick: conta gratuita no ClassiSex (G-01..G-06)

<objective>
Open self sign-up with free accounts and two tiers on the ClassiSex, as the client asked on 2026-10-20 (CONTEXT.md, G-01..G-06, locked):
free = up to 3 active ads with 1 photo and no video, sees only its own ads; paying = today's 10 photos + 2 videos, sees all ads with contacts, recados and mensagens.
On expiry, ads stay up as free ads (cover only); extra media are kept and come back on renewal. The Grátis × Assinante comparison is shown where the user decides.

Before that, close Phase 5's gate: `tests/e2e/modelos.spec.ts:55` failed in an interrupted full run after 05-07 touched nav/footer/sitemap.

Purpose: let visitors become members for free (lead capture) and make the paid tier visibly better, without leaking paid content to free accounts.
Output: 6 sequential plans (A–F) below. Each plan ends with its own tests green and one or two commits. Plans run strictly in order (shared files: service.ts, dto.ts, board.ts, Assinantes.ts).
</objective>

<execution_context>
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/workflows/execute-plan.md
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/2026-10-20-conta-gratuita/CONTEXT.md
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/03-assinantes-e-controle-de-acesso/03-CONTEXT.md
@.planning/phases/04-classisex-e-pr-vias-de-perfis/04-CONTEXT.md
@.planning/phases/05-recados-mensagens-e-contos/05-CONTEXT.md
@.planning/phases/05-recados-mensagens-e-contos/05-11-SUMMARY.md
@.planning/quick/2026-10-20-classisex-ajustes/2026-10-20-classisex-ajustes-SUMMARY.md
@.planning/quick/2026-10-20-classisex-midia-na-criacao/2026-10-20-classisex-midia-na-criacao-SUMMARY.md
@.planning/quick/2026-10-20-email-hostinger/2026-10-20-email-hostinger-SUMMARY.md

## Decisions this plan changes (record in docs, Plan F)

- G-01 revokes 03-CONTEXT D-01 "não há cadastro aberto": self sign-up exists; staff still create accounts and liberate subscriptions (Phase 3 unchanged). REST `first-register` and anonymous REST create stay closed.
- G-05 replaces 04-CONTEXT D-06 (and the "Vencimento (D-06): mantido" line of the 2026-10-20 revision): expired authors' ads stay up as free ads (cover only).
- Recados and mensagens stay paying-only (05-CONTEXT D-01/D-02 unchanged; G-02). Recados of an expired author still disappear (D-01 unchanged: G-05 speaks only of ads).

## Interpretations chosen (planner discretion, flagged to the client)

- I-1 "Ao editar sendo gratuito, só pode manter 1 foto" (G-05) is read together with "as demais mídias ficam guardadas e voltam ao renovar": a free owner may edit text/contacts without losing stored media; a free owner cannot ADD a photo while the ad already has at least 1 photo, cannot add videos, and sees the extra media in the editor marked "Guardada: volta a aparecer quando você assinar" with Remover. Only the cover is ever shown to others. "Usar como capa" stays available (still one photo shown).
- I-2 Tier is binary and derived from the existing access logic: `assinante` iff `accessStatusFor(...).state === 'ativa'`; every other state (`sem-assinatura`, `vencida`, `encerrada`) is `gratis`. For lists of other people's ads the denormalised `assinantes.accessUntil > now` is used (same approximation as today's `visibleAdsWhere`).
- I-3 Media limits follow the AD AUTHOR's tier for everybody (owner uploads and staff uploads in /admin alike).
- I-4 Payers see free ads with their WhatsApp/Telegram contacts (G-04 "aparece na lista dos assinantes"); "Enviar mensagem" is hidden on free ads (free accounts cannot receive messages, G-02) and replaced by "Conta gratuita: use os contatos do anúncio."
- I-5 Unverified self sign-ups older than 7 days are deleted lazily (on the next sign-up request); a new sign-up for an e-mail that has an UNVERIFIED account replaces its password/apelido and re-sends the link; for a VERIFIED account nothing changes and an "você já tem conta" e-mail is sent (neutral answer on screen either way).

## Code facts the executor needs (read 2026-10-20 at 2b65bef)

- Access: `src/lib/assinantes/status.ts` `accessStatusFor(payload, id, now, req?)` → `{ state: 'ativa'|'vencida'|'encerrada'|'sem-assinatura', ... }` (no 'server-only'; importable from collection hooks). `session.ts`: `requireAssinante(path)`, `requireActiveSubscription(path)` → `{ assinante, access, inactive }`.
- Visibility today: `src/lib/classisex/visibility.ts` `visibleAdsWhere(now)` = `status = aprovado AND author.accessUntil > now`; `isAdVisible(ad, authorAccessUntil, now)`. Used by board.ts, service.ts (`reportAd`), media-access.ts, the previa route and `src/lib/mensagens/service.ts resolveTarget` (via `findVisibleAdDoc`).
- Media access: `canViewMedia({ principal, viewerActive, media:{owner,kind}, ad, authorAccessUntil, variante, now })` → `'allow'|'unauthenticated'|'not-found'` (403/404 in the route).
- DTOs: `toMemberAdDTO(doc, { euSouLabel, media })`, `toPublicAdDTO` (cover = first photo with `previa` by `byOrder` = order then id), `toOwnerAdDTO(doc, { authorActive, ... })` with `OFF_BOARD_LABEL = 'Fora do ar: assinatura vencida'`.
- Limits: `media-messages.ts` `MAX_AD_PHOTOS = 10`, `MAX_AD_VIDEOS = 2`, `AD_MEDIA_MESSAGES`, `UploadErrorCode`, `uploadCodeFor`, `CLIENT_MESSAGES`; enforced in `src/collections/AdMedia.ts validateAndClean` (count per kind on create). `rules.ts ACTIVE_LIMIT = 3`.
- EXISTING BUG to fix in Plan B: `service.ts mediaByAd` and `board.ts findPublicAds` query ad-media with `limit: adIds.length * 6`; the Drizzle adapter applies `limit` even with `pagination: false`, so an ad with more than 6 files shows only 6 on the detail page and in the owner's editor.
- Auth: `Assinantes.ts guardOperations` (beforeOperation) refuses create unless staff or `req.context.trustedCreate`; `auth` has no `verify` yet. Payload 3.91 facts (read in node_modules): login throws `UnverifiedEmail` only when `_verified === false` and only AFTER the password matched; the JWT strategy accepts a user only if `!auth.verify || user._verified` (so `_verified = null` would LOG OUT every existing account); create keeps `_verified` from data (`Boolean(data._verified) || false`) and sends the verification mail unless `args.disableVerificationEmail` (settable in beforeOperation, which runs before args are destructured); `_verified` field access = logged-in user; `verifyEmail` sets `_verified: true`.
- E-mail: `src/lib/email/config.ts emailEnabled()` (SMTP creds or `EMAIL_CAPTURE_DIR`, the latter set only by playwright.config.ts → e2e can read mails as JSON from `test-results/emails`); `rate-limit.ts allowAttempt(key, now, max, windowMs)` in memory; reset flow pattern in `src/lib/assinantes/reset-email.ts` and `pedirNovaSenha` (IP from x-forwarded-for).
- Messages: `canSend` refuses `destinatarioInativo` when the recipient is not active — free accounts already cannot receive; recados/mensagens pages and actions use `requireActiveSubscription` + `InactivePanel`.
- Tests: helpers `tests/helpers/seed.ts` (`seedAssinante` uses `context: { trustedCreate: true }`), `tests/e2e/helpers/api.ts` (staff REST: `createAssinante`, `liberar`, `createAd`, `uploadAdMedia`, `aprovar`...), `tests/e2e/helpers/classisex.ts` (OWNER/VIEWER/EXPIRED scenario, `fetchAs`), `tests/e2e/helpers/fase5.ts`. Phase 4 leak matrix `tests/e2e/classisex-seguranca.spec.ts`, media `tests/e2e/midia-protegida.spec.ts`, int `tests/int/ad-visibility.int.test.ts`, unit `tests/unit/media-access.test.ts`.
- Gate commands used by every prior plan: `pnpm typecheck`, `pnpm lint`, `pnpm test` (vitest + playwright, projects mobile and desktop, one worker), `pnpm build` with `.env` moved aside. After a run, restore mount-rewritten binaries with `git checkout -- public src/app tests/fixtures docs/screens 2>/dev/null` before committing.
</context>

<interfaces>
New pure module `src/lib/assinantes/tier.ts` (no Payload/Next imports; created in Plan B, used by every later plan):

- `type Tier = 'gratis' | 'assinante'`
- `tierOf(access: { state: AccessState }): Tier` — 'assinante' iff state === 'ativa'
- `tierFromAccessUntil(accessUntil: string | Date | null | undefined, now: Date): Tier`
- `TIER_LIMITS: Record<Tier, { fotos: number; videos: number; anunciosAtivos: number }>` = gratis {1, 0, 3}, assinante {MAX_AD_PHOTOS, MAX_AD_VIDEOS, ACTIVE_LIMIT} (import the existing constants, do not duplicate numbers)
- `TIER_LABELS: Record<Tier, string>` = { gratis: 'Conta gratuita', assinante: 'Assinante' }
- `coverOf<T extends { id: number; kind: 'foto'|'video'; order?: number|null }>(media: T[]): T | null` — first photo by (order, id), same ordering as dto.ts `byOrder`
- `visibleMediaFor<T>(tier: Tier, media: T[]): T[]` — assinante: all; gratis: `[coverOf(media)]` or []
- `TIER_COMPARISON: { item: string; gratis: string; assinante: string }[]` — rows per G-06: Fotos por anúncio (1 / até 10), Vídeos (não / até 2), Anúncios ativos (até 3 / até 3), Ver anúncios do ClassiSex (só os seus / todos, com contatos), Mensagens e recados (não / sim)

Changed signatures:
- `canViewMedia(args & { authorTier: Tier; isCover: boolean })` — `authorAccessUntil` stays only for nothing else; remove it if unused after the change.
- `visibleAdsWhere(now)` → `{ status: { equals: 'aprovado' } }` (keep the `now` parameter for call-site stability; document that author access no longer hides ads, G-05/G-04). `isAdVisible(ad)` → status only.
- `MemberAdDTO` gains `autorGratuito: boolean` (drives "Enviar mensagem" and the "Conta gratuita" note; no author identity).
- `OwnerMediaDTO.fotos[i]` and `.videos[i]` gain `guardada: boolean` (true when hidden from others by the author's current tier).
- `ModerationView` gains `contaAutor: 'Conta gratuita' | 'Assinante'`.
</interfaces>

<tasks>

<!-- ============================================================================================ -->
<!-- PLAN A — Phase 5 gate: modelos.spec.ts:55                                                     -->
<!-- ============================================================================================ -->

<task type="auto">
  <name>A1: Diagnose and fix modelos.spec.ts:55, then run the full Phase 5 gate</name>
  <files>tests/e2e/modelos.spec.ts, src/components/Nav.tsx (only if the overflow check fails), src/lib/site/nav.ts (comment only)</files>
  <read_first>
    - tests/e2e/modelos.spec.ts (test at line 55, expected list at line 81)
    - src/lib/site/nav.ts (getNavItems: Recados and Contos were inserted by 05-07 and 05-03)
    - src/components/Nav.tsx (desktop `nav[aria-label=Principal]`, `hidden lg:block`, `gap-6`), src/components/MobileMenu.tsx, src/components/Header.tsx
    - tests/e2e/shell.spec.ts (already updated by 05-07 for Recados/Contos)
  </read_first>
  <behavior>
    - Reproduce first: `pnpm exec playwright test tests/e2e/modelos.spec.ts` (both projects) and record the actual vs expected array in the summary.
    - Expected root cause (verify, do not assume): line 81 pins `['Festas','Quem somos','Espaço','Modelos','ClassiSex','Contato','Assine Já','Área do assinante']`, but the menu now also has 'Recados' (05-07) and 'Contos' (05-03) between ClassiSex and Contato. 05-07 updated shell.spec.ts but not this spec.
    - After the fix the test pins the full order: Festas, Quem somos, Espaço, Modelos, ClassiSex, Recados, Contos, Contato, Assine Já, Área do assinante.
    - Add to the same test, desktop only: the Principal nav fits on one line at 1280 px (the `ul` scrollWidth ≤ its clientWidth and every link's boundingBox().y is equal). Ten items in `gap-6` may wrap or overflow the header.
  </behavior>
  <action>
    Run the spec alone in both projects and capture the failure. If the cause is the stale literal, update the literal to the 10-item order above (keep it explicit: the order is a UI-SPEC contract, do not derive it from getNavItems). Add the one-line assertion. If the one-line check fails on desktop, fix the layout in src/components/Nav.tsx with the smallest change (first try `gap-4 xl:gap-6`; if still wrapping at 1280 px, keep `lg:` but switch the eyebrow size down one step at `lg` only) and re-run shell.spec.ts and modelos.spec.ts. Update the comment at the top of src/lib/site/nav.ts to list the current order including Recados (05-07) and Contos (05-03). If the reproduction shows a different cause (e.g. cached nav from `hasPublishedModels` tag 'models' not expiring), fix that cause instead and describe it in the summary.
    Then run the complete gate that was interrupted: `pnpm typecheck`, `pnpm lint`, `pnpm test` (full, both projects), and `pnpm build` with `.env` moved aside. Any other failure in that run: if it is test drift from Phase 5 changes (labels, menu, counts), fix the test; if it is an application regression, fix it under Rule 1 and list it. Do not start Plan B until the full run is green.
    Commit: `test(05-gate): menu order with Recados and Contos in modelos.spec` (plus `fix(...)` if Nav changed).
  </action>
  <verify>
    <automated>pnpm exec playwright test tests/e2e/modelos.spec.ts tests/e2e/shell.spec.ts && pnpm typecheck && pnpm lint && pnpm test</automated>
  </verify>
  <acceptance_criteria>
    - modelos.spec.ts passes in mobile and desktop; the expected array contains 'Recados' and 'Contos'
    - full `pnpm test` exits 0 (counts recorded in the summary: Vitest passed, Playwright passed/skipped/0 failed)
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Phase 5's code gate is green; 05-12 (deploy + client check) can run whenever the orchestrator schedules it.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN B — Tier helper, new visibility rule and media projection (G-04, G-05)                   -->
<!-- ============================================================================================ -->

<task type="auto" tdd="true">
  <name>B1: tier.ts and the new visibility/media rules (pure, unit-tested)</name>
  <files>src/lib/assinantes/tier.ts, src/lib/classisex/visibility.ts, src/lib/classisex/media-access.ts, src/lib/classisex/dto.ts, tests/unit/tier.test.ts, tests/unit/media-access.test.ts, tests/unit/ad-dto.test.ts, tests/unit/public-ad-dto.test.ts</files>
  <read_first>
    - src/lib/assinantes/status.ts (AccessState), src/lib/classisex/media-messages.ts (MAX_AD_*), src/lib/classisex/rules.ts (ACTIVE_LIMIT)
    - src/lib/classisex/visibility.ts, media-access.ts, dto.ts (byOrder, toMemberAdDTO, toPublicAdDTO, toOwnerAdDTO, toOwnerMediaDTO, OFF_BOARD_LABEL)
    - tests/unit/media-access.test.ts, ad-dto.test.ts, public-ad-dto.test.ts (existing cases to keep or invert)
  </read_first>
  <behavior>
    - tierOf: ativa → 'assinante'; vencida, encerrada, sem-assinatura → 'gratis'. tierFromAccessUntil: null → gratis; past → gratis; equal to now → gratis; future → assinante.
    - TIER_LIMITS.gratis = { fotos: 1, videos: 0, anunciosAtivos: 3 }; TIER_LIMITS.assinante = { fotos: 10, videos: 2, anunciosAtivos: 3 } (via the imported constants).
    - coverOf: picks the photo with the lowest order, ties by lowest id; ignores videos; [] → null; only videos → null.
    - visibleMediaFor('assinante', m) returns m unchanged (same order); visibleMediaFor('gratis', m) returns only the cover (never a video, never a second photo).
    - isAdVisible: aprovado → true regardless of author access; pendente/recusado/despublicado → false. visibleAdsWhere(now) has no author condition.
    - canViewMedia (new matrix): staff → allow; owner → allow every own file (including stored extras); no principal → unauthenticated; viewer not active → unauthenticated (free viewers never open other people's files, G-02); ad not approved → not-found; authorTier 'assinante' → allow; authorTier 'gratis' → allow only `kind === 'foto' && isCover` for variants miniatura/foto, else not-found (videos and extra photos of free/expired authors are 404, G-05). Wrong variant for kind stays not-found first.
    - toMemberAdDTO(doc, { euSouLabel, media, authorTier }): media passed through visibleMediaFor; `autorGratuito = authorTier === 'gratis'`. toPublicAdDTO uses coverOf (then requires `previa`).
    - toOwnerMediaDTO(media, { authorTier }): every file listed; `guardada` true for files visibleMediaFor would drop. toOwnerAdDTO: status label for an approved ad of a free author = 'Publicado como conta gratuita (só a capa aparece)'; remove OFF_BOARD_LABEL (G-05: nothing goes off the board on expiry).
  </behavior>
  <action>
    RED: write tests/unit/tier.test.ts and update media-access/ad-dto/public-ad-dto unit tests to the behavior above (cases that asserted "author expired → not-found/hidden" are inverted to the cover-only rule; keep every other existing case). Run them and see them fail.
    GREEN: create src/lib/assinantes/tier.ts per the interfaces block (pure: import only types from status.ts and constants from classisex/media-messages.ts and rules.ts; check for import cycles — if rules.ts → redact.ts is fine, keep it; if a cycle appears, move TIER_LIMITS constants import to media-messages only and hardcode anunciosAtivos via ACTIVE_LIMIT import in a leaf module). Update visibility.ts (status-only, comment cites G-04/G-05 replacing 04-CONTEXT D-06), media-access.ts (new args authorTier and isCover; drop authorAccessUntil), dto.ts (signatures above; reuse coverOf instead of the local cover pick so the public cover, the member cover and the media-route cover are the same file).
    Commit `feat(conta-gratuita): tier helper and cover-only rule for free authors`.
  </action>
  <verify>
    <automated>pnpm exec vitest run tests/unit/tier.test.ts tests/unit/media-access.test.ts tests/unit/ad-dto.test.ts tests/unit/public-ad-dto.test.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - the four unit files pass; `grep -v '^\s*//' src/lib/classisex/visibility.ts | grep -c accessUntil` prints 0
    - typecheck may fail ONLY in call sites updated by B2 (record them); B2 must leave it at 0 errors
  </acceptance_criteria>
  <done>The rules for tiers, cover and visibility exist as pure tested functions.</done>
</task>

<task type="auto" tdd="true">
  <name>B2: Wire the rules into board, detail, preview, media route, reports and messages; fix the media query limit</name>
  <files>src/lib/classisex/board.ts, src/lib/classisex/service.ts, src/lib/classisex/queries.ts, src/app/(frontend)/(membros)/area-do-assinante/midia/[id]/[variante]/route.ts, src/app/(frontend)/classisex/previa/[id]/route.ts, src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx, src/components/classisex/MemberAdCard.tsx, tests/int/ad-visibility.int.test.ts, tests/int/ads.int.test.ts, tests/int/mensagens.int.test.ts</files>
  <read_first>
    - src/lib/classisex/board.ts (findVisibleAdDocs, findMemberAds, findMemberAd, findPublicAds)
    - src/lib/classisex/service.ts (mediaByAd, listOwnAds, getOwnAdMedia, reportAd, getModerationView)
    - both media routes (full files), the members ad detail page and MemberAdCard
    - src/lib/mensagens/service.ts resolveTarget/canSend (no change expected; confirm)
    - tests/int/ad-visibility.int.test.ts (D-06 cases to rewrite)
  </read_first>
  <behavior>
    - Int (ad-visibility, rewritten D-06 block → G-05): approved ad of an author with no periods ('sem-assinatura') is on the members board and in the public preview; its member DTO has exactly 1 photo and 0 videos even when 3 photos + 1 video are stored; author with an ended period: same; renewing the author (new period) → the same ad shows all 3 photos + 1 video again with no re-upload; paying author → all files.
    - Int: an ad with 10 photos + 2 videos returns all 12 in findMemberAd, in getOwnAdMedia and in findMemberAds when 20 such ads are on the page (regression for the `* 6` limit).
    - Int: findPublicAds of a free author → cover blurred URL is the coverOf photo; previa route answers 200 for the cover and 404 for any other photo of the same ad (all tiers: the open area only ever shows the cover).
    - Int: reportAd works on a free author's approved ad (it is visible now).
    - Int (mensagens): resolveTarget on a free author's ad returns the target, and canSend returns 'destinatarioInativo' (unchanged service; documents why the UI hides the link).
  </behavior>
  <action>
    board.ts: after reading the page of ads, read the authors' `accessUntil` in one query (`assinantes`, `where id in [...]`, `select: { accessUntil: true }`, overrideAccess) and compute `tierFromAccessUntil` per ad; pass `authorTier` to toMemberAdDTO (members board and detail). findPublicAds: use coverOf; previa route: load the ad's photos (select id, kind, order), serve only if the requested media is coverOf(photos) and the ad is approved — remove the author access lookup.
    service.ts: replace both `limit: adIds.length * 6` (here and in board.ts findPublicAds) with `adIds.length * (MAX_AD_PHOTOS + MAX_AD_VIDEOS)`; listOwnAds and getOwnAdMedia pass the owner's tier (from accessStatusFor) to the DTOs; getModerationView adds `contaAutor` (TIER_LABELS of the author's accessStatusFor).
    Media route: compute `authorTier` with accessStatusFor(author) (authoritative, per request) and `isCover` by loading the ad's photos (select id, kind, order; ≤ 10 rows) and comparing with coverOf; pass both to canViewMedia. Keep headers, range handling and the 403/404 mapping unchanged.
    Members detail page and MemberAdCard: when `ad.autorGratuito`, do not render EnviarMensagemLink; render the line "Conta gratuita: use os contatos do anúncio." Contacts stay as today (I-4).
    Rewrite the D-06 int cases as G-05 cases (keep the describe names meaningful: 'expired author: ad stays as free, cover only'). Commit `feat(conta-gratuita): free and expired authors stay on the board with the cover only`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/int/ad-visibility.int.test.ts tests/int/ads.int.test.ts tests/int/ad-media.int.test.ts tests/int/mensagens.int.test.ts tests/int/ad-reports.int.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - typecheck 0 errors; the listed int files pass
    - `grep -n "\* 6" src/lib/classisex/service.ts src/lib/classisex/board.ts` prints nothing
    - `grep -c "authorTier" "src/app/(frontend)/(membros)/area-do-assinante/midia/[id]/[variante]/route.ts"` ≥ 1
  </acceptance_criteria>
  <done>Paying members see free and expired authors' ads with the cover only; nothing else of those ads is served to them; renewals restore everything.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN C — Ad limits by tier, server side (G-02, G-03, G-05 edit rule)                          -->
<!-- ============================================================================================ -->

<task type="auto" tdd="true">
  <name>C1: Enforce TIER_LIMITS in the ad-media hook, the service and the upload route; free accounts may create and edit ads</name>
  <files>src/collections/AdMedia.ts, src/lib/classisex/media-messages.ts, src/lib/classisex/service.ts, src/lib/classisex/actions.ts, src/app/(frontend)/(membros)/area-do-assinante/meus-anuncios/[id]/midia/route.ts, tests/int/ad-media.int.test.ts, tests/int/ads.int.test.ts, tests/unit/ad-rules.test.ts</files>
  <read_first>
    - src/collections/AdMedia.ts validateAndClean (count per kind on create)
    - src/lib/classisex/media-messages.ts (AD_MEDIA_MESSAGES, UploadErrorCode, UPLOAD_ERROR_MESSAGES, uploadCodeFor, CLIENT_MESSAGES)
    - src/lib/classisex/service.ts (createAd, updateAd, attachMedia, removeMedia, setCover, backToModeration)
    - src/lib/classisex/actions.ts (save → requireActiveSubscription; changeMedia; INACTIVE message)
    - the owner upload route (step 2 "active access now" returns `inativo`)
  </read_first>
  <behavior>
    - Hook: on create of an ad-media file, the limit is TIER_LIMITS[tier of the ad author] (accessStatusFor inside withRequestState, `now = new Date()`): free author + 2nd photo → APIError 'Conta gratuita: 1 foto por anúncio. Assine para enviar até 10 fotos e 2 vídeos.'; free author + any video → 'Conta gratuita não envia vídeos. Assine para enviar até 2 vídeos.'; paying author: 11th photo / 3rd video → existing messages. Same rule for staff uploads in /admin (I-3).
    - Counting for free authors uses ALL stored photos of the ad (an expired payer with 5 stored photos cannot add a 6th or replace by adding; they may Remover down to 0 and add 1) — I-1.
    - New UploadErrorCode values 'limite-fotos-gratis' and 'video-gratis' mapped by uploadCodeFor; UPLOAD_ERROR_MESSAGES texts end with 'Veja os planos em Assine Já.'
    - Service/actions: createAd, updateAd, attachMedia, removeMedia, setCover need a logged-in account (requireAssinante) — no longer an active subscription. ACTIVE_LIMIT 3 applies to both tiers (unchanged). Expired payers may edit (G-05) and their stored media are untouched by a text edit.
    - Upload route: the `inativo` early return is removed; a free account posting a video gets 303 `?midia=erro&codigo=video-gratis` WITHOUT the body being decoded by sharp/MP4 (check tier and existing counts before `request.formData()` when `tipo=video`, and before reading the file for a 2nd photo); content-length cap stays.
    - Server action replay: a free account replaying the paying create-with-media flow still gets each extra file refused by the route/hook (covered in Plan F e2e).
    - Unit: ad-rules keeps ACTIVE_LIMIT 3; new unit cases for uploadCodeFor mapping of the two new messages.
  </behavior>
  <action>
    RED first: int cases in ad-media.int.test.ts (free author: 1st photo ok, 2nd photo refused with the free message, video refused; paying author: 10 photos + 2 videos ok, 11th/3rd refused; expired payer with 3 stored photos: new photo refused, Remover 3 then 1 new photo ok; staff upload to a free author's ad refused on the 2nd photo) and ads.int.test.ts (free account createAd/updateAd ok; 4th active refused for free too; updateAd by an expired payer keeps the stored media count).
    GREEN: in AdMedia.validateAndClean replace the fixed MAX_AD_* comparison with TIER_LIMITS[tier] where tier = tierOf(await accessStatusFor(req.payload, authorId, new Date(), req)) — wrap the call in withRequestState like the existing nested calls. Keep AD_MEDIA_MESSAGES.fotos/videos for the paying limits and add `fotosGratis`, `videoGratis`. In actions.ts switch `save` and `changeMedia` to requireAssinante and drop the INACTIVE branch for ads (keep INACTIVE for denunciarAnuncio, which stays paying-only). In the upload route replace the `inativo` check by a cheap pre-check: compute tier; if `gratis` and (form tipo would be video → refuse; or the ad already has ≥ 1 photo → refuse) — read `tipo` from the query string `?tipo=` sent by both upload clients, falling back to the form field after parsing; add `tipo` to the query in AdMediaPicker/OwnerMediaManager in Plan E (until then the hook still refuses, so behaviour is correct either way).
    Commit `feat(conta-gratuita): photo and video limits by account tier`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/int/ad-media.int.test.ts tests/int/ads.int.test.ts tests/unit/ad-rules.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - the three test files pass
    - `grep -c "TIER_LIMITS" src/collections/AdMedia.ts` ≥ 1; in src/lib/classisex/actions.ts `requireActiveSubscription` is called only inside denunciarAnuncio (besides the import)
  </acceptance_criteria>
  <done>The server never stores more than the author's tier allows, whoever uploads and however the request is made.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN D — Public sign-up with e-mail verification (G-01)                                       -->
<!-- ============================================================================================ -->

<task type="auto" tdd="true">
  <name>D1: Assinantes verify, sign-up fields, migration with backfill, guard and sign-up service</name>
  <files>src/collections/Assinantes.ts, src/migrations/*_conta_gratuita.ts (+ .json, index.ts), src/payload-types.ts, src/lib/email/verify-account.ts, src/lib/assinantes/signup.ts, src/lib/assinantes/audit.ts (labels only, if needed), tests/int/cadastro.int.test.ts, tests/unit/verify-email.test.ts, tests/helpers/seed.ts</files>
  <read_first>
    - src/collections/Assinantes.ts (guardOperations, auth block, fields, auditAccount)
    - src/lib/assinantes/reset-email.ts and src/lib/email/password-reset.ts (pattern: neutral result, rate limit, background send, Portuguese text + HTML)
    - src/lib/email/config.ts (emailEnabled), src/lib/email/rate-limit.ts (allowAttempt)
    - node_modules/payload/dist/auth/baseFields/verification.js, auth/operations/verifyEmail.js, auth/sendVerificationEmail.js, collections/operations/create.js lines 60–90 and 270–340 (facts listed in context)
    - the latest migration file (format) and src/migrations/index.ts
  </read_first>
  <behavior>
    - auth.verify on: `generateEmailSubject` → 'Confirme seu e-mail - Paraíso Brasília'; `generateEmailHTML({ token, user })` → HTML from verify-account.ts linking to `${NEXT_PUBLIC_SERVER_URL}/cadastro/confirmar?token=…` (never /admin). Unit test: link, escaping of apelido, no token in the subject.
    - New fields (staff read-only, subscriber read own): `origem` select 'equipe' | 'cadastro' (default 'equipe', label 'Origem da conta'), `declaracao18Em` date, `termosAceitosEm` date (labels 'Declarou 18+ em', 'Aceitou Termos e Privacidade em'). The existing `apelido` is filled from the sign-up.
    - Guard: create allowed for staff, `trustedCreate`, or `context.selfSignup === true && emailEnabled()`. Staff and trustedCreate creates: `data._verified = true` and `args.disableVerificationEmail = true` (no verification e-mail, login works at once). Self sign-up: `_verified = false`, `origem = 'cadastro'`, dates from the server clock — any `_verified`/`origem`/`accessUntil` in the input is ignored.
    - Migration (`pnpm payload migrate:create conta_gratuita`): adds `_verified`, `_verification_token`, `origem` (enum, default 'equipe'), `declaracao18_em`, `termos_aceitos_em`; up() ends with `UPDATE assinantes SET _verified = true WHERE _verified IS NOT TRUE` (otherwise the JWT strategy logs every existing account out); down() drops them. Int test: an account created before the migration logs in and `payload.auth` accepts its token after.
    - signup.ts (no 'server-only'; takes payload, input, ip, now): `signUp` returns 'enviado' | 'limite' | 'fechado' | { errors } — 'fechado' when !emailEnabled() (nothing created); validation: e-mail format, senha ≥ 8 (MIN_PASSWORD_LENGTH), apelido via the existing `recadoApelidoError` (≤ 40, no contact), `maior18` and `termos` both checked, honeypot field empty; limits: 5/hour per IP and 3/hour per e-mail (allowAttempt keys 'cadastro-ip:', 'cadastro-email:'). Existing e-mail: verified → no change, send "você já tem uma conta" mail (links to /entrar and /esqueci-senha); unverified → update password/apelido/dates, new `_verificationToken` (crypto.randomBytes(20).toString('hex')), send the verify mail (I-5). Unknown → create with `context.selfSignup`. Same 'enviado' answer in the three cases; sends run in the background like reset-email.ts. Lazy cleanup: delete up to 50 `origem = cadastro AND _verified = false AND createdAt < now − 7 days` accounts on each call (context skipAudit).
    - `resendVerification(email, ip)`: same limits (keys 'verificar-*'), neutral answer, only for unverified accounts. `confirmEmail(token)` → payload.verifyEmail; returns 'ok' | 'invalido'.
    - Audit: self sign-up writes 'conta-criada' with summary 'Conta criada pelo cadastro do site: …' (writeAudit with no staff user — check writeAudit accepts a null actor; if not, add the system actor the reset flow uses).
    - Int (cadastro.int.test.ts): REST POST /api/assinantes and /api/assinantes/first-register without staff → 403; Local API create without context → Forbidden; signUp with e-mail off (stub env) → 'fechado' and 0 accounts; signUp ok → account `_verified false`, origem 'cadastro', dates set, verification mail captured (EMAIL_CAPTURE_DIR temp dir), login throws UnverifiedEmail, confirmEmail(token) → login ok; duplicate verified e-mail → 'enviado', password unchanged; duplicate unverified → password replaced, new token, old token invalid; 6th attempt from same IP → 'limite'; staff create → `_verified true`, no mail captured; seedAssinante accounts log in.
  </behavior>
  <action>
    Follow the behavior list. Keep `access.create: isStaff` on the collection (REST stays closed); the self sign-up path is the Local API with `overrideAccess: true` and `context: { selfSignup: true }` from the server action only, and the guard re-checks emailEnabled(). Update tests/helpers/seed.ts only if seeds need `_verified` explicitly (the guard should already set it for trustedCreate — prove it with the int test instead of patching seeds). Regenerate types (`pnpm generate:types`) and the import map if admin components changed. Run the whole int suite once: every existing int test logs subscribers in, so a missing backfill or guard bug shows up at once.
    Commit `feat(conta-gratuita): self sign-up service with e-mail verification`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm exec vitest run tests/unit/verify-email.test.ts tests/int/cadastro.int.test.ts tests/int/assinantes-auth.int.test.ts tests/int/passwords.int.test.ts && pnpm test:int</automated>
  </verify>
  <acceptance_criteria>
    - all int tests pass (whole suite), proving existing/seeded accounts still authenticate with verify on
    - the migration file contains `_verified = true` in up()
    - `grep -c "selfSignup" src/collections/Assinantes.ts` ≥ 1 and `grep -c "first-register" tests/int/cadastro.int.test.ts` ≥ 1
  </acceptance_criteria>
  <done>Accounts can be created by the public only through the rate-limited, e-mail-gated service; staff and existing accounts are unaffected.</done>
</task>

<task type="auto" tdd="true">
  <name>D2: /cadastro, /cadastro/confirmar and the /entrar changes</name>
  <files>src/app/(frontend)/cadastro/page.tsx, src/app/(frontend)/cadastro/confirmar/page.tsx, src/lib/assinantes/actions.ts, src/app/(frontend)/entrar/page.tsx, src/components/assinantes/PlanComparison.tsx, src/lib/seo/sitemap.ts (exclude), src/app/robots.ts (only if /cadastro needs a rule), tests/e2e/cadastro.spec.ts</files>
  <read_first>
    - src/app/(frontend)/entrar/page.tsx and esqueci-senha/page.tsx (layout, FormField, error/notice pattern, WhatsApp fallback)
    - src/lib/assinantes/actions.ts (entrar: error mapping; pedirNovaSenha: IP extraction)
    - src/components/assinantes/FormField.tsx, src/app/(frontend)/assine-ja/page.tsx (tone)
    - src/lib/site/queries getContact; src/lib/seo/metadata buildPageMetadata
  </read_first>
  <behavior>
    - /cadastro (noindex, per request, redirects to /area-do-assinante when logged in): title 'Criar conta grátis'; fields E-mail, Senha (mín. 8), Apelido (como você aparece no site; nunca o nome verdadeiro), checkbox 'Tenho 18 anos ou mais', checkbox 'Li e aceito os Termos de Uso e a Política de Privacidade' (links open in the same tab), hidden honeypot; works without JS (plain form + server action `cadastrar`). Below the form: the PlanComparison block (G-06) and 'Já tem conta? Entrar'.
    - E-mail off: the page shows 'O cadastro pelo site está fechado no momento. Fale com a equipe pelo WhatsApp.' with the WhatsApp link and NO form; the action called directly (replay) returns the same closed state and creates nothing.
    - After submit: '/cadastro?enviado=1' → 'Enviamos um link para o seu e-mail. Abra o link para ativar a conta (vale por 7 dias). Não recebeu? Reenviar link' (resend form posts `reenviarConfirmacao`). Errors show per field; '?erro=limite' → 'Muitas tentativas. Tente de novo em 1 hora.'
    - /cadastro/confirmar?token=… (noindex, `referrer: no-referrer` metadata): shows a button 'Confirmar meu e-mail' (POST server action with the token as hidden field; avoids link scanners and keeps the token out of logs of later requests) → redirect '/entrar?confirmado=1' showing 'E-mail confirmado. Entre com seu e-mail e senha.'; invalid/used token → 'Link inválido ou já usado.' + resend form.
    - /entrar: link 'Criar conta grátis' → /cadastro (only when emailEnabled()); the action maps payload's UnverifiedEmail error to '?erro=nao-confirmado' → 'Confirme seu e-mail antes de entrar. Enviamos o link quando você criou a conta.' + resend form. (Payload checks verification only after the password matched, so this message does not reveal accounts to someone without the password.)
    - Default landing after login stays `next` or /area-do-assinante.
    - PlanComparison (server component, content from TIER_COMPARISON): a two-column table 'Grátis' × 'Assinante' with the G-06 rows, a caption, and a primary 'Assine Já' link to /assine-ja; props `signupLink?: boolean` (adds 'Criar conta grátis' → /cadastro) and `headingLevel`. Accessible table markup (th scope), readable on 360 px.
    - e2e cadastro.spec.ts (both projects): full flow — sign up, read the captured mail JSON in test-results/emails, open /cadastro/confirmar, confirm, log in, land on the members home as 'Conta gratuita'; login before confirming shows the nao-confirmado message; duplicate e-mail gives the same screen; 18+ or termos unchecked → field errors and no account (check via staff REST); honeypot filled → neutral screen, no account; REST create anonymous → 403; comparison table visible on /cadastro.
  </behavior>
  <action>
    Build the two pages and the three actions (`cadastrar`, `reenviarConfirmacao`, `confirmarEmail`) on top of signup.ts; IP extraction identical to pedirNovaSenha. Do not add /cadastro to the main nav (the menu order is pinned by tests and the desktop width is tight — see A1); reach it from /entrar, /assine-ja, PlanComparison and the members panels. Keep /cadastro out of sitemap.xml (members-type page) and noindex. Write cadastro.spec.ts; clean its accounts in afterAll through staff REST.
    Commit `feat(conta-gratuita): /cadastro with 18+ and consent, e-mail confirmation, login message`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec playwright test tests/e2e/cadastro.spec.ts tests/e2e/assinante-login.spec.ts tests/e2e/esqueci-senha.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - the three e2e files pass in both projects
    - `curl`-equivalent check inside the spec: GET /cadastro has `noindex` and /sitemap.xml has no '/cadastro'
  </acceptance_criteria>
  <done>A visitor can create and activate a free account alone; when e-mail is off, sign-up is visibly closed.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN E — Members UI by tier, comparison block, staff panel (G-02, G-06, staff tier)           -->
<!-- ============================================================================================ -->

<task type="auto" tdd="true">
  <name>E1: Members pages for free accounts: Meus anúncios, Novo/Editar anúncio with tier limits, panels with Assine Já</name>
  <files>src/app/(frontend)/(membros)/area-do-assinante/page.tsx, .../meus-anuncios/page.tsx, .../meus-anuncios/novo/page.tsx, .../meus-anuncios/[id]/editar/page.tsx, src/components/classisex/InactivePanel.tsx, src/components/classisex/AdForm.tsx, src/components/classisex/AdMediaPicker.tsx, src/components/classisex/OwnerMediaManager.tsx, src/components/classisex/OwnerAdCard.tsx, src/lib/classisex/media-messages.ts (CLIENT_MESSAGES by limits), tests/e2e/conta-gratuita.spec.ts, tests/e2e/meus-anuncios.spec.ts, tests/e2e/anuncio-midia.spec.ts, tests/e2e/anuncio-midia-criacao.spec.ts</files>
  <read_first>
    - the four members pages listed, InactivePanel, SubscriptionStatus
    - AdForm, AdMediaPicker (hydration gate, per-file XHR to …/midia), OwnerMediaManager, OwnerAdCard (canEdit)
    - tests/e2e/meus-anuncios.spec.ts, anuncio-midia.spec.ts, anuncio-midia-criacao.spec.ts (assertions on 'Fora do ar', inactive editing and limits)
  </read_first>
  <behavior>
    - Members home: free account → 'Sua conta: Conta gratuita' + short text 'Você pode publicar até 3 anúncios com 1 foto cada. Para ver os anúncios dos outros, contatos, mensagens e recados, assine.' + links 'Meus anúncios' and PlanComparison; paying → unchanged SubscriptionStatus. Expired payer sees the 'venceu em …' panel AND the free-account explanation.
    - Meus anúncios: everyone logged in sees 'Novo anúncio' (limit 3 active); PlanComparison under the list for free accounts (G-06); the status line for an approved ad of a free author: 'Publicado como conta gratuita (só a capa aparece)'; the old 'Fora do ar: assinatura vencida' text is gone.
    - Novo anúncio: free → AdForm with photo picker limited to 1 and no video picker, the note 'Conta gratuita: 1 foto e nenhum vídeo. Assinantes enviam até 10 fotos e 2 vídeos.' and PlanComparison (G-06); paying → today's form (10/2). Limits come from TIER_LIMITS via props (`limits: { fotos, videos }`), and CLIENT_MESSAGES become functions of the limits (no hard-coded 10/2 in the client).
    - Editar anúncio: free owner can edit text and media; OwnerMediaManager shows every file; files with `guardada` get the label 'Guardada: volta a aparecer quando você assinar' and keep Remover; the photo upload form is hidden when the ad already has ≥ 1 photo (text: 'Conta gratuita: 1 foto por anúncio.'), the video upload form is replaced by 'Vídeos só para assinantes' + Assine Já link. Upload clients add `?tipo=foto|video` to the route URL (C1 pre-check).
    - InactivePanel (used by ClassiSex board/detail, recados, mensagens, contos): for 'sem-assinatura' → title 'Disponível para assinantes', text 'Com a conta gratuita você publica seus anúncios em Meus anúncios. Assine para ver todos os anúncios com contatos, mandar mensagens e ler os recados.', PlanComparison and links 'Assine Já' and 'Meus anúncios'; for vencida/encerrada → today's SubscriptionStatus plus the same comparison. Still no restricted markup or query before the panel (T-04-05).
    - e2e conta-gratuita.spec.ts (both projects): free account (staff-created without periods, or via the cadastro helper) creates an ad with 1 photo in the create flow; picker refuses a 2nd photo client-side with the 1-photo message; no video input exists; posting a video straight to the route → 'video-gratis' notice; Meus anúncios shows the comparison; board/recados/mensagens pages show 'Disponível para assinantes' + Assine Já; staff approve → a paying viewer sees the ad with 1 photo, contacts and no 'Enviar mensagem'; the visitor preview /classisex shows it blurred. Liberar the free account → it can add photos up to 10 and a video; end the period → owner sees 'Guardada' labels and the paying viewer sees only the cover; liberar again → all back.
    - Update the existing specs that asserted inactive owners cannot create/edit or saw 'Fora do ar' (expected new texts above).
  </behavior>
  <action>
    Pages read tier with getAccessStatus + tierOf (never from the client). Pass limits to AdForm/AdMediaPicker as props; keep progressive enhancement (pickers only after hydration). Reuse PlanComparison from D2. Keep every page `force-dynamic` and noindex. Write conta-gratuita.spec.ts with sentinel texts, and update the three existing specs. Commit `feat(conta-gratuita): members pages, pickers and panels by tier with the comparison block`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec playwright test tests/e2e/conta-gratuita.spec.ts tests/e2e/meus-anuncios.spec.ts tests/e2e/anuncio-midia.spec.ts tests/e2e/anuncio-midia-criacao.spec.ts tests/e2e/classisex-assinante.spec.ts tests/e2e/recados.spec.ts tests/e2e/mensagens.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - listed specs pass in both projects
    - `grep -rn "Fora do ar: assinatura vencida" src tests` prints nothing
    - `grep -rn "PlanComparison" src/app` lists cadastro, meus-anuncios, meus-anuncios/novo and assine-ja (assine-ja lands in E2)
  </acceptance_criteria>
  <done>Free users understand what they can do and what paying adds, wherever they hit a limit.</done>
</task>

<task type="auto">
  <name>E2: /assine-ja comparison and steps; staff panel shows tier, origin and e-mail confirmation</name>
  <files>src/app/(frontend)/assine-ja/page.tsx, src/collections/Assinantes.ts (virtual/list fields only), src/components/admin/assinantes/ContaCell.tsx (new, if a custom cell is needed), src/components/admin/classisex/ModeracaoPanel.tsx, src/app/(payload)/admin/importMap.js (generated), tests/e2e/assine-ja.spec.ts, tests/e2e/painel-assinatura.spec.ts, tests/int/staff-actions.int.test.ts</files>
  <read_first>
    - src/app/(frontend)/assine-ja/page.tsx ('Como assinar' steps)
    - src/collections/Assinantes.ts admin config (defaultColumns, listSearchableFields), src/components/admin/assinantes/AssinaturaPanel.tsx
    - src/components/admin/classisex/ModeracaoPanel.tsx and getModerationView (contaAutor from B2)
    - tests/e2e/assine-ja.spec.ts, painel-assinatura.spec.ts
  </read_first>
  <behavior>
    - /assine-ja: PlanComparison (with signupLink) above the plans; 'Como assinar' becomes: 1. Crie sua conta grátis (link /cadastro) — ou entre, se já tem. 2. Escolha o plano e pague pelo link do PagBank. 3. Envie o comprovante pelo WhatsApp com o e-mail da sua conta. 4. A equipe libera a assinatura na sua conta (sem senha nova). Keep the WhatsApp/Entrar buttons. When e-mail is off, step 1 reads 'Envie seu nome e e-mail pelo WhatsApp; a equipe cria sua conta.' (old flow).
    - Admin Assinantes list: columns name, email, 'Conta' (virtual text: 'Assinante até dd/mm/aaaa' when accessUntil > now, else 'Gratuita'), 'Origem' (Equipe / Cadastro no site), 'E-mail confirmado' (Sim/Não), updatedAt; filterable by origem. The edit view sidebar shows the same three facts read-only. Virtual fields never stored, never writable, readable by staff only (subscribers reading their own account through REST must not gain new data beyond their own).
    - Staff can mark an account's e-mail as confirmed from the panel (a checkbox 'E-mail confirmado' mapped to `_verified`, staff-only update) for people who cannot receive the mail — audited as 'conta-editada' (FIELD_LABELS 'e-mail confirmado').
    - Moderação panel of an ad shows 'Conta do anunciante: Conta gratuita — no ClassiSex aparece só a capa, sem vídeos.' or 'Assinante'.
    - Tests: assine-ja.spec checks the comparison and the 4 steps; painel-assinatura.spec opens the list and sees 'Gratuita' for a staff-created account without periods and 'Assinante até' after Liberar; int staff-actions: staff toggles e-mail confirmado → audit row.
  </behavior>
  <action>
    Prefer Payload `virtual: true` fields with afterRead hooks for 'Conta' (computed with the São Paulo date label helper used elsewhere) — if the list column cannot show a virtual field in 3.91, use a `ui` field with a custom Cell component (generate the import map). The `_verified` base field is hidden in the admin (`Field: false`): expose a separate staff-only checkbox UI that writes `_verified` through an existing staff endpoint pattern (src/lib/assinantes/endpoints.ts) rather than un-hiding Payload's internal field. Commit `feat(conta-gratuita): Assine Já steps and tier in the staff panel`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run tests/int/staff-actions.int.test.ts tests/int/audit-log.int.test.ts && pnpm exec playwright test tests/e2e/assine-ja.spec.ts tests/e2e/painel-assinatura.spec.ts tests/e2e/moderacao.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - listed tests pass; the admin list shows the Conta column for a seeded free account (asserted in painel-assinatura.spec)
  </acceptance_criteria>
  <done>Staff see who is free, who pays, where the account came from and whether the e-mail is confirmed.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN F — Leak matrices, docs, full gate                                                       -->
<!-- ============================================================================================ -->

<task type="auto" tdd="true">
  <name>F1: Tier leak matrix and updated Phase 4/5 matrices</name>
  <files>tests/e2e/conta-gratuita-seguranca.spec.ts, tests/e2e/helpers/conta-gratuita.ts, tests/e2e/classisex-seguranca.spec.ts, tests/e2e/midia-protegida.spec.ts, tests/e2e/fase5-seguranca.spec.ts (only if its expired-author ad assumptions break), tests/e2e/helpers/classisex.ts</files>
  <read_first>
    - tests/e2e/classisex-seguranca.spec.ts (scenario, fetchAs, RSC header checks, 'an ad disappears from the open preview…' test)
    - tests/e2e/midia-protegida.spec.ts ("ending the author's access hides the media…")
    - tests/e2e/helpers/classisex.ts and fase5.ts (sentinels, server-action capture/replay helper)
  </read_first>
  <behavior>
    Scenario (helper conta-gratuita.ts, sentinels in every text/contact): PAGO (active) with an approved ad of 3 photos + 1 video; GRATIS (no periods, verified) with an approved 1-photo ad; EXPIRADO (ended period) with an approved ad of 3 photos + 1 video stored while paying; VIEWER (active).
    - Free viewer (GRATIS logged in) — pages: /area-do-assinante/classisex, /classisex/{PAGO ad}, /classisex/{EXPIRADO ad}, /recados, /mensagens, /mensagens/nova?origem=anuncio&id=… → panel text, and none of PAGO's/EXPIRADO's texts, contacts, apelidos or media ids in HTML; same with the RSC header (`RSC: 1`) payloads.
    - Free viewer — media route: every variant of every PAGO/EXPIRADO file → 403 and no bytes; own files → 200 (owner).
    - Free viewer — REST: GET /api/ads, /api/ads/{id}, /api/ad-media, /api/ad-media/file/{name}, /api/assinantes (only own doc, no tier/other fields of others), /api/recados, /api/messages, /api/conversations → no foreign docs; POST /api/ad-media and /api/ads → 403.
    - Free viewer — server actions replay: iniciarConversa / responderMensagem / denunciarAnuncio / recado post → nothing created (counts unchanged via staff REST).
    - Free owner limits replay: POST a 2nd photo and a video to its own /meus-anuncios/{id}/midia → refused codes, media count stays 1 (staff REST).
    - Paying viewer on EXPIRADO's ad: board and detail HTML/RSC contain exactly one media URL (the cover); cover miniatura/foto → 200; other photos (all variants) and the video (including a `Range: bytes=0-` request) → 404; public preview shows the blurred cover and /classisex/previa/{non-cover photo} → 404. Liberar EXPIRADO → all 4 files 200 again (same ids, no re-upload).
    - Paying viewer on GRATIS's ad: 1 photo, contacts present, no 'Enviar mensagem'; starting a conversation by replaying the action → error 'destinatarioInativo', nothing created.
    - Unverified account: login refused with the nao-confirmado message; a forged cookie is not possible to obtain — assert that payload `/api/assinantes/me` with no cookie returns user null (control) and that the account never appears in any member listing.
    - Anonymous: /cadastro form posts with e-mail off cannot be tested in e2e (capture dir is on) — covered by D1 int; here assert REST create/first-register 403.
    - Update classisex-seguranca 'an ad disappears from the open preview as soon as its author's access ends' → 'stays in the open preview with the same blurred cover after the author's access ends'; midia-protegida "ending the author's access hides the media" → cover-only + renewal restores. Phase 5 matrix: recados of an expired author still disappear (unchanged) — keep; adjust only assertions about that author's ADS.
  </behavior>
  <action>
    Write the helper and the spec reusing fetchAs and the fase5 replay helper; one describe per principal like the Phase 4/5 matrices. Rewrite the two Phase 4 tests named above; run the three Phase 4/5 security specs. If the matrix finds a gap in application code, fix it under Rule 2 and list it in the summary. Commit `test(conta-gratuita): tier leak matrix; Phase 4 expiry tests follow G-05`.
  </action>
  <verify>
    <automated>pnpm exec playwright test tests/e2e/conta-gratuita-seguranca.spec.ts tests/e2e/classisex-seguranca.spec.ts tests/e2e/midia-protegida.spec.ts tests/e2e/fase5-seguranca.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - the four security specs pass in both projects
    - `grep -c "test(" tests/e2e/conta-gratuita-seguranca.spec.ts` ≥ 10
  </acceptance_criteria>
  <done>Free accounts provably cannot see other people's ads, contacts or media through any surface, and expired payers' ads provably expose only the cover.</done>
</task>

<task type="auto">
  <name>F2: Staff guide, runbook, decision records, full gate</name>
  <files>docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md, tests/unit/deploy-files.test.ts, tests/e2e/staging-smoke.spec.ts, .planning/REQUIREMENTS.md, .planning/PROJECT.md, .planning/STATE.md, .planning/phases/03-assinantes-e-controle-de-acesso/03-CONTEXT.md, .planning/phases/04-classisex-e-pr-vias-de-perfis/04-CONTEXT.md, .planning/quick/2026-10-20-conta-gratuita/SUMMARY.md</files>
  <read_first>
    - docs/painel/GUIA-DA-EQUIPE.md (sections Assinantes, ClassiSex, Problemas comuns; tone), docs/deploy/STAGING.md (sections 7.x and 11 e-mail)
    - tests/unit/deploy-files.test.ts, tests/e2e/staging-smoke.spec.ts
  </read_first>
  <behavior>
    - Unit deploy-files: GUIA has '## Contas gratuitas' with headings 'Grátis e Assinante', 'Cadastro pelo site', 'E-mail não chegou', 'Liberar assinatura de quem já tem conta', 'Vencimento: o anúncio continua como gratuito'; mentions 'só a capa' and 'Guardada'; STAGING.md has '7.5', 'conta_gratuita', 'SMTP_USER' and 'cadastro fechado'.
    - Staging smoke (read-only, E2E_BASE_URL only): /cadastro → 200 noindex with either the form (H1 'Criar conta grátis') or the closed message; /assine-ja contains 'Grátis' and 'Assinante'; POST /api/assinantes anonymous → not 2xx.
  </behavior>
  <action>
    GUIA (pt, passo a passo): what each tier can do (the table); people now create their own account at /cadastro — to liberate, search the account by e-mail in Assinantes → Assinatura → Liberar (no new account, no password by WhatsApp); 'E-mail não chegou' (check spam; staff can tick 'E-mail confirmado'); free ads still go through the same moderation queue (Conta do anunciante shown in Moderação); on expiry ads stay as free with only the cover; extra photos/videos are kept and return on renewal; to take someone off the ClassiSex use Despublicar or Excluir a conta (Encerrar the subscription no longer hides ads). Add a draft paragraph for Termos/Política (account creation, apelido, e-mail, 18+ declaration and consent dates, deletion of unconfirmed accounts after 7 days) marked [VALIDAR] for the lawyer — staff paste it in Páginas (seeds never overwrite staff text).
    STAGING.md '### 7.5 Conta gratuita': migration `*_conta_gratuita` (adds verification columns and marks every existing account as confirmed — check with journalctl that it ran before telling the client); /cadastro is open only while SMTP_USER/SMTP_PASS are set in .env.staging (otherwise 'cadastro fechado'); rate limits are in memory (restart clears); no new volume.
    Planning docs: REQUIREMENTS.md new section 'Conta gratuita' with CONTA-01 (cadastro com 18+, termos e e-mail confirmado), CONTA-02 (limites por plano: grátis 1 foto/0 vídeo, assinante 10/2, 3 ativos), CONTA-03 (grátis vê só os próprios anúncios; anúncios grátis aprovados aparecem para assinantes e na prévia; no vencimento só a capa), CONTA-04 (comparativo Grátis × Assinante) mapped to this quick task; ASS-04 note 'conteúdo restrito; anúncios continuam como gratuitos (G-05)'; INST-04 unchanged. 03-CONTEXT D-01 and 04-CONTEXT D-06 get an 'Atualização 2026-10-20 (conta gratuita)' line pointing here. PROJECT.md Key Decisions row 'Conta gratuita com cadastro aberto'. STATE.md Quick Tasks table row (also add the missing rows for classisex-midia-na-criacao and email-hostinger if still absent).
    Run the full gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` with .env aside. Write SUMMARY.md (gate numbers, deviations, decisions taken under I-1..I-5). Restore mount-rewritten binaries, commit `docs(conta-gratuita): staff guide, runbook, requirements`. Do NOT push: deploy goes with the 05-12 deploy/checkpoint (see F3).
  </action>
  <verify>
    <automated>pnpm exec vitest run tests/unit/deploy-files.test.ts && pnpm typecheck && pnpm lint && pnpm test</automated>
  </verify>
  <acceptance_criteria>
    - full `pnpm test` exits 0 and `pnpm build` exits 0 (numbers in SUMMARY.md)
    - GUIA contains '## Contas gratuitas'; REQUIREMENTS.md contains 'CONTA-01' … 'CONTA-04'
  </acceptance_criteria>
  <done>Staff can run free accounts alone; the decision trail is updated; everything is green and committed locally.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>F3: Client check on staging (run together with 05-12 Task 2)</name>
  <what-built>Open sign-up with e-mail confirmation, free accounts (1 photo, own ads only), paying accounts unchanged, ads of expired payers kept as free with cover only, comparison block, tier in the staff panel.</what-built>
  <how-to-verify>
    Pre-condition: the orchestrator pushed master:main (05-12 Task 1 + this quick task) and the VPS ran the migrations; SMTP is configured in .env.staging.
    1. Phone, private window: https://novo.swingbrasilia.com.br/cadastro → see the Grátis × Assinante table → create an account with a real e-mail → open the e-mail → Confirmar → Entrar. Area shows 'Conta gratuita'.
    2. Meus anúncios → Novo anúncio: only 1 photo can be chosen, no video; send. ClassiSex/Recados/Mensagens show 'Disponível para assinantes' and Assine Já.
    3. Staff: Assinantes list shows the new account as 'Gratuita · Cadastro no site · e-mail confirmado: Sim'; Moderação shows 'Conta do anunciante: Conta gratuita'; Aprovar.
    4. A paying test subscriber sees the free ad with 1 photo and its contacts, and no 'Enviar mensagem'. Visitor /classisex shows it blurred.
    5. Staff: Liberar 30 days on the free account → it can add up to 10 photos and 2 videos. Encerrar/let it end → the paying viewer sees only the cover; owner sees 'Guardada'. Liberar again → all back.
    6. Answer the open questions listed in the report (I-1 edit rule, encerrada accounts, contos line in the table, 7-day cleanup, Termos/Política text with the lawyer).
    Delete the test accounts afterwards.
  </how-to-verify>
  <resume-signal>Type "aprovado" or list what to change, with the answers to item 6</resume-signal>
  <files>.planning/quick/2026-10-20-conta-gratuita/SUMMARY.md</files>
  <action>Wait for the client; record answers in SUMMARY.md and STATE.md; behaviour changes become follow-up quick tasks.</action>
  <verify>Client reply recorded in SUMMARY.md</verify>
  <done>Client approved on staging or change list recorded.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| visitor → /cadastro server action | untrusted input creates accounts and triggers outgoing e-mail |
| e-mail link → /cadastro/confirmar | bearer token in a URL |
| free account → members pages, RSC, REST, media route, server actions | authenticated but not entitled to others' content |
| paying viewer → media of free/expired authors | entitled to the cover only |
| staff → assinantes create | must stay verified, no e-mail |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-CG-01 | Information disclosure | free viewer on board/detail/RSC | mitigate | pages keep requireActiveSubscription and return the panel before any query (T-04-05 pattern); F1 asserts HTML and RSC for sentinels |
| T-CG-02 | Information disclosure | media route, extra media of free/expired authors | mitigate | canViewMedia gets authorTier (accessStatusFor per request) + isCover (coverOf from DB order); videos/extra photos 404 incl. Range; F1 matrix |
| T-CG-03 | Information disclosure | previa route enumeration of non-cover photos | mitigate | previa serves only coverOf(photos) of an approved ad (B2) |
| T-CG-04 | Information disclosure | account enumeration via sign-up/resend/login | mitigate | identical 'enviado' screen for new/unverified/verified e-mails; mails sent in background; UnverifiedEmail only after a correct password (Payload order) |
| T-CG-05 | Spoofing / Elevation | anonymous REST create / first-register / self-set `_verified`, `origem`, `accessUntil` | mitigate | collection access.create stays isStaff; guard allows only `context.selfSignup` from the server action and forces `_verified=false`, `origem=cadastro`; accessUntil is staff-only (T-03-06); D1 int tests |
| T-CG-06 | Denial of service / abuse | mass sign-ups, e-mail bombing via resend | mitigate | allowAttempt 5/h per IP, 3/h per e-mail (sign-up and resend), honeypot, lazy cleanup of unverified accounts; ads of free accounts still go through moderation (D-03) |
| T-CG-07 | Availability | turning on auth.verify logs out every existing account (`_verified` null fails the JWT strategy) | mitigate | migration backfills `_verified = true`; guard sets it for staff/trusted creates; whole int suite must pass (D1); runbook check after deploy |
| T-CG-08 | Tampering | free owner bypassing photo/video limits (direct route POST, replayed create-with-media, admin) | mitigate | limits in the AdMedia hook by author tier (last line), pre-check in the route before decoding, F1 replay tests |
| T-CG-09 | Information disclosure | verification token in URL / referrer / link scanners | mitigate | token used only via POST button on /cadastro/confirmar, `referrer: no-referrer`, noindex; single use (Payload clears it on verify); a new sign-up replaces it |
| T-CG-10 | Takeover | attacker pre-registers a victim's e-mail | mitigate | unverified accounts cannot log in; a later sign-up by the real owner replaces password and token (I-5); verified accounts are never modified by sign-up |
| T-CG-11 | Repudiation (LGPD) | consent to 18+ and Termos | mitigate | `declaracao18Em`, `termosAceitosEm`, `origem` stored server-side; audit row 'Conta criada pelo cadastro do site' |
| T-CG-12 | Information disclosure | browser cache of media after expiry | accept | media route sends `private, max-age=600`: the owner of a viewing device may keep a file up to 10 min after the author's expiry; same window as today's cache, documented |
| T-CG-13 | Availability | in-memory rate limit cleared on restart | accept | single container; same choice as the reset flow (email-hostinger quick) |
</threat_model>

<verification>
- Plan A: full suite green before feature work (A1).
- Each plan: its listed tests green, `pnpm typecheck` 0 errors.
- Plan F: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest + Playwright, mobile + desktop), `pnpm build` with .env aside — all green; numbers in SUMMARY.md.
- Source coverage: G-01 → D1, D2, E2, F2; G-02 → B1, C1, E1, F1; G-03 → C1, E1; G-04 → B1, B2, E1, F1; G-05 → B1, B2, C1 (I-1), E1, F1; G-06 → D2 (component), E1, E2; staff tier → E2; guide/runbook → F2; Phase 5 gate → A1.
</verification>

<success_criteria>
A visitor creates and confirms a free account alone, publishes an ad with one photo and sees only their own ads; a paying member sees every approved ad (free ones with one photo) with contacts; an expired payer's ad keeps only its cover until renewal; the comparison block explains the difference on the four required pages; staff see each account's tier; no free account can reach other people's ads, contacts or media through any surface (F1 matrix green).
</success_criteria>

<output>
Create `.planning/quick/2026-10-20-conta-gratuita/SUMMARY.md` when done (gate numbers, commits per plan, deviations, I-1..I-5 as applied, client answers after F3).
</output>
