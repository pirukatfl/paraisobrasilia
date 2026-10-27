---
type: quick
slug: classisex-mais-contatos
date: 2026-10-27
planner: opus
executor: sonnet
status: complete
---

# Quick: mais campos de contato no anúncio do ClassiSex

Pedido do cliente (2026-10-27): "quando alguém for fazer um anúncio no classisex, deve ter mais campos para pôr: e-mail, link de outras plataformas que essa pessoa tenha conta e etc."

Hoje o grupo `contato` do anúncio tem só WhatsApp e Telegram (decisão de 2026-10-20). Este quick acrescenta, no mesmo grupo e com a mesma regra (opcional, só assinantes veem, nunca na área aberta):

| Campo | Coluna | Regras |
|---|---|---|
| E-mail de contato | `contato.email` (text) | opcional; trim + minúsculas; até 254; formato de e-mail simples (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) |
| Links de outras plataformas | `contato.links` (array de `{ url }`, maxRows 5) | opcional; cada um: trim, sem espaços, `https://` acrescentado se faltar esquema; só `http:`/`https:` (rejeitar `javascript:`, `data:` etc. via `new URL`), host com ponto, até 300 caracteres; vazios descartados; duplicados descartados; até 5 |
| Como prefere o contato | `contato.observacao` (text) | opcional; uma linha; até 120 caracteres (ex.: "Só mensagem, depois das 18h") |

Não confundir com o `email` já existente dos anúncios enviados sem conta (`anuncio sem login`): aquele é da conta/equipe e nunca aparece; o novo `contato.email` é o e-mail que o anunciante quer mostrar aos assinantes.

Contato continua opcional (decisão 2026-10-23); nenhum campo novo é obrigatório.

## Rótulo dos links

Sem campo de rótulo livre (evita contato escondido no rótulo e simplifica o formulário). O rótulo exibido vem do domínio, função pura `platformLabel(url)` em `src/lib/classisex/rules.ts` (ou módulo novo `links.ts`): instagram.com → Instagram, x.com/twitter.com → X (Twitter), onlyfans.com → OnlyFans, privacy.com.br → Privacy, fansly.com → Fansly, tiktok.com → TikTok, facebook.com → Facebook, linktr.ee → Linktree, reddit.com → Reddit, t.me → Telegram, youtube.com → YouTube, closefans → CloseFans; senão o host sem `www.`. Subdomínios (`m.facebook.com`) contam.

## Tarefas

### T1 — Regras e tipos (puro)
- `src/lib/classisex/rules.ts`: `LINKS_MAX = 5`, `LINK_MAX = 300`, `OBSERVACAO_MAX = 120`; `normaliseEmailContato`, `isValidEmailContato`, `normaliseLink`, `isValidLink`, `normaliseObservacao`, `platformLabel`; mensagens em `AD_MESSAGES` (`emailContato`, `link`, `linksDemais`, `observacaoLonga`) em português claro no estilo das existentes.
- `AdInput` ganha `email: string`, `links: string[]`, `observacao: string`; `AdContato` ganha `email: string | null`, `links: string[]`, `observacao: string | null`. Erros: `errors.emailContato`, `errors.links` (mensagem única citando o link inválido ou o limite), `errors.observacao`.
  - Atenção: `AdErrors` é `Partial<Record<keyof AdInput, string>>`; a chave do erro do e-mail de contato deve ser `emailContato` (o visitante já usa `errors.email` para o e-mail dele). Ajuste o tipo.
- `validateAdInput` normaliza/valida os três e devolve em `value.contato`.

### T2 — Coleção `ads` + migração + tipos
- `src/collections/Ads.ts`: no grupo `contato`, depois de `telegram`: `email` (text, label "E-mail de contato", validate opcional), `links` (array, label "Links de outras plataformas", `labels: { singular: 'Link', plural: 'Links' }`, `maxRows: LINKS_MAX`, campo `url` text required com validate), `observacao` (text, label "Como prefere o contato", maxLength 120). Descrição do grupo atualizada: "Opcional: WhatsApp, Telegram, e-mail e links. Só assinantes veem; nunca aparece na área aberta."
- `normaliseAndCheckContacts` normaliza também email/links/observacao vindos do painel (mesmas funções), descartando links vazios.
- Migração nova gerada pelo Payload (`pnpm payload migrate:create classisex_mais_contatos`) contra o banco de teste migrado até a última migração; conferir que só cria `contato_email`, `contato_observacao` em `ads` e a tabela `ads_contato_links`, com `down` simétrico. Registrar em `src/migrations/index.ts` (o create já faz).
- `pnpm generate:types` (e `generate:importmap` se mudar algo de admin).
- Não mexer em `guardAuthorChange`, no campo `author` nem no `afterChange` (PR #18 aberto mexe ali; evitar conflito).

### T3 — Formulário (assinante e visitante)
- `src/components/classisex/AdFormFields.tsx`: no fieldset de contato, depois do Telegram: input `emailContato` (type email, `autoComplete="email"`, name `emailContato` — o form do visitante já tem `name="email"` para o e-mail da conta, não reutilizar); links: 3 inputs `name="links"` (type url, `inputMode="url"`, placeholder `https://instagram.com/seuperfil`) visíveis e mais 2 dentro de `<details>` "Adicionar mais links" (aberto se algum dos 2 últimos tiver valor). Sem JS. `observacao`: input text maxLength 120. Ids e aria seguindo o padrão (`erro-…`, `ajuda-…`).
- `AdFormValues` ganha `emailContato: string`, `links: string[]`, `observacao: string`. `readInput` em `actions.ts` lê `formData.getAll('links')`. `VisitorAdForm.tsx` (EMPTY e leitura do FormData) e `src/app/(frontend)/classisex/anunciar/enviar/route.ts` passam os novos campos (`form.getAll('links')`).
- `getOwnAdFormValues` (service.ts) devolve os novos valores para a edição; páginas `meus-anuncios/novo` e `[id]/editar` passam adiante sem quebrar.
- `createAd`, `updateAd` e `createVisitorAd` gravam `contato` completo (já gravam `value.contato`; confirmar).

### T4 — Exibição
- `dto.ts`: `AdContatoDTO` e `contatoOf` com os novos campos; `MemberAdDTO.contato` ganha `email: ContactLinkDTO | null` (href `mailto:`), `links: ContactLinkDTO[]` (label = `platformLabel`), `observacao: string | null`. `toPublicAdDTO` NÃO muda (nunca lê `contato`).
- `ContactLinks.tsx`: botão E-mail (`btn-secondary`) e um botão por link (`btn-secondary`, label da plataforma), observação como texto pequeno abaixo. Links externos com `ExternalLink`; acrescentar `nofollow ugc` ao `rel` só para os links de anúncio (prop opcional `rel` extra ou componente próprio), sem alterar outros usos.
- `OwnerAdCard.tsx`: lista também e-mail, links (URL) e observação.
- `ModeracaoPanel.tsx` (+ `ModerationView`): mostra e-mail, links (URL completa, clicável, para a equipe conferir) e observação em "Contatos (só assinantes veem)".
- `AprovarSelecionados` / fila: nada a mudar além de tipos.

### T5 — Textos editáveis (Textos do site)
- `src/lib/textos/areas/meusAnuncios.ts` (seção CAMPOS): `emailContatoRotulo` "E-mail", `linksRotulo` "Links de outras plataformas", `linksAjuda` "Instagram, X, OnlyFans, Privacy, Linktree… Até 5 links. Só assinantes veem.", `linksMais` "Adicionar mais links", `observacaoRotulo` "Como prefere o contato", `observacaoAjuda` "Ex.: só mensagem, depois das 18h."; LISTA: `donoEmail` "E-mail", `donoLinks` "Links", `donoObservacao` "Como prefere o contato". Atualizar padrão de `contatoLegenda` para "Contato (opcional; só assinantes veem)".
- `src/lib/textos/areas/classisex.ts` (Anúncio completo): `contatoEmail` "E-mail", `contatoLinksTitulo` "Outras plataformas", `contatoObservacao` "Como prefere o contato". Atualizar o padrão da linha ~202 para citar "o contato (WhatsApp, Telegram, e-mail e links)".
- Conferir se textos novos precisam de migração/seed (ver como `20261026_032443_textos_do_site` e `getTextos` tratam chaves ausentes; se o padrão vale sem migração, não criar).

### T6 — Testes
- Unit (`tests/unit/…classisex rules`): e-mail válido/inválido; link sem esquema ganha https; `javascript:alert(1)` e `data:` rejeitados; mais de 5 links → erro; vazios/duplicados descartados; `platformLabel` para os domínios listados e fallback; observação > 120 → erro.
- Int (`tests/int/ads.int.test.ts` ou novo `ads-mais-contatos.int.test.ts`): criar anúncio (assinante e visitante) com e-mail + 2 links + observação; persistem normalizados; `toMemberAdDTO` traz os links/mailto; `toPublicAdDTO`/rota pública e a API REST anônima (`/api/ads`) não contêm o e-mail nem as URLs; edição pelo painel (Local API como staff) valida link inválido.
- E2E: ampliar `meus-anuncios.spec.ts` (ou `classisex-assinante.spec.ts`) para preencher e-mail + link e ver os botões no anúncio completo; e `classisex-publico.spec.ts`/`classisex-seguranca.spec.ts` confirmando que a área aberta não mostra o e-mail nem o link.
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:int`; Playwright das specs do ClassiSex tocadas. Registrar números no SUMMARY.

### T7 — Fechamento GSD
- `SUMMARY.md` neste diretório (frontmatter `status: complete`), linha na tabela "Quick Tasks Completed" do `.planning/STATE.md`.
- Commits atômicos por tarefa, mensagens em português no estilo do repo (`feat(classisex): …`).

## Riscos
- PR #18 (anúncio sem login) aberto mexe em `Ads.ts` (author/afterChange) e `payload-types.ts` (descrição do author): editar só o grupo `contato`, o hook de contatos e os imports para manter o merge limpo.
- Migração: gerar a partir do banco de teste com todas as migrações aplicadas, para o diff conter só as colunas novas.
- LGPD/área aberta: os novos campos seguem o mesmo caminho do WhatsApp (só `toMemberAdDTO`, owner e staff). Teste de vazamento obrigatório.
