---
type: quick
slug: todos-textos-formatados
date: 2026-10-28
planner: opus
executor: sonnet
status: planned
---

# Quick: formatação em todos os Textos do site

Continuação de `2026-10-28-textos-formatados` (PR #23, já em produção no staging). Pedido do cliente (2026-10-28, depois do merge): "eu quero que todos os textos no admin que estão dentro de Textos do site possam ser formatados, e essa formatação seja replicada para a tela do usuário que acessa o site".

Hoje 46 campos longos têm o editor Lexical (`formatado: true`); os demais ~520 (títulos, botões, menu, rótulos, avisos curtos, mensagens, placeholders, 8 longos de meta/label) são `text`/`textarea` puros.

## Decisões

- **Todo campo de Textos do site vira editor Lexical.** O registro deixa de ter campo puro.
- **Dois tipos de editor** (definidos uma vez em `src/lib/textos/editor.ts`):
  - **bloco** (os 46 de hoje + os 8 longos que eram puros): o que já existe — parágrafo, negrito, itálico, sublinhado, riscado se já houver, listas, links, barra fixa + barra ao selecionar.
  - **linha** (todo o resto): só marcas de texto — `BoldFeature, ItalicFeature, UnderlineFeature, StrikethroughFeature` + `ParagraphFeature` + `FixedToolbarFeature, InlineToolbarFeature`. **Sem links e sem listas**: muitos destes textos já ficam dentro de `<a>`/`<button>` (link dentro de link é HTML inválido) e listas quebram títulos e botões. Enter num campo de linha gera parágrafo; o site o mostra como quebra de linha (`TextoRico inline`).
- **Registro:** `CampoTexto.formatado` sai; entra `bloco?: true` (editor completo; omitido = linha) e `soTexto?: true` (o destino só aceita texto puro). Todos os campos ficam `TextoRico` em `Textos<K>`. Atualizar os comentários de `tipos.ts`.
- **Destinos que só aceitam texto puro (`soTexto: true`)**: `<meta>`/`generateMetadata` (title, description, OG), `<title>`, atributos (`placeholder`, `aria-label`, `aria-*`, `title`, `alt`, `value`), `<option>`, assunto/corpo de e-mail em texto, `alert/confirm`, strings passadas a bibliotecas, mensagens que viajam como string por server actions/rotas (se não der para levar o JSON até o JSX). Nesses o campo **também** é editor (o cliente pediu todos), o site usa `ricoParaTexto(...)` e o painel mostra na ajuda do campo: "Aqui a formatação não aparece (é usado pelo Google / dentro do campo / pelo navegador): só o texto." (texto exato a critério, curto e claro). Preferir levar o JSON até o JSX sempre que possível em vez de marcar `soTexto`.
- **Renderização:** `TextoRico` existente. Campos de linha sempre `inline` (span); campos de bloco como hoje. Nada de `dangerouslySetInnerHTML`; a lista branca de nós continua a mesma; no modo inline, link e lista nunca aparecem para campos de linha (o editor não os cria, e o renderer de linha deve ignorá-los mesmo se vierem no JSON — acrescentar opção `marcasSo`/`linha` ao `TextoRico` que descarta link/list e renderiza só texto, marcas e quebras).
- **Helper de string:** `textoPuro(valor)` (= `ricoParaTexto` sem parágrafos extras, uma linha) para os destinos `soTexto`, e `preencherRico`/`vars` continuam para `{variáveis}`.
- **Texto original continua valendo (T-03)** e `{variáveis}` continuam funcionando como no PR #23.

## Tarefas

### T1 — Registro e tipos
- `tipos.ts`: `bloco`, `soTexto`; `TextosDaArea` → todos `TextoRico`; `campoEhBloco`. Remover `formatado` dos 46 (viram `bloco: true`); os 8 longos que eram `formatado: false` viram `bloco: true` + `soTexto: true` (meta) ou só `bloco`/linha conforme destino (as duas frases de `<label>` podem ser **linha** com formatação inline renderizada dentro do label — não precisam mais ser puras).
- Teste de sanidade: todo campo cujo nome sugere meta (`google`, `Descricao` de meta, `placeholder`, `aria`) tem `soTexto: true` — ajustar a heurística para o que existir; e todo `soTexto` tem a ajuda de aviso.
- `mesclar.ts`/`rico.ts`: string legada em qualquer campo → `textoParaRico` (já existe para os formatados; generalizar).

### T2 — Global e migração
- `src/globals/Textos.ts`: todo campo `richText` com `editorBloco` ou `editorLinha`; `defaultValue: textoParaRico(padrao)`; ajuda de `soTexto` anexada à `admin.description`.
- `pnpm generate:types`, `pnpm generate:importmap`.
- Migração `pnpm payload migrate:create todos_textos_formatados` no banco de teste com todas as migrações aplicadas (inclusive `20261028_165121_textos_formatados`); **reescrever o `up`** no mesmo padrão da migração do PR #23 (coluna temporária jsonb, conversão linha a linha com cópia congelada de `textoParaRico`, vazio → NULL, drop/rename, DEFAULT jsonb do original); `down` simétrico (jsonb → varchar com texto puro, DEFAULT original). Reaproveitar o helper da migração anterior se ele estiver isolado; se não, copiar congelado (migrações não importam código vivo). Testar up → down → up com valores editados (acentos, aspas, `\n`, só espaços) e `migrate:create` seguinte dizendo "No schema changes".
- **Arrays/collapsibles:** se alguma área tiver campos dentro de grupo/array, conferir a tabela/coluna gerada.

### T3 — Site: todos os usos
- Para cada área (uma por commit ou em lotes), trocar cada uso de `t.<chave>`/`textos.<chave>`/desestruturações:
  - filho JSX → `<TextoRico valor={…} inline linha />` (ou bloco para `bloco: true`), mantendo classes do pai. Onde o texto é filho direto de `<a>`, `<button>`, `<Link>`, `<label>`, `<h1..h6>`, `<summary>`, `<legend>`, `<th>`: inline (span) é válido.
  - `preencher(t.x, vars)` em JSX → `vars` no `TextoRico`; em string → `preencher(textoPuro(t.x), vars)`.
  - destinos de texto puro → `textoPuro(...)` e o campo marcado `soTexto: true`.
  - `getNavItems`/`getMemberNavItems` (`src/lib/site/nav.ts`): `label` passa a ser `TextoRico` (render inline no menu e no menu mobile) + `textoPuro` onde for `aria-label`/comparação.
  - `TextosGeraisProvider`/`useTextosGerais`: client components recebem JSON e usam `TextoRico` (já funciona no age gate).
  - Mensagens de server actions/validação que hoje vêm dos textos: se o estado da action é serializável, levar o JSON e renderizar com `TextoRico`; senão `textoPuro`.
- **Ponto cego conhecido do PR #23:** o typecheck nem sempre acusa objeto usado como filho JSX (`<>{t.x} </>`). Por isso: grep de **cada chave** de cada área e conferir todos os usos; e rodar a suíte e2e inteira (React quebra a página ao renderizar objeto como filho, o e2e pega).

### T4 — Testes
- Unit: registro (todo campo é editor; `soTexto` tem aviso; `bloco` só onde precisa), `TextoRico` modo linha descarta link/lista e mantém `<strong>/<em>/<u>/<s>`; `textoPuro` de valor com marcas e quebras; string legada.
- Int: salvar pelo Local API um título com negrito e um botão com itálico → `getTextos` devolve JSON; vazio → original.
- E2E: ampliar `tests/e2e/textos.spec.ts`: no painel, deixar uma palavra de um **título** em negrito e um **botão** em itálico, salvar, ver `<strong>`/`<em>` no site; um campo `soTexto` (ex. descrição do Google) com negrito sai como texto puro na `<meta>`; apagar volta ao original. Abrir a área com mais campos no painel e checar que carrega em tempo razoável (registrar o tempo no SUMMARY).
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:int`, **Playwright completo** (mobile + desktop), `pnpm build`. Falhas que também acontecem na base (`ec7aff0`) são registradas como existentes, não escondidas.

### T5 — Guia e fechamento GSD
- `docs/painel/GUIA-DA-EQUIPE.md`, seção Textos do site: agora todo texto pode ser formatado; títulos/botões só negrito, itálico, sublinhado e riscado; links e listas nos textos longos; campos com o aviso não mostram formatação (Google, dentro do campo, navegador).
- `SUMMARY.md` (`status: complete`), PLAN `status: complete`, linha em "Quick Tasks Completed" do `.planning/STATE.md`.
- Commits atômicos em português (`feat(textos): …`).

## Riscos
- **Volume:** ~520 campos e ~76 arquivos consumidores. O typecheck aponta atributos/strings; os filhos JSX precisam de grep + e2e completo.
- **Peso do painel:** áreas com dezenas de editores Lexical podem abrir devagar. Medir a maior área; se passar de ~5 s em máquina comum, registrar no SUMMARY e propor alternativa (não bloquear a entrega).
- **Migração grande:** centenas de colunas; manter o padrão testado do PR #23 e testar up/down/up.
- **HTML inválido** (`div` em `p`/`a`/`button`): campos de linha são sempre inline. E2E sem warnings de hydration.
- **SEO/meta:** `soTexto` garante string pura nas metas.
