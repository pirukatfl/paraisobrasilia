---
type: quick
slug: classisex-comentarios
date: 2026-11-03
planner: opus
executor: sonnet
---

# Plano: comentários e conversa em cada anúncio do ClassiSex (pedido do cliente 2026-11-03)

Pedido: "no classisex é possível as pessoas comentarem em um item, ou podem manter uma conversa ali, mas os contatos continuam aparecendo apenas para quem é assinante".

Hoje não existe nada parecido: o anúncio tem só denúncia e recado privado (mensagens). A importação do site antigo pulou as respostas do wpDiscuz (`comment_parent != 0`); elas continuam fora (não é escopo trazer).

Decisão padrão (cartão de decisão enviado ao cliente; seguir com ela até resposta): **qualquer conta logada (gratuita ou assinante) comenta; todos leem (visitantes também, na área aberta); contatos escritos nos comentários só aparecem para assinantes.** Se o cliente escolher "só assinantes", a página pública do anúncio (C3) não mostra a conversa e o formulário passa a exigir assinatura ativa: deixe isso fácil de trocar (uma constante/regra central em `src/lib/classisex/comentarios/rules.ts`, ex.: `QUEM_COMENTA: 'conta' | 'assinante'`).

Branch `claude/project-thread-il3gw4` (a partir de `main`, 800d442).

## C1. Coleção `ad-comments` (grupo ClassiSex, rótulo "Comentários")
- Campos: `ad` (rel `ads`, obrigatório, index), `author` (rel `assinantes`, obrigatório, index, só equipe lê), `parent` (rel `ad-comments`, opcional: resposta; **um nível só**: responder a uma resposta grava o comentário raiz como `parent`), `apelido` (texto, retrato no momento do envio), `texto` (textarea, até 1000 caracteres, guardado como escrito), `doAnunciante` (checkbox calculado no servidor: autor do comentário == autor do anúncio; mostra o selo "Anunciante"), `status` (`publicado` | `oculto`, padrão `publicado`), `ocultadoEm`, `ocultadoPor` (users), `motivo` (opcional, só equipe), `resumo` (calculado para `useAsTitle`: apelido — início do texto).
- Acesso REST/GraphQL: tudo `isStaff` (read/create/update/delete). Assinantes escrevem só pelo serviço (Local API + `overrideAccess`) depois do guard de sessão, como `ads`/`recados`.
- Painel: lista com colunas resumo, anúncio, status, createdAt; filtro por status; a equipe oculta/mostra (troca `status`, grava `ocultadoEm/Por`) ou apaga. `writeAudit` ao ocultar, reexibir e apagar. Descrição curta e clara para a equipe (operação simples).
- Cascatas: `Ads.beforeDelete` apaga os comentários do anúncio; apagar uma conta (`assinantes`) apaga os comentários dela (seguir o padrão existente de limpeza da conta, se houver; senão um `beforeDelete` em Assinantes). Apagar um comentário raiz apaga as respostas.
- `assinantes.comentariosBloqueados` (checkbox, só equipe lê/escreve, sidebar): bloqueia a conta de comentar (mesma ideia de `mensagensSuspensas`).
- Migração Payload (`pnpm payload migrate:create classisex_comentarios`) e `payload-types.ts` regenerado.

## C2. Serviço e regras (`src/lib/classisex/comentarios/`)
- `rules.ts` (puro): `COMENTARIO_MAX = 1000`, normalização (trim, `\r\n`→`\n`, colapsa 3+ quebras), erros em pt-BR (vazio, longo, apelido inválido reaproveitando a regra de apelido sem contato de `recados/rules` ou `classisex/rules`), `LIMITE_DIARIO = 30` por conta, `QUEM_COMENTA`.
- `service.ts`: `createComment(payload, { assinanteId, adId, parentId?, apelido, texto, now })`: anúncio precisa estar visível (`isAdVisible`); parent precisa ser do mesmo anúncio e publicado; conta bloqueada → erro; limite diário → 429; respeita `QUEM_COMENTA`. `deleteOwnComment(payload, assinanteId, id)` (só o autor; apaga respostas junto). `listComments(payload, adId, { viewer })` devolve DTO.
- DTO (`dto.ts`): `{ id, apelido, texto, quando (rótulo pt-BR), doAnunciante, meu, respostas: [...] }`, ordem cronológica (raízes e respostas). **Nunca** o id do autor nem e-mail. `texto` passa por `redactContacts` quando quem vê **não** é assinante ativo (visitante, conta gratuita, sessão de equipe vendo o público). Assinante ativo vê o texto como foi escrito. O apelido também passa pela redação para não-assinantes.
- Leituras da área aberta com `cached(...)` tag `ad-comments` (o DTO público redigido é igual para todo não-assinante; `meu` calculado fora do cache ou buscado à parte). `afterChange`/`afterDelete` da coleção chamam `expire(['ad-comments'])`. Anúncio despublicado/recusado: conversa some junto (o serviço filtra pelo anúncio visível).
- `actions.ts` (server actions): `comentar` e `apagarComentario`; leem só `adId`, `parentId`, `apelido`, `texto` do formulário (nunca autor/status); `requireAssinante` (conta qualquer) e, se `QUEM_COMENTA === 'assinante'`, `requireActiveSubscription`; `revalidatePath` das duas páginas do anúncio.

## C3. Interface (usar a skill Impeccable: `.claude/skills/impeccable/SKILL.md`)
- Componente `Comentarios` (server) + `ComentarioForm` (client, `useActionState`), seguindo o visual existente (tokens `type-*`, `btn-*`, `border-line`, `bg-surface`, cards `rounded-xl`). Lista em fio: raiz, respostas recuadas; selo "Anunciante"; data relativa curta; "Responder" abre o formulário inline sob o comentário; "Apagar" só nos próprios (confirmação). Contador de caracteres. Estado vazio: "Ainda não há comentários. Comece a conversa." Mensagem para não-assinante sob a lista: contatos aparecem como `[contato só para assinantes]` → link "Assine para ver".
- Quem não está logado vê a conversa e, no lugar do formulário, "Entre ou crie sua conta grátis para comentar" (links `/entrar?next=…` e `/cadastro`). Conta bloqueada: aviso sem formulário.
- **Área do assinante** `/area-do-assinante/classisex/[id]`: seção "Comentários" (`id="comentarios"`) depois do contato/recado, antes da denúncia.
- **Área aberta**: nova página `/classisex/anuncio/[id]` com o anúncio no formato público (mesmo DTO público do quadro: apelido, tipo, cidade, texto redigido, capa) + conversa. `robots: noindex, follow` (conteúdo de usuários). Assinante ativo que abre essa página vê o link "Ver anúncio completo" para a página da área do assinante. Anúncio invisível → 404.
- Cartões: `PublicAdCard` ganha link "Comentários (N)" / "Comentar" para `/classisex/anuncio/[id]#comentarios`; `MemberAdCard` ganha o mesmo para `/area-do-assinante/classisex/[id]#comentarios`. A contagem conta só comentários publicados; buscar em lote para a página (sem N+1).
- Textos editáveis novos na área `classisex` (`src/lib/textos/areas/classisex.ts`), seção "Comentários": título da seção, estado vazio, rótulos do formulário, botão Comentar/Responder/Apagar, aviso de contatos para não-assinantes, chamada para entrar, aviso de bloqueio, selo Anunciante, link do cartão. Mensagens de erro podem ficar no código (`rules.ts`) como as demais.

## C4. Testes e docs
- Unit: regras (normalização, limites, redação do DTO para não-assinante vs assinante).
- Int (`tests/int/ad-comments.int.test.ts`): REST anônimo e de assinante em `/api/ad-comments` → negado (lista e by id); conta gratuita comenta; anúncio pendente/recusado/despublicado → recusa; resposta de resposta vira resposta da raiz; parent de outro anúncio → recusa; conta bloqueada → recusa; limite diário; DTO público sem contato e sem id do autor; DTO de assinante com o texto inteiro; oculto não aparece; apagar anúncio apaga comentários; autor apaga o próprio e não o dos outros.
- E2E (`tests/e2e/classisex-comentarios.spec.ts`): visitante vê a conversa sem contatos e o convite para entrar; conta gratuita comenta e responde na página aberta; assinante vê o contato escrito no comentário na área do assinante; equipe oculta no painel e some do site.
- `docs/`: atualizar o guia do painel (seção ClassiSex → Comentários: ocultar, apagar, bloquear conta). Procurar o arquivo-fonte do guia em `docs/`.
- Antes do PR: `pnpm typecheck`, `pnpm lint`, testes unit + int (+ e2e do ClassiSex se o ambiente permitir).
- `SUMMARY.md` nesta pasta ao terminar.

## Fora do escopo (próximos passos possíveis)
- Aviso por e-mail ao anunciante quando chega comentário.
- Denunciar comentário pelo site (hoje a equipe modera pelo painel).
- Trazer as respostas antigas do wpDiscuz.
