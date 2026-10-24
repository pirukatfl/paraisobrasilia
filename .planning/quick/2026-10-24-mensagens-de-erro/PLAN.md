# Quick: mensagens de erro claras (site e painel)

Pedido do cliente (2026-10-24): quando der erro, no site ou no painel (/admin), o usuário tem que ler
o motivo em português claro. Hoje às vezes aparece "An error has occurred" / "An unknown error
occurred" / "Something went wrong", ou só "Erro", que não ajudam. Ajustar todos os retornos de erro.

## Diagnóstico (de onde vêm as mensagens genéricas)

1. **API do Payload** (`/api/*`, usada pelo painel e pelos painéis customizados): `routeError` troca
   qualquer erro 500 sem `isPublic` por `"Something went wrong."` e o fallback de `formatErrors` é
   `"An unknown error occurred."` (inglês). Os endpoints customizados (`run()` em
   `src/lib/classisex/endpoints.ts`, `src/lib/assinantes/endpoints.ts`, `src/lib/mensagens/endpoints.ts`)
   relançam tudo que não é `ServiceError`, então caem nisso.
2. **Painel em inglês:** `i18n.supportedLanguages` tem `pt` e `en`; com navegador em inglês o Payload
   escolhe `en` e mostra "An error has occurred." (`error:unspecific`). Mensagens de `req.t` na API
   também saem em inglês.
3. **Painéis customizados do admin** (`src/components/admin/**`) leem só `json.message`; a resposta
   do Payload vem em `{ errors: [{ message }] }`, então mostram o fallback `'Erro'`. Corpo não-JSON
   (413 do Caddy, 502) e falha de rede também caem em `'Erro'` ou na mensagem crua do navegador
   (`Failed to fetch`).
4. **Server actions do site** (`src/lib/*/actions.ts`, `more-actions.ts`): erro inesperado é relançado;
   em produção o Next troca a mensagem por "An error occurred in the Server Components render…" e o
   usuário cai no `error.tsx`.
5. **`src/app/(frontend)/error.tsx`** diz "Não foi possível carregar as festas agora." para qualquer
   página (texto errado fora da home) e não dá nenhum código para a equipe achar o erro no log.
6. **Route handlers** (`classisex/anunciar/enviar`, `meus-anuncios/[id]/midia`, `classisex/previa/[id]`,
   `midia/[id]/[variante]`): conferir se erro inesperado vira resposta em português (JSON ou redirect
   com `?erro=`/`codigo=` já existentes), não 500 cru.

## Decisões

- **Um módulo puro de tradução** `src/lib/errors/` (sem dependência de Next/Payload no runtime, testável):
  - `mensagemAmigavel(err, contexto?)`: recebe o erro original e devolve texto pt. Ordem:
    `ServiceError`/`APIError` público/`ValidationError` → a própria mensagem (traduzida se for uma
    frase conhecida em inglês); códigos do Postgres (`err.code` ou `err.cause.code`):
    `23505` "Já existe um cadastro com esse valor. Troque e tente de novo.",
    `23503` "Não dá para apagar/alterar: este item ainda está ligado a outros registros (por exemplo
    anúncios, assinaturas ou mensagens). Remova esses vínculos primeiro.",
    `23502` "Faltou preencher um campo obrigatório.", `22001` "Um dos textos passou do tamanho
    permitido.", `ECONNREFUSED`/`57P01`/timeout "O banco de dados não respondeu. Tente de novo em
    instantes."; limite de arquivo (`File size limit`/413) "O arquivo é grande demais…";
    resto → `MENSAGEM_INESPERADA` = "Não foi possível concluir por um erro inesperado no servidor.
    Tente de novo; se continuar, avise a equipe com o horário do erro." Nunca expor stack, SQL ou
    nomes de tabela (T-01-14 continua valendo).
  - `traduzirMensagem(texto)`: dicionário das frases em inglês do Payload que podem chegar ao
    usuário (Something went wrong., An unknown error occurred., An error has occurred., You are not
    allowed to perform this action., Unauthorized…, The following field(s) is/are invalid: X,
    Value must be unique, File size limit has been reached, The requested resource was not found.,
    Not Found, etc.) → pt; texto já em português passa intacto.
  - `mensagemDaResposta(status, json)` (cliente): `json.message` → `json.errors[0].message` (com
    `data.errors[].message` se houver) → por status: 401 "Sua sessão expirou. Entre de novo.",
    403 "Você não tem permissão para fazer isso.", 404 "Não encontramos este item. Ele pode ter sido
    apagado.", 409 mensagem do servidor, 413 "O arquivo é grande demais para enviar.", 429 "Muitas
    tentativas seguidas. Espere alguns minutos e tente de novo.", 5xx inesperado; sempre passando
    por `traduzirMensagem`. `mensagemDeFalhaDeRede` para `TypeError`/`Failed to fetch`:
    "Sem conexão com o servidor. Confira sua internet e tente de novo."
- **`hooks.afterError` global no `payload.config.ts`**: reescreve `response` para que toda resposta de
  erro da API tenha `message` (topo) e `errors[].message` em português, a partir do erro original
  (não do "Something went wrong."). Preserva `errors[].data` / `field` / `path` (o formulário do
  painel destaca o campo com isso) e o `status`. Loga o erro original (o Payload já loga).
- **Painel só em português:** `supportedLanguages: { pt }` (remove `en`). Staff é toda brasileira; isso
  tira o "An error has occurred." de vez e deixa `req.t` em pt.
- **Endpoints customizados**: `run()` de cada `endpoints.ts` passa a responder erro inesperado com
  `{ message: mensagemAmigavel(err) }` status 500 (e `console.error`/`req.payload.logger.error` do
  original) em vez de relançar.
- **Painéis do admin**: trocar todos os `json.message ?? 'Erro'` / `'Não foi possível concluir.'` por
  `mensagemDaResposta(res.status, json)`; `catch` de rede usa `mensagemDeFalhaDeRede`. Mesmo nos
  componentes do site que fazem `fetch` (`VisitorAdForm`, `AdForm` upload via XHR, `InfiniteAds`).
- **Server actions**: em cada action que devolve estado (`*State`), erro que não é `ServiceError`
  vira `{ …, message/errors.form: MENSAGEM_INESPERADA }` (logado com `console.error`), sem engolir
  `redirect()`/`notFound()` (usar `unstable_rethrow` de `next/navigation` antes de tratar). Actions
  `void` que terminam em redirect: manter o padrão do arquivo (`?erro=codigo`) quando a página já
  mostra códigos; senão deixam cair no `error.tsx` novo.
- **`error.tsx`**: texto genérico correto para qualquer página ("Algo deu errado ao abrir esta
  página." + "Pode ser uma instabilidade momentânea. Tente de novo em alguns instantes. Se continuar,
  avise a equipe informando o código abaixo.") e mostra `error.digest` como "Código: xxx" (o digest
  já aparece no log do servidor; não é dado sensível). Mantém "Tentar de novo" e um link "Voltar ao
  início". Criar também `src/app/global-error.tsx` (falha no layout raiz) com o mesmo texto e HTML
  mínimo. Não mostrar `error.message`.

## Passos

1. `src/lib/errors/{index,traduzir,mensagens}.ts` + `tests/unit/erros.test.ts` (frases em inglês →
   pt, códigos pg, `mensagemDaResposta` por status, texto pt intacto, nada de stack/SQL vazando).
2. `payload.config.ts`: `afterError` + só `pt`.
3. `endpoints.ts` (classisex, assinantes, mensagens): erro inesperado → JSON pt.
4. Painéis `src/components/admin/**` e fetch do site → helper do cliente.
5. Server actions (assinantes, classisex, more-actions, mensagens) e route handlers.
6. `error.tsx` + `global-error.tsx`; ajustar e2e que procuram o texto antigo ("Não foi possível
   carregar as festas agora", se houver).
7. `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`; e2e relevantes se o banco de teste subir.
8. `SUMMARY.md` nesta pasta; seção curta em `docs/painel/GUIA-DA-EQUIPE.md` ("Quando aparece um
   erro": o que a mensagem diz e mandar o código/horário).
