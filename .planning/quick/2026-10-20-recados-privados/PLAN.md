---
type: quick
slug: recados-privados
date: 2026-10-20
priority: high (client request)
autonomous: false
depends_on: ["05-11", "quick 2026-10-20-conta-gratuita", "05-12 Tasks 1-2 (docs + smoke commits; run BEFORE the 05-12 client checkpoint)"]
requirements: [REC-01, REC-02, REC-03, REC-04, PREV-02, PREV-04, CONTA-02]
decisions: [R-01, R-02, R-03, R-04, R-05, R-06, R-07, R-08]
plans: 4 (A → B → C → D, strictly sequential: shared files mensagens/*, nav, tests/e2e/helpers/*)
migration: none (no schema change; Plan B Task B2 proves it with `migrate:create --skip-empty`)
files_modified:
  - src/lib/mensagens/rules.ts
  - src/lib/mensagens/service.ts
  - src/lib/mensagens/queries.ts
  - src/lib/mensagens/actions.ts
  - src/components/mensagens/EnviarMensagemLink.tsx (renamed → EnviarRecadoLink.tsx)
  - src/components/mensagens/UnreadBadge.tsx
  - src/components/mensagens/BlockReportPanel.tsx
  - src/components/mensagens/MessageForm.tsx
  - src/components/mensagens/ThreadView.tsx
  - src/components/classisex/InactivePanel.tsx
  - src/components/classisex/PublicAdCard.tsx
  - src/app/(frontend)/(membros)/layout.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/mensagens/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/mensagens/nova/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/mensagens/[id]/page.tsx
  - src/app/(frontend)/(membros)/area-do-assinante/recados/page.tsx (deleted)
  - src/app/(frontend)/recados/page.tsx (deleted)
  - src/app/(frontend)/classisex/page.tsx
  - src/app/(frontend)/assine-ja/page.tsx
  - src/app/(frontend)/cadastro/page.tsx
  - src/app/(payload)/admin/importMap.js (regenerated)
  - next.config.ts
  - src/lib/assinantes/tier.ts
  - src/lib/site/nav.ts
  - src/components/Footer.tsx
  - src/lib/seo/sitemap.ts
  - src/lib/cache/expire.ts (comment)
  - src/collections/Recados.ts
  - src/collections/Assinantes.ts (expire tag + admin label only)
  - src/collections/Subscriptions.ts (expire tag only)
  - src/collections/MessageReports.ts (admin group/labels only)
  - src/collections/Conversations.ts, Messages.ts, Blocks.ts (admin group label only)
  - src/components/admin/classisex/FilaClassisex.tsx
  - src/lib/recados/{actions,board,dto,endpoints,public,queries,service,visibility}.ts (deleted; rules.ts stays)
  - src/components/recados/{RecadoCard,RecadoForm,OwnRecadoCard}.tsx (deleted)
  - src/components/admin/recados/RecadoModeracaoPanel.tsx (deleted)
  - tests/** (each task lists its own)
  - docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md
  - .planning/REQUIREMENTS.md, .planning/STATE.md, .planning/phases/05-recados-mensagens-e-contos/05-VALIDATION.md

must_haves:
  truths:
    - "An active subscriber's Recados page (/area-do-assinante/mensagens, labelled Recados) lists only conversations where they are participant A or B; a third active subscriber gets 404 (HTML and RSC) for a thread between two others and never sees it in their list"
    - "There is no mural anywhere: no page, component, query or markup lists recados from other people; /recados answers 308 to /assine-ja and /area-do-assinante/recados answers 308 to /area-do-assinante/mensagens"
    - "On a ClassiSex ad, 'Enviar recado' is shown only when the ad author is an active (paying) subscriber, the viewer is active and is not the author; on a free author's ad a paying viewer sees the note and no button; the compose URL for a free author's ad shows the note and no form"
    - "A free account cannot send: the members pages show the Assine Já panel, the compose page shows no form, and a replayed iniciarConversa/responderMensagem server action with a free session creates nothing"
    - "Nobody can send a recado to a non-paying advertiser, by UI, typed URL or replayed action (server canSend: destinatarioInativo)"
    - "The open ClassiSex preview shows a locked 'Enviar recado' on every card linking to /assine-ja, with no information about which advertisers pay"
    - "Block, report, 'Pessoa menor de idade' auto-suspension, daily limits and the unread counter work exactly as before; the counter sits next to the single 'Recados' item of the members menu"
    - "Staff no longer see a Recados moderation queue (dashboard line or menu); message reports stay reachable from the dashboard line 'Recados: N denúncias abertas'"
    - "The old recados table is untouched (no migration), hidden from the admin, staff-only by REST, never rendered publicly or to members, and still deleted with the author's account"
    - "Menu, footer and sitemap have no /recados; Vitest + Playwright (both projects) are green; typecheck, lint and build pass"
  artifacts:
    - path: "src/components/mensagens/EnviarRecadoLink.tsx"
      provides: "'Enviar recado' link (unlocked) for ads"
      contains: "Enviar recado"
    - path: "src/components/classisex/PublicAdCard.tsx"
      provides: "locked 'Enviar recado' upsell on every public card"
      contains: "Enviar recado"
    - path: "next.config.ts"
      provides: "308 redirects /recados and /area-do-assinante/recados"
      contains: "redirects"
    - path: "tests/e2e/recados-privados.spec.ts"
      provides: "privacy + button matrix for private recados (replaces recados.spec.ts, moderacao-recados.spec.ts and the recados part of previas.spec.ts)"
    - path: "tests/int/recados-legado.int.test.ts"
      provides: "legacy recados table hidden/closed/cascaded (replaces recados.int and recado-moderation.int)"
  key_links:
    - from: "src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx"
      to: "MemberAdDTO.autorGratuito + isOwnAd"
      via: "show EnviarRecadoLink only when !autorGratuito && !own"
      pattern: "EnviarRecadoLink"
    - from: "src/lib/mensagens/queries.ts getComposeTarget"
      to: "src/lib/mensagens/service.ts canSend"
      via: "new state 'indisponivel' before rendering the form"
      pattern: "indisponivel"
    - from: "src/lib/mensagens/service.ts resolveTarget"
      to: "findVisibleAdDoc only (no recados import)"
      via: "origem 'anuncio' only"
      pattern: "findVisibleAdDoc"
---

# Quick: recados privados (R-01..R-08)

<objective>
Apply the client's request of 2026-10-20 (CONTEXT.md, decisions R-01..R-08, default "UNIFICAR"): the public/members mural of
recados ends; "Recados" becomes the user-facing name of the existing private conversations (today "Mensagens"), which already
list only the conversations a person sent or received. The ad button becomes "Enviar recado", shown only between paying
subscribers; free accounts see it locked as an upsell. Mural pages, the public teaser, the moderation queue and the menu/sitemap
entries go away; old URLs redirect; the old `recados` table is kept untouched and hidden (no migration).

Purpose: nobody sees recados that are not theirs; recados become a private paying-member feature attached to paying ads.
Output: 4 sequential plans (A–D). Each plan ends with its own tests green and one or two commits. Plan D ends with the client
checkpoint (merged into the 05-12 client check when both are pending).

Fallback (only if the client objects to R-01): "Manter separados" — one-way short recado to a paying advertiser, moderated,
visible only to sender and recipient; needs a new plan.
</objective>

<execution_context>
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/workflows/execute-plan.md
@/mnt/attach/project-files/paraiso-site/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/2026-10-20-recados-privados/CONTEXT.md
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/05-recados-mensagens-e-contos/05-CONTEXT.md
@.planning/phases/05-recados-mensagens-e-contos/05-09-SUMMARY.md
@.planning/phases/05-recados-mensagens-e-contos/05-10-SUMMARY.md
@.planning/phases/05-recados-mensagens-e-contos/05-11-SUMMARY.md
@.planning/quick/2026-10-20-conta-gratuita/CONTEXT.md
@.planning/quick/2026-10-20-conta-gratuita/SUMMARY.md

## Before starting

- Another session is executing 05-12 in this repo (commit 4bf9737 put "Recados: em revisão" in the staff guide and runbook).
  Start only when `git status` is clean and `git log -1` shows no 05-12 docs/smoke work in flight; pull in its commits. If
  `tests/e2e/staging-smoke.spec.ts` (05-12) asserts /recados, the mural or the text "Mensagens", update it in Plan C.
- Never read `/mnt/project-files/private`.

## Code facts the executor needs (read 2026-10-20 at 4bf9737)

- Private messaging already satisfies R-03: `src/lib/mensagens/service.ts` `listInbox` filters `participantA = me OR
  participantB = me`; `getThread` is participant-only (404 otherwise); `canSend(payload, { senderId, recipientId, now })` returns
  `'suspenso' | 'voceBloqueou' | 'bloqueado' | 'remetenteInativo' | 'destinatarioInativo' | null` (both sides must be
  `accessStatusFor(...).state === 'ativa'`); `startConversation` / `sendMessage` call it; collections `conversations`,
  `messages`, `blocks` have REST closed for everybody and `admin.hidden`; `message-reports` is staff-only.
- `resolveTarget(payload, { origem: 'anuncio' | 'recado', id, viewerId, now })` → `Target | { error: 'propria' } | null`.
  The `'recado'` branch uses `findVisibleRecadoDoc` from `src/lib/recados/board.ts` — the ONLY reason mensagens imports recados.
- `getComposeTarget(me, origem, id, ownApelido)` in `src/lib/mensagens/queries.ts` → `{state:'nao-encontrado'|'propria'|'existente'|'novo'}`.
  It does NOT call `canSend`, so today a paying viewer who types `/area-do-assinante/mensagens/nova?anuncio=<free author's ad>`
  gets a form that fails only on submit (I-2 fixes this).
- `iniciarConversa` in `src/lib/mensagens/actions.ts` reads `origem` (`'recado'` or anything else → `'anuncio'`), `alvo`,
  `texto`, `apelido`; `BASE = '/area-do-assinante/mensagens'`.
- `/area-do-assinante/mensagens/page.tsx` imports `parseRecadoPage` from `src/lib/recados/board.ts` (move it: Plan B).
- Ad page `src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx`: `requireActiveSubscription` (free/expired
  viewer → `InactivePanel`, never the ad); `canReport = !(await isOwnAd(...))`; shows `EnviarMensagemLink origem="anuncio"` when
  `canReport && !ad.autorGratuito`, else the note "Conta gratuita: use os contatos do anúncio." `MemberAdDTO.autorGratuito`
  comes from `tierFromAccessUntil(author.accessUntil)`.
- `EnviarMensagemLink({ origem, id })` → `/area-do-assinante/mensagens/nova?${origem}=${id}`, label "Enviar mensagem". Also used
  by `src/components/recados/RecadoCard.tsx` (deleted in Plan B).
- Members sub-nav `src/app/(frontend)/(membros)/layout.tsx` `LINKS`: Minha assinatura, ClassiSex, Recados
  (`/area-do-assinante/recados`), Mensagens (`/area-do-assinante/mensagens`, `badge: true`), Contos, Meus anúncios, Trocar senha.
- `PublicAdCard` (`src/components/classisex/PublicAdCard.tsx`) renders `PublicAdDTO` (apelido, euSou, blurred cover) and an
  "Assine para ver" button to /assine-ja. `PublicAdDTO` has NO tier field — keep it that way (I-1, T-RP-05).
- Public nav `src/lib/site/nav.ts` line ~31 `{ href: '/recados', label: 'Recados' }`; footer `src/components/Footer.tsx` line ~70;
  sitemap `src/lib/seo/sitemap.ts` line ~30. `tests/e2e/modelos.spec.ts:82` pins the 10-item menu order; `tests/e2e/shell.spec.ts`
  lines 16/50/67 assert the Recados link; `tests/unit/sitemap.test.ts:26` lists '/recados'.
- Recados collection `src/collections/Recados.ts`: `admin.group 'Recados e mensagens'`, access all `isStaff`, `endpoints:
  recadoEndpoints` (from `src/lib/recados/endpoints.ts`), a `ui` field `moderacao` whose Field component is
  `/components/admin/recados/RecadoModeracaoPanel#RecadoModeracaoPanel` (listed in `src/app/(payload)/admin/importMap.js`),
  hooks `normaliseAndRedact`, `guardModeration`, `computeDerived`, `afterChange/afterDelete expire(['recados'])`. Imports only
  `src/lib/recados/rules.ts` + redact + expire + endpoints. `rules.ts` is also used by `Assinantes.ts` and `signup.ts`
  (`recadoApelidoError`) — KEEP rules.ts.
- Admin dashboard `src/components/admin/classisex/FilaClassisex.tsx`: line "Recados: N para aprovar" (`countPendingRecados`
  from `src/lib/recados/service.ts`) and line "Mensagens: N denúncias abertas · M urgentes" (`getMessageReportCounts`).
- Audit enum `src/lib/assinantes/audit.ts` has `recado-aprovado|recusado|despublicado` — DO NOT remove (enum change = migration).
- Cache tags are plain strings (`expire(['ads','recados'])` in Assinantes.ts:220 and Subscriptions.ts:124/131); dropping
  `'recados'` is cosmetic.
- Redirect mechanism: none yet in next.config.ts (only `headers()`); `src/proxy.ts` is the CSRF guard only.
- Tests that mention recados (grep `-il recado tests`): unit `recado-rules` (keep), `recado-teaser` (replace), `sitemap`, `tier`,
  `deploy-files`; int `recados`, `recado-moderation` (replace), `mensagens` (recado origin cases at ~118-126 and ~182);
  e2e `recados`, `moderacao-recados` (replace), `previas` (recados tests at 46/74/94 replace; 85 keep), `fase5-seguranca`,
  `mensagens` (test at 138 uses a recado origin), `conta-gratuita`, `conta-gratuita-seguranca`, `shell`, `modelos`; helpers
  `tests/e2e/helpers/api.ts` (createRecado/aprovarRecado/recusarRecado/despublicarRecado/findRecados),
  `tests/e2e/helpers/fase5.ts` (Ana's approved sentinel recado), `tests/helpers/seed.ts` (seedRecado/seedVisibleRecado,
  RESET_ORDER 'recados'). 63 lines across e2e mention "Mensagens"/"Enviar mensagem".
- Gate commands (every prior plan): `pnpm typecheck`, `pnpm lint`, `pnpm test` (vitest + playwright, projects mobile and
  desktop, one worker), `pnpm build` with `.env` moved aside. `.env` in this clone is a directory: for Payload CLI commands
  export `.env.test` first (`set -a; . ./.env.test; set +a`). After a run, restore mount-rewritten binaries with
  `git checkout -- public src/app tests/fixtures docs/screens 2>/dev/null` before committing.
</context>

<interfaces>
Changed contracts (Plan A defines them; B and C build on them):

- `src/lib/mensagens/rules.ts` `MENSAGEM_MESSAGES` (same keys, recado wording, I-3):
  vazio 'Escreva o recado.'; longa 'O recado pode ter até 2.000 caracteres.'; remetenteInativo 'Sua assinatura não está
  ativa. Renove para mandar recados.'; destinatarioInativo 'Esta pessoa está sem assinatura ativa e não recebe recados agora.';
  propria 'Este anúncio é seu.'; limiteConversas 'Você já começou 20 conversas hoje. Tente amanhã.' (unchanged);
  limiteMensagens 'Você enviou muitos recados hoje. Tente amanhã.'; semApelido 'Escolha um apelido para mandar recados.';
  bloqueado 'Não é possível mandar recados para esta pessoa.'; voceBloqueou 'Você bloqueou esta pessoa. Desbloqueie para
  voltar a conversar.' (unchanged); suspenso 'Seu envio de recados foi suspenso pela equipe. Fale com a casa pelo WhatsApp.'
  New export `RECADO_ANUNCIO_GRATUITO = 'Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.'`
- `ComposeTarget` gains `{ state: 'indisponivel'; message: string }` — returned by `getComposeTarget` when
  `canSend(me → recipient)` is non-null and there is no existing conversation; message = `RECADO_ANUNCIO_GRATUITO` for
  `destinatarioInativo`, else `MENSAGEM_MESSAGES[code]`. (If an existing conversation exists, keep redirecting to it: the thread
  page already shows the reason when sending fails.)
- `EnviarRecadoLink({ id }: { id: number })` → `<Link href={`/area-do-assinante/mensagens/nova?anuncio=${id}`}>Enviar recado</Link>`
  (same classes as today). Plan A keeps an optional `origem` prop only while RecadoCard still exists; Plan B removes it.
- After Plan B: `resolveTarget(payload, { id, viewerId, now })` and `StartInput` without `origem` (anúncio only);
  `getComposeTarget(me, id, ownApelido)`. `iniciarConversa` ignores any `origem` field.
- Members sub-nav after Plan B: `{ href: '/area-do-assinante/mensagens', label: 'Recados', badge: true }` replaces both the old
  Recados and Mensagens items (same position as the old Recados item).
</interfaces>

<tasks>

<!-- ============================================================================================ -->
<!-- PLAN A — Contract and labels: private conversations become "Recados"                          -->
<!-- ============================================================================================ -->

<task type="auto" tdd="true">
  <name>A1: Service contract — recado wording, compose 'indisponivel', paying-only rule pinned by tests</name>
  <files>src/lib/mensagens/rules.ts, src/lib/mensagens/queries.ts, src/lib/mensagens/service.ts (only if a helper is needed for getComposeTarget), tests/unit/mensagens-rules.test.ts, tests/int/mensagens.int.test.ts</files>
  <read_first>
    - src/lib/mensagens/rules.ts, src/lib/mensagens/queries.ts (getComposeTarget), src/lib/mensagens/service.ts lines 78-160 and 225-310
    - tests/unit/mensagens-rules.test.ts, tests/int/mensagens.int.test.ts (seed helpers, NOW pinning)
    - tests/helpers/seed.ts (seedAssinante with/without an active period; seedAd)
  </read_first>
  <behavior>
    - Unit: MENSAGEM_MESSAGES has the exact strings in <interfaces>; no value contains "mensagem"/"mensagens" (case-insensitive); RECADO_ANUNCIO_GRATUITO exported with the exact text.
    - Int (new describe "recados privados — quem pode mandar", per R-02/R-04): (1) active A → approved ad of active B: startConversation succeeds; (2) active A → approved ad of FREE B (no period): throws code 'destinatarioInativo'; nothing created in conversations/messages; (3) FREE A → ad of active B: throws 'remetenteInativo'; nothing created; (4) expired A → same; (5) A → own ad: 'propria'; (6) a conversation A↔B is not returned by listInbox for C and getThread(C, id) is null (R-03).
    - Int for getComposeTarget logic: for a free author's ad and no existing conversation the result is { state: 'indisponivel', message: RECADO_ANUNCIO_GRATUITO }; for an active author it is 'novo'. Because getComposeTarget calls getPayload({config}), extract the pure part into a service function `composeTargetFor(payload, { me, id, ownApelido, now })` in service.ts (returns ComposeTarget) and make getComposeTarget a thin wrapper; test composeTargetFor.
  </behavior>
  <action>
    Write the tests first (RED), then change rules.ts strings per I-3 and add RECADO_ANUNCIO_GRATUITO. Move the ComposeTarget type and logic into service.ts as composeTargetFor (keep `origem` parameter in Plan A: the recado origin is removed in Plan B), adding the canSend check described in <interfaces> (only when there is no existing conversation). queries.ts getComposeTarget calls it with `new Date()`. Do not change any collection, any access rule or canSend itself — the server-side paying-only rule already exists; these tests pin it. Update existing assertions in tests/int/mensagens.int.test.ts and tests/unit/mensagens-rules.test.ts that compare old strings. Commit: `feat(recados-privados): recado wording and compose blocked for non-paying advertisers`.
  </action>
  <verify>
    <automated>pnpm exec vitest run tests/unit/mensagens-rules.test.ts tests/int/mensagens.int.test.ts tests/int/mensagens-seguranca.int.test.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - The unit test asserts no MENSAGEM_MESSAGES value matches /mensage[mn]/i (a test, not a grep: the file has code identifiers with that word)
    - New int cases (1)-(6) and the composeTargetFor cases pass; mensagens-seguranca.int still passes unchanged
  </acceptance_criteria>
  <done>Server rules for private recados are pinned by tests; compose for a free advertiser returns 'indisponivel'.</done>
</task>

<task type="auto">
  <name>A2: Members UI — "Recados" labels, "Enviar recado" only between paying members, compose note, locked copy</name>
  <files>src/components/mensagens/EnviarRecadoLink.tsx (git mv from EnviarMensagemLink.tsx), src/components/recados/RecadoCard.tsx (import rename only), src/components/mensagens/UnreadBadge.tsx, src/components/mensagens/BlockReportPanel.tsx, src/components/mensagens/MessageForm.tsx, src/components/mensagens/ThreadView.tsx, src/app/(frontend)/(membros)/area-do-assinante/classisex/[id]/page.tsx, src/app/(frontend)/(membros)/area-do-assinante/mensagens/page.tsx, src/app/(frontend)/(membros)/area-do-assinante/mensagens/nova/page.tsx, src/app/(frontend)/(membros)/area-do-assinante/mensagens/[id]/page.tsx, src/components/classisex/InactivePanel.tsx, src/lib/assinantes/tier.ts, src/app/(frontend)/(membros)/area-do-assinante/page.tsx, src/app/(frontend)/assine-ja/page.tsx, src/app/(frontend)/cadastro/page.tsx, tests/unit/tier.test.ts, tests/e2e/mensagens.spec.ts, tests/e2e/bloqueio-denuncia.spec.ts, tests/e2e/conta-gratuita.spec.ts, tests/e2e/conta-gratuita-seguranca.spec.ts, tests/e2e/fase5-seguranca.spec.ts, tests/e2e/helpers/fase5.ts</files>
  <read_first>
    - every file in <files> (pages listed in "Code facts")
    - `grep -rn "Enviar mensagem\|Mensagens\|mensagens não lidas\|Nova mensagem\|Mensagem para" tests/e2e` to find string assertions to update
  </read_first>
  <action>
    Per R-02/R-04/I-2/I-3:
    (1) `git mv` EnviarMensagemLink.tsx → EnviarRecadoLink.tsx, export `EnviarRecadoLink`, label "Enviar recado"; keep an optional `origem` prop defaulting to 'anuncio' only until Plan B (RecadoCard still passes 'recado').
    (2) Ad page: show `<EnviarRecadoLink id={ad.id} />` only when `canReport && !ad.autorGratuito` (unchanged condition = owner paying, viewer active because the page already requires active access, viewer not owner); the free-author note becomes `RECADO_ANUNCIO_GRATUITO`.
    (3) Compose page /mensagens/nova: eyebrow "Recados", h1 "Novo recado" / "Recado para {apelido}", link "Voltar para Recados", metadata title "Novo recado"; handle `target.state === 'indisponivel'` with an alert paragraph showing `target.message` and NO MessageForm.
    (4) Inbox page: h1/metadata "Recados"; empty state heading "Nenhum recado ainda.", body "Para mandar um recado, abra um anúncio do ClassiSex e toque em Enviar recado. Aqui aparecem só os recados que você mandou ou recebeu.", single action "Ver ClassiSex" (drop "Ver recados"). Add a one-line note under the h1: "Só você e a outra pessoa veem cada conversa." (R-03).
    (5) Thread page: eyebrow/back link "Recados"; ThreadView "Ver recados anteriores", `aria-label="Recados"`; MessageForm label "Recado"; BlockReportPanel "A pessoa não poderá mais mandar recados para você…"; UnreadBadge aria-label "N recados não lidos" (keep 99+ logic).
    (6) Copy: InactivePanel (free) "…Assine para ver todos os anúncios com contatos e mandar e receber recados."; area-do-assinante/page.tsx free-tier paragraph "…contatos e recados, assine."; assine-ja and cadastro: replace "mensagens e recados" / "os recados dos assinantes" with "recados privados entre assinantes"; TIER_COMPARISON row item 'Recados (conversas privadas)', gratis 'não', assinante 'manda e recebe' (update tests/unit/tier.test.ts).
    (7) Do NOT touch the members sub-nav, routes, collections or the mural yet (Plan B). Update every e2e string assertion found by the grep (mensagens, bloqueio-denuncia, conta-gratuita*, fase5 helper that clicks "Enviar mensagem"); do not delete any test. In conta-gratuita-seguranca "on a free advertiser's ad … no Enviar mensagem" assert no "Enviar recado" and the new note; in "typing the compose URL for a free advertiser creates no message" additionally assert the page shows RECADO_ANUNCIO_GRATUITO and has no textarea.
    Commit: `feat(recados-privados): private conversations are called Recados; Enviar recado only between paying members`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run tests/unit && pnpm exec playwright test tests/e2e/mensagens.spec.ts tests/e2e/bloqueio-denuncia.spec.ts tests/e2e/conta-gratuita.spec.ts tests/e2e/conta-gratuita-seguranca.spec.ts tests/e2e/fase5-seguranca.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rn "Enviar mensagem" src | grep -v '^\S*:\s*//' | grep -v '^\S*:\s*\*'` returns nothing
    - `test -f src/components/mensagens/EnviarRecadoLink.tsx && ! test -f src/components/mensagens/EnviarMensagemLink.tsx`
    - The listed specs pass in mobile and desktop
  </acceptance_criteria>
  <done>Members see "Recados" for their private conversations; the ad button reads "Enviar recado" and appears only for paying ↔ paying, non-owner.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN B — Remove the mural (public teaser, members board, moderation queue), redirects         -->
<!-- ============================================================================================ -->

<task type="auto">
  <name>B1: Public side — drop /recados teaser, menu/footer/sitemap entries; 308 redirects; locked "Enviar recado" on public cards</name>
  <files>src/app/(frontend)/recados/page.tsx (delete), next.config.ts, src/lib/site/nav.ts, src/components/Footer.tsx, src/lib/seo/sitemap.ts, src/components/classisex/PublicAdCard.tsx, src/app/(frontend)/classisex/page.tsx, src/components/contos/AssineJaCta.tsx (doc comment only), tests/unit/sitemap.test.ts, tests/e2e/shell.spec.ts, tests/e2e/modelos.spec.ts, tests/e2e/previas.spec.ts, tests/e2e/classisex-publico.spec.ts</files>
  <read_first>
    - next.config.ts, src/lib/site/nav.ts, src/components/Footer.tsx, src/lib/seo/sitemap.ts, src/components/classisex/PublicAdCard.tsx
    - tests/e2e/previas.spec.ts, tests/e2e/shell.spec.ts, tests/e2e/modelos.spec.ts (line 82), tests/unit/sitemap.test.ts, tests/e2e/classisex-publico.spec.ts
  </read_first>
  <action>
    Per R-05/R-08/I-1:
    (1) Delete src/app/(frontend)/recados/page.tsx. Add `async redirects()` to next.config.ts returning `{ source: '/recados', destination: '/assine-ja', permanent: true }` and `{ source: '/area-do-assinante/recados', destination: '/area-do-assinante/mensagens', permanent: true }` (fixed destinations, no params: no open redirect). The members page file is deleted in B2; Next applies config redirects before the filesystem, so adding both now is safe.
    (2) Remove the Recados item (and its PREV-02 comment) from getNavItems, the footer link and the sitemap entry. Update modelos.spec.ts:82 to the 9-item order ['Festas','Quem somos','Espaço','Modelos','ClassiSex','Contos','Contato','Assine Já','Área do assinante'] with the comment "Recados removed 2026-10-20 (quick recados-privados, R-08)"; shell.spec.ts asserts there is NO Recados link in footer/menu/nav; sitemap.test.ts asserts '/recados' is absent.
    (3) PublicAdCard: under "Assine para ver", add a secondary locked link on EVERY card (no tier input, I-1): href "/assine-ja", visible text "Enviar recado", a lock glyph with `aria-hidden`, and `aria-label="Enviar recado: só para assinantes"`; small helper line "Recados privados só entre assinantes." Do not add any field to PublicAdDTO. Public /classisex AssineJaCta text becomes "Assinantes veem texto, cidade, fotos, vídeos e contatos, mandam recados privados e anunciam também."
    (4) previas.spec.ts: replace the three recados tests (lines ~46, ~74, ~94) with: (a) `GET /recados` with `maxRedirects: 0` → 308 and `location` ends with `/assine-ja`; following it lands on /assine-ja with status 200; (b) `GET /area-do-assinante/recados` maxRedirects 0 → 308 to `/area-do-assinante/mensagens`; (c) every PublicAdCard on /classisex has the locked "Enviar recado" link to /assine-ja, the count of locked links equals the number of cards, and the public HTML/RSC contain no "/area-do-assinante/mensagens/nova" URL. Keep the "every public preview has an Assine Já link" test, removing /recados from its URL list. Fix classisex-publico.spec.ts locators if the new link makes a `getByRole('link', { name: 'Assine…' })` ambiguous.
    Commit: `feat(recados-privados): no public recados page; old URLs redirect; locked Enviar recado on the open ClassiSex`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run tests/unit/sitemap.test.ts && pnpm exec playwright test tests/e2e/previas.spec.ts tests/e2e/shell.spec.ts tests/e2e/modelos.spec.ts tests/e2e/classisex-publico.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `test ! -e "src/app/(frontend)/recados"`; `grep -c "/recados" src/lib/site/nav.ts src/components/Footer.tsx src/lib/seo/sitemap.ts` prints 0 for each
    - `grep -c "permanent: true" next.config.ts` ≥ 2
    - `grep -n "tier\|gratuito\|accessUntil" src/components/classisex/PublicAdCard.tsx` returns nothing
  </acceptance_criteria>
  <done>No public mural or teaser; old public URL redirects; open ClassiSex invites to subscribe to send recados without revealing who pays.</done>
</task>

<task type="auto">
  <name>B2: Members and admin side — delete the board and moderation, hide the legacy collection, single "Recados" menu item, prove no migration</name>
  <files>src/app/(frontend)/(membros)/area-do-assinante/recados/page.tsx (delete), src/app/(frontend)/(membros)/layout.tsx, src/app/(frontend)/(membros)/area-do-assinante/mensagens/page.tsx, src/app/(frontend)/(membros)/area-do-assinante/mensagens/nova/page.tsx, src/lib/mensagens/{service,queries,actions}.ts, src/components/mensagens/EnviarRecadoLink.tsx, src/lib/recados/{actions,board,dto,endpoints,public,queries,service,visibility}.ts (delete), src/components/recados/* (delete), src/components/admin/recados/RecadoModeracaoPanel.tsx (delete), src/collections/Recados.ts, src/collections/{Conversations,Messages,Blocks,MessageReports}.ts (admin group/labels), src/collections/Assinantes.ts, src/collections/Subscriptions.ts, src/lib/cache/expire.ts, src/components/admin/classisex/FilaClassisex.tsx, src/app/(payload)/admin/importMap.js, tests/int/recados-legado.int.test.ts (new), tests/int/recados.int.test.ts + tests/int/recado-moderation.int.test.ts + tests/unit/recado-teaser.test.ts + tests/e2e/recados.spec.ts + tests/e2e/moderacao-recados.spec.ts (delete, replaced), tests/int/mensagens.int.test.ts, tests/e2e/mensagens.spec.ts, tests/e2e/conta-gratuita.spec.ts, tests/e2e/helpers/api.ts, tests/helpers/seed.ts</files>
  <read_first>
    - src/collections/Recados.ts (whole file), src/components/admin/classisex/FilaClassisex.tsx, src/app/(frontend)/(membros)/layout.tsx
    - tests/int/recados.int.test.ts and tests/int/recado-moderation.int.test.ts (to carry over the still-valid assertions: REST staff-only, cascade on account delete, redaction on staff write)
    - tests/e2e/mensagens.spec.ts test at ~138 ("a recado starts another conversation…")
  </read_first>
  <behavior>
    - tests/int/recados-legado.int.test.ts (replaces recados.int + recado-moderation.int, R-06): (1) collection 'recados' still in config with `admin.hidden === true`, no `endpoints` beyond Payload defaults (no path matching /aprovar|recusar|despublicar|moderacao/), and no field named 'moderacao'; (2) Local API with overrideAccess:false as an anonymous user and as an active subscriber returns 0 docs and refuses create/update/delete; staff can read; (3) staff create still stores the text redacted (contacts → placeholder) — carry over from recados.int; (4) deleting an Assinantes doc deletes their recados (carry over).
  </behavior>
  <action>
    Per R-01/R-05/R-06/R-07:
    (1) Delete the members recados page (redirect from B1 covers the URL). Sub-nav LINKS: replace the Recados and Mensagens items with one `{ href: '/area-do-assinante/mensagens', label: 'Recados', badge: true }` at the old Recados position.
    (2) Drop the recado origin: resolveTarget/StartInput/composeTargetFor/getComposeTarget lose `origem` (anúncio only); remove the `findVisibleRecadoDoc` import; `iniciarConversa` stops reading `origem`; the compose page reads only `?anuncio=`; when the URL has `?recado=` (old link) or no `anuncio`, `redirect('/area-do-assinante/mensagens')` instead of 404 (R-05). Inline a local `parsePage` (same rules as parseRecadoPage: integer ≥ 1, default 1) in mensagens/page.tsx or move it to src/lib/mensagens/rules.ts. EnviarRecadoLink loses the `origem` prop.
    (3) Delete src/lib/recados/{actions,board,dto,endpoints,public,queries,service,visibility}.ts, src/components/recados/*, src/components/admin/recados/RecadoModeracaoPanel.tsx. KEEP src/lib/recados/rules.ts (Assinantes.ts, signup.ts and the collection hooks use it) and tests/unit/recado-rules.test.ts.
    (4) Recados.ts: `admin.hidden: true`, `admin.group: 'Recados'`, description "Mural antigo, desativado em 20/10/2026. Dados guardados, sem tela." ; remove `endpoints` and the `moderacao` ui field; remove `expire(['recados'])` hooks; KEEP every data field, every hook that validates/redacts/guards, `access` all isStaff, RECADO_STATUS_OPTIONS and the audit enum values (no schema change). Conversations/Messages/Blocks/MessageReports: `admin.group: 'Recados'`; MessageReports labels "Denúncia de recado"/"Denúncias de recados". Assinantes.ts: drop 'recados' from the expire tags; admin label of `apelido` "Apelido nos recados"; keep the recados cascade delete. Subscriptions.ts: drop 'recados' from expire tags. expire.ts: remove the 'recados' line from the comment.
    (5) FilaClassisex: remove countPendingRecados, recadosQueue and the "Recados: N para aprovar" paragraph; the message-report line reads "Nenhuma denúncia de recado." / "Recados: N denúncia(s) aberta(s) · M urgente(s)" with the same link.
    (6) `set -a; . ./.env.test; set +a; pnpm generate:importmap && pnpm generate:types` (types should not change except removed endpoints; commit whatever is generated). Then prove no schema change: `pnpm payload migrate:create recados_privados --skip-empty` must create NO file (`git status --porcelain src/migrations` empty). If a file appears, a schema-affecting change slipped in: revert that change, do not commit a migration.
    (7) Tests: write tests/int/recados-legado.int.test.ts (behavior above) first; then delete tests/int/recados.int.test.ts, tests/int/recado-moderation.int.test.ts, tests/unit/recado-teaser.test.ts, tests/e2e/recados.spec.ts, tests/e2e/moderacao-recados.spec.ts (each replaced: by recados-legado.int here and by recados-privados.spec in Plan C — list every deleted test title and its replacement in the summary). mensagens.int: rewrite the recado-origin cases (~118-126, ~182) as ad-origin cases (second approved ad of the same author reuses the pair's conversation); the old origin can no longer be expressed in the types, which typecheck enforces. mensagens.spec.ts test at ~138: rewrite as "the same person from a second ad reuses the existing thread" (seed a second approved ad for Ana). conta-gratuita.spec.ts:125: replace '/area-do-assinante/recados' by '/area-do-assinante/mensagens' (the 308 itself is tested in B1). api.ts: remove aprovarRecado/recusarRecado/despublicarRecado; keep createRecado/findRecados (legacy-data tests in Plan C). seed.ts: keep seedRecado and RESET_ORDER 'recados'; remove seedVisibleRecado if unused.
    Commit: `feat(recados-privados): mural and moderation queue removed; legacy recados hidden; one Recados menu item`.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm exec vitest run && pnpm exec playwright test tests/e2e/mensagens.spec.ts tests/e2e/conta-gratuita.spec.ts tests/e2e/bloqueio-denuncia.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `ls src/lib/recados` prints only `rules.ts`; `test ! -e "src/app/(frontend)/(membros)/area-do-assinante/recados"`; `test ! -e src/components/recados`
    - `grep -rn "lib/recados/" src | grep -v "recados/rules"` returns nothing
    - `grep -n "hidden: true" src/collections/Recados.ts` matches; `grep -c "RecadoModeracaoPanel" "src/app/(payload)/admin/importMap.js"` prints 0
    - `git status --porcelain src/migrations` is empty after the migrate:create check
    - `grep -c "para aprovar" src/components/admin/classisex/FilaClassisex.tsx` equals the ads-only count (no recados line)
  </acceptance_criteria>
  <done>No mural code remains; the legacy table is hidden and closed; members have one "Recados" item with the unread number; no migration.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN C — Privacy matrix for private recados                                                   -->
<!-- ============================================================================================ -->

<task type="auto">
  <name>C1: tests/e2e/recados-privados.spec.ts + fase5-seguranca update, then the full gate</name>
  <files>tests/e2e/recados-privados.spec.ts (new), tests/e2e/helpers/recados-privados.ts (new, scenario), tests/e2e/fase5-seguranca.spec.ts, tests/e2e/helpers/fase5.ts, tests/e2e/staging-smoke.spec.ts (only if 05-12 added recados/mural checks)</files>
  <read_first>
    - tests/e2e/fase5-seguranca.spec.ts and tests/e2e/helpers/fase5.ts (scenario, SENTINELS, captureReply / server-action replay helper)
    - tests/e2e/helpers/conta-gratuita.ts and tests/e2e/conta-gratuita-seguranca.spec.ts (free-account scenario, fetchAs)
    - tests/e2e/helpers/api.ts, tests/e2e/helpers/assinante.ts (loginAsAssinante)
  </read_first>
  <action>
    Scenario helper (staff REST + real UI for conversations, like fase5.ts): ANA (active, approved ad), BETO (active, approved ad), CAIO (active, no ad), GABI (free, approved ad with 1 photo), FELIPE (free, no ad); plus a legacy approved recado by ANA created with `api.createRecado` with sentinel text 'RECADO-LEGADO-SENTINELA' and a phone. BETO writes to ANA through the real UI ("Enviar recado" on Ana's ad) with sentinel 'CONVERSA-ANA-BETO-SENTINELA'; ANA replies.
    Tests (both projects; each one asserts HTML and, where a page, the RSC payload with header `RSC: 1`):
    1. Ana and Beto each see the conversation in Recados; the unread number appears for Ana next to the single "Recados" sub-nav item and clears after opening.
    2. Caio (third paying member): Recados list does not contain the sentinel or Ana/Beto's apelidos-as-conversation; GET of the thread URL → 404 page (HTML) and no sentinel in RSC; replaying Beto's reply action with Caio's cookie creates nothing (message count unchanged via staff-only check helper used in fase5).
    3. Button matrix on /area-do-assinante/classisex/[id]: Beto on Ana's ad → "Enviar recado" visible, href `/area-do-assinante/mensagens/nova?anuncio=<id>`; Ana on her own ad → absent; Beto on Gabi's (free) ad → absent and RECADO_ANUNCIO_GRATUITO text present; Gabi (free) on Ana's ad → InactivePanel, no ad text, no "Enviar recado" unlocked link.
    4. Free sender: Gabi and Felipe opening `/area-do-assinante/mensagens/nova?anuncio=<Ana's ad>` get the Assine Já panel and no textarea; replaying `iniciarConversa` (captured from Beto's real send to Ana, replayed with Gabi's cookie, same alvo = Ana's ad) creates no conversation.
    5. Non-paying advertiser: Beto opening the compose URL for Gabi's ad sees the note and no form; replaying `iniciarConversa` with alvo = Gabi's ad id and Beto's cookie returns the destinatarioInativo message and creates nothing.
    6. No mural anywhere: for anonymous, Felipe, Caio and Ana, the pages /, /classisex, /assine-ja, /area-do-assinante, /area-do-assinante/mensagens contain neither 'RECADO-LEGADO-SENTINELA', the legacy apelido, "Mural" nor a link to /recados or /area-do-assinante/recados; `/recados` and `/area-do-assinante/recados` answer 308 (maxRedirects 0) to the R-05 destinations; `/area-do-assinante/mensagens/nova?recado=<legacy id>` as Ana redirects to the Recados list and creates nothing.
    7. REST: /api/recados returns no docs for anonymous and for Ana's session and refuses POST; staff GET still works (legacy data kept, R-06); POST /api/recados/<id>/aprovar as staff → 404 (endpoint gone); /api/conversations and /api/messages give nothing to anyone, including staff (unchanged T-05-09).
    8. Admin (desktop project only, staff login): the dashboard has no "para aprovar" line for recados and shows "Recados:" or "Nenhuma denúncia de recado."; the admin nav has no link to /admin/collections/recados; /admin/collections/message-reports still opens.
    9. Sitemap: no '/recados'.
    Update fase5-seguranca.spec.ts so it no longer expects the mural: anonymous REST test keeps /api/recados closed; staff test keeps "recados are readable" (legacy data); replace "public previews carry no recado apelido…" with "no public surface carries the legacy recado sentinel" (or delete it only if test 6 above covers it 1:1 — say so in the summary); "when Ana's access ends her teaser disappears and nobody can write to her" becomes "when Ana's access ends nobody can send her a recado and her ad shows no Enviar recado". fase5.ts helper: the conversation is started via "Enviar recado"; the recado sentinel stays as legacy data.
    Then run the full gate: `pnpm typecheck`, `pnpm lint`, `pnpm test` (all, both projects), `pnpm build` with `.env` moved aside. Fix test drift found anywhere (labels, menu counts); application regressions are fixed under Rule 1 and listed. Restore mount-rewritten binaries before committing.
    Commit: `test(recados-privados): privacy matrix for private recados; fase5 leak matrix without the mural`.
  </action>
  <verify>
    <automated>pnpm exec playwright test tests/e2e/recados-privados.spec.ts tests/e2e/fase5-seguranca.spec.ts && pnpm typecheck && pnpm lint && pnpm test</automated>
  </verify>
  <acceptance_criteria>
    - recados-privados.spec.ts has tests 1–9, all passing in mobile and desktop (8 desktop-only)
    - Full `pnpm test` green; `pnpm build` (no .env) passes
    - `grep -rln "Mural de recados\|aprovarRecado\|listBoard\|getPublicRecadosTeaser" src tests` returns nothing
  </acceptance_criteria>
  <done>The three privacy guarantees the client asked for (third paying member sees nothing, free cannot send, non-paying advertiser cannot receive) are pinned by e2e tests; the whole suite is green.</done>
</task>

<!-- ============================================================================================ -->
<!-- PLAN D — Docs, requirements, client check                                                     -->
<!-- ============================================================================================ -->

<task type="auto">
  <name>D1: Staff guide, runbook, requirements, validation, state</name>
  <files>docs/painel/GUIA-DA-EQUIPE.md, docs/deploy/STAGING.md, tests/unit/deploy-files.test.ts, .planning/REQUIREMENTS.md, .planning/phases/05-recados-mensagens-e-contos/05-VALIDATION.md, .planning/STATE.md</files>
  <read_first>
    - docs/painel/GUIA-DA-EQUIPE.md sections "## Recados" (placeholder "Recados: em revisão…") and "## Mensagens entre assinantes"; "## Contas gratuitas → Grátis e Assinante"
    - docs/deploy/STAGING.md 7.4; tests/unit/deploy-files.test.ts "Phase 5 staff guide and runbook 7.4"
    - .planning/REQUIREMENTS.md lines for PREV-02, REC-01..REC-04, CONTA-02 and the traceability table
  </read_first>
  <action>
    (1) Guide: replace the "## Recados" placeholder and merge "## Mensagens entre assinantes" into one "## Recados (conversas privadas entre assinantes)" section: what a recado is now (R-01..R-04, in plain Portuguese, mentioning the mural was removed on 20/10/2026 and nothing needs approval), who can send (pagante para pagante, a partir do anúncio), keep the subsections Privacidade, Denúncias, Suspender, Testar com dois assinantes with "mensagem" → "recado" wording, "A equipe não lê as conversas", "menor de idade", "janela anônima". Mention that the dashboard line is now "Recados: N denúncias abertas". Update the Grátis e Assinante table if it repeats the comparison rows.
    (2) STAGING 7.4: replace "(mais as de recados, em revisão)" with "as de recados (`recados`, `recados_moderation`) continuam no histórico de migrações; a tabela fica guardada sem tela (mural desativado em 20/10/2026). Nenhuma migração nova."
    (3) deploy-files.test.ts: replace the 'Recados: em revisão' and '## Mensagens entre assinantes' expectations with the new heading and texts; keep the other checks.
    (4) REQUIREMENTS.md: REC-01 → "Assinante manda recado privado ao dono de um anúncio pagante e vê só os recados que mandou ou recebeu (revisado 2026-10-20, quick recados-privados)"; REC-02 keep, note "recados = conversas privadas"; REC-04 → "~~Recados passam por moderação da equipe~~ substituído em 2026-10-20 (R-01): sem mural, recados são privados, com bloqueio e denúncia (REC-03)"; PREV-02 → "Visitante vê o convite para mandar recados (botão Enviar recado trancado e Assine Já), sem contato"; CONTA-02 wording "não manda nem recebe recados". Traceability rows note "Quick 2026-10-20-recados-privados".
    (5) 05-VALIDATION.md: mark rows 5-05-01/02, 5-06-01/02, 5-07-01 as "superseded by quick recados-privados (tests replaced: recados-legado.int, recados-privados.spec)"; replace the manual checks "Staff moderate recados…" and "Recados of an expired author disappear at midnight" with "Private recado from a paying ad, reply, unread number, block/report" and "A third subscriber cannot see the conversation". (6) STATE.md: add the quick task to quick tasks / decisions (R-01 unify) and that the 05-12 client checklist uses D2 below for recados.
    Commit: `docs(recados-privados): guide, runbook, requirements and validation for private recados`.
  </action>
  <verify>
    <automated>pnpm exec vitest run tests/unit/deploy-files.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "em revisão" docs/painel/GUIA-DA-EQUIPE.md docs/deploy/STAGING.md` prints 0 for both
    - `grep -n "REC-04" .planning/REQUIREMENTS.md` shows the superseded note
  </acceptance_criteria>
  <done>Staff and planning docs describe recados as private paying-member conversations; no doc still describes the mural as current.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Recados are now private conversations between paying members, started from "Enviar recado" on a paying member's ad; the public/members mural and the moderation queue are gone. Deployed together with 05-12 (push to main → staging https://novo.swingbrasilia.com.br, no new migration).</what-built>
  <how-to-verify>
    Client, on a phone, with three test accounts the staff create (A and B with 30 days released, C free):
    1. Logged in as A, open B's ad in ClassiSex: the button "Enviar recado" is there. Send a recado.
    2. As B: the menu item "Recados" shows the number 1; open it, read, reply. The number disappears.
    3. Release 30 days to a third account D: in D's Recados, the A↔B conversation does NOT appear.
    4. As C (free): open the public ClassiSex — each ad shows "Enviar recado" with a lock that leads to Assine Já; inside the area, Recados shows "Disponível para assinantes".
    5. As A, open C's ad (free advertiser): no "Enviar recado", only the note to use the ad's contacts.
    6. Open https://novo.swingbrasilia.com.br/recados: it goes to Assine Já. The menu has no "Recados" item.
    7. Staff, in /admin: there is no "Recados para aprovar"; block/report from step 2's thread appears as "Recados: 1 denúncia aberta".
    Then the staff delete the test accounts (conversations go with them).
  </how-to-verify>
  <resume-signal>Type "aprovado" or describe what to change (if the client prefers "Manter separados", say so: replan per CONTEXT fallback)</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → server actions (iniciarConversa, responderMensagem, block/report) | form fields `alvo`, `conversa`, `texto`, `apelido` are untrusted; replayable with any cookie |
| browser → /area-do-assinante/mensagens/* pages and /nao-lidas route | session cookie decides the principal; ids in URLs are guessable |
| anonymous → public pages (/classisex, /assine-ja, sitemap) | must not reveal conversations, legacy recados or who pays |
| staff → admin/REST | staff must not read conversations; legacy recados only via REST |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-RP-01 | Information disclosure | listInbox / getThread / thread page | mitigate | participant-only queries (existing T-05-05); e2e test C1#2 (third paying member: 404 + no RSC sentinel + empty list) |
| T-RP-02 | Elevation of privilege | iniciarConversa / responderMensagem replay by a free or expired account | mitigate | requireActiveSubscription in the action + canSend `remetenteInativo` (existing); int A1#3/#4 and e2e C1#4 replay |
| T-RP-03 | Tampering | `alvo` pointing at a free advertiser's ad (typed URL or replay) | mitigate | recipient derived from the ad (T-05-10) + canSend `destinatarioInativo`; compose page shows no form ('indisponivel', I-2); int A1#2, e2e C1#5 |
| T-RP-04 | Information disclosure | legacy `recados` rows (texts with redacted contacts, apelidos) | mitigate | no page/component reads them (code deleted), `admin.hidden`, REST isStaff, removed cache tag; account delete cascade kept (LGPD); int recados-legado + e2e C1#6/#7 |
| T-RP-05 | Information disclosure | open ClassiSex revealing which advertisers pay | mitigate | locked button on every card, no tier field in PublicAdDTO (I-1); B1 grep gate + e2e previas (count of locked links = count of cards) |
| T-RP-06 | Repudiation / abuse | harassment through private recados without prior moderation | mitigate | existing block (both directions), report with 20-message snapshot, automatic suspension on "Pessoa menor de idade", daily limits 20/200, audit rows; unchanged and covered by bloqueio-denuncia.spec + fase5 matrix |
| T-RP-07 | Tampering | removed moderation endpoints still reachable | mitigate | endpoints deleted from the collection; e2e C1#7 expects 404 for POST /api/recados/:id/aprovar |
| T-RP-08 | Spoofing (CSRF) | server actions from a foreign origin | mitigate | src/proxy.ts Origin check unchanged; fase5-seguranca cross-site test kept |
| T-RP-09 | Tampering | open redirect through the new redirects | accept | fixed destinations without parameters in next.config.ts; nothing user-controlled |
| T-RP-10 | Denial of service | migration drift breaking deploy | mitigate | no schema change; B2 `migrate:create --skip-empty` must produce no file; audit enum values kept |
</threat_model>

<verification>
- After Plan C: `pnpm typecheck && pnpm lint && pnpm test` green (Vitest + Playwright mobile/desktop), `pnpm build` with `.env` moved aside passes.
- `ls src/lib/recados` → rules.ts only; `git status --porcelain src/migrations` empty; no `/recados` in nav/footer/sitemap.
- Every deleted test file is listed in the summary with its replacement (recados.spec, moderacao-recados.spec, recado-teaser, recados.int, recado-moderation.int, previas recados tests → recados-privados.spec, recados-legado.int, previas redirect/locked tests).
</verification>

<success_criteria>
- A paying member sees only recados they sent or received; a third paying member cannot see others' conversations (e2e).
- "Enviar recado" appears only paying → paying, non-owner; free accounts and non-paying advertisers can neither send nor receive (int + e2e, including replays).
- No mural, teaser or moderation queue remains; old URLs redirect with 308; no migration was created.
- Docs and requirements reflect R-01..R-08; the client approves on the phone (D2) or chooses the fallback.
</success_criteria>

<output>
Create `.planning/quick/2026-10-20-recados-privados/SUMMARY.md` when done (tasks + commits, deleted/replaced tests table, gate numbers, deviations).
</output>
