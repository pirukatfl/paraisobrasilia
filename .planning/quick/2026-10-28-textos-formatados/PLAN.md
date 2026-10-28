---
type: quick
slug: textos-formatados
date: 2026-10-28
planner: opus
executor: sonnet
status: planned
---

# Quick: editor de texto formatado nos Textos do site

Pedido do cliente (2026-10-28): "precisamos ter um editor de texto no painel administrativo, para a alteração de textos do site, a formatação que for aplicada no texto deve seguir na tela depois".

Hoje (06.2) cada área de **Textos do site** é um global com campos `text` (uma linha) ou `textarea` (textos longos), e o site mostra a string pura. Este quick troca os textos **longos** (parágrafos, avisos, introduções, ajudas) pelo mesmo editor Lexical que a equipe já usa em Festas e Páginas (barra fixa + barra ao selecionar: negrito, itálico, sublinhado, listas, links) e faz o site renderizar a formatação.

## Decisões

- **Quais campos viram editor:** os que hoje são `textarea` (`campoEhLongo`) — 52 campos. Títulos, botões, rótulos de formulário e placeholders continuam uma linha de texto puro (formatação ali quebraria o layout e a acessibilidade).
- **Exceções que continuam texto puro** (`formatado: false` no registro): textos que vão para `<meta>`/Google (`googleDescricao`, `descricaoGoogle`, `publicoGoogleDescricao`, `googleListaDescricao`…), textos usados em atributos (`aria-*`, `title`, `placeholder`, `alt`), em `<label>`/`<option>`/`<button>` (ex.: `meusAnuncios.declaracao`, `enviarConto.consentimento` se ficarem dentro do `<label>` do checkbox) e em e-mails/strings não-JSX. O executor audita cada um dos 52 usos (grep da chave) e marca `formatado: false` onde o destino não aceita HTML de bloco.
- **Formato salvo:** JSON Lexical (campo `richText` do Payload), não HTML. Nada de `dangerouslySetInnerHTML`: o site renderiza só os nós permitidos por conversores JSX (lista branca), então HTML/script colado vira texto. Links passam pelo mesmo filtro `SAFE_HREF` de `src/components/RichText.tsx` (http(s), mailto, tel, relativos, #); qualquer outro esquema (`javascript:`, `data:`) vira texto sem link. Nós fora da lista branca (heading, upload, relationship, block…) não são renderizados.
- **Recursos do editor:** `ParagraphFeature, BoldFeature, ItalicFeature, UnderlineFeature, UnorderedListFeature, OrderedListFeature, LinkFeature({ enabledCollections: [] }), FixedToolbarFeature, InlineToolbarFeature` — mesmo conjunto de Festas + sublinhado. Sem títulos/imagens.
- **Texto original continua valendo (T-03):** editor vazio (sem texto visível) → site usa o original. `defaultValue` do campo = original convertido para Lexical (parágrafos por linha em branco, `\n` simples vira quebra de linha), para a equipe ver o texto atual no editor.
- **Variáveis `{nome}`** continuam funcionando dentro do texto formatado: substituídas nos nós de texto antes de renderizar.

## Tarefas

### T1 — Tipos e conversões puras (`src/lib/textos/`)
- `tipos.ts`: `CampoTexto.formatado?: boolean` (doc: "Editor com negrito, itálico, listas e links. Omitido: sim para textos longos"). `campoEhFormatado(campo) = campo.formatado ?? campoEhLongo(campo)`. Manter `longo` para o caso `formatado: false` + textarea.
- `TextosDaArea` passa a mapear campo formatado → `TextoRico` e os demais → `string`. Tipar via condicional no literal (`definirArea` já preserva literais; usar `formatado: false` literal para exceções e a regra de comprimento não é inferível no tipo → **o tipo precisa ser declarativo**: exigir `formatado: true` explícito nos campos formatados OU calcular o tipo a partir de uma flag literal). Decisão: marcar **explicitamente** `formatado: true` em cada campo que vira editor (registro fica autoexplicativo e o tipo sai do literal); `campoEhFormatado = campo.formatado === true`. Teste de sanidade garante que todo campo longo tem `formatado` definido (true ou false).
- Novo `src/lib/textos/rico.ts` (puro, sem React):
  - `type TextoRico = SerializedEditorState` (reusar `RichTextState`).
  - `textoParaRico(texto: string): TextoRico` — parágrafos por `\n\n`, `\n` → `linebreak`.
  - `ricoTemTexto(valor: unknown): boolean` — JSON Lexical válido com algum nó de texto não vazio.
  - `ricoParaTexto(valor: TextoRico): string` — texto puro (parágrafos separados por `\n\n`, itens de lista por `\n`), para usos que precisem de string (ex. `title`), e para o `down` da migração.
  - `preencherRico(valor, vars)` — clona e aplica `preencher` em cada nó `text`.
- `mesclar.ts`: `padroesDaArea` devolve `textoParaRico(padrao)` nos formatados; `mesclarTextos` aceita o salvo se `ricoTemTexto`, senão original convertido. Strings legadas (antes da migração) num campo formatado → `textoParaRico(salvo)` (robustez).

### T2 — Global e editor (`src/globals/Textos.ts`)
- Campo formatado: `{ type: 'richText', editor: editorDosTextos, defaultValue: textoParaRico(padrao) }`. `editorDosTextos` definido uma vez (lexicalEditor com os features acima) num módulo próprio (`src/lib/textos/editor.ts` ou dentro do global).
- Descrição do global: "Selecione palavras para negrito, itálico, sublinhado, link ou lista. Para voltar ao texto original, apague o campo e salve."
- `pnpm generate:types` e `pnpm generate:importmap` (o editor Lexical pede componentes no import map).

### T3 — Migração dos dados
- Gerar com `pnpm payload migrate:create textos_formatados` contra o banco de teste migrado até a última migração e **reescrever o `up`** para não perder textos salvos: para cada coluna que vira `jsonb`, converter o valor atual (string) com `textoParaRico` (string vazia/nula → `NULL`), e definir o `DEFAULT` que o Payload espera (conferir o que o migrate:create gerou; se ele gera `DEFAULT '{...}'::jsonb`, manter). Pode ser feito em SQL (`ALTER COLUMN … TYPE jsonb USING …`) ou em JS (coluna temporária + `UPDATE` linha a linha + drop/rename); escolher o mais simples que preserve os dados.
- `down` simétrico: `jsonb` → `varchar` com `ricoParaTexto`, `DEFAULT` = texto original.
- Conferir no banco de teste: valor editado antes da migração continua aparecendo igual depois; `migrate:status` limpo; `payload migrate` rodando em banco novo sem erro.

### T4 — Renderização no site
- `src/components/TextoRico.tsx` (server/client-safe, sem `'use client'` se possível; se o `RichText` do Lexical React exigir, tornar compatível com os dois usos): `<TextoRico valor={t.x} vars={{…}} className as="div|span" />`.
  - Bloco (padrão): `div.rich-text` com parágrafos/listas; reaproveitar os conversores de `RichText.tsx` (extrair `renderLink`/`SAFE_HREF` para um módulo comum, sem duplicar).
  - `inline`: para destinos que só aceitam conteúdo de frase (`<p>`, `<span>`, `<label>` raramente): parágrafos viram fragmentos separados por `<br>`; listas viram texto com `<br>`. Usar só onde não der para trocar o pai por `<div>`.
  - Lista branca de conversores: paragraph, text (bold/italic/underline/strikethrough), linebreak, list/listitem, link/autolink. Qualquer outro tipo → `null`.
  - Estilo: `.rich-text` em `globals.css` já existe; conferir margens dentro de cards/avisos pequenos (parágrafo único não deve ganhar margem extra — `> :first-child { margin-top:0 }`, `> :last-child { margin-bottom:0 }`; variante compacta se precisar) e que listas/links ficam visíveis no tema escuro.
- Trocar cada uso dos 52 campos (grep `t.<chave>` / `textos.<chave>` / desestruturações) por `<TextoRico>`; `preencher(...)` vira `vars`. Onde o pai era `<p>` com só o texto, trocar para `<TextoRico as="div">` mantendo as classes. Usos em atributos/meta → ou marcar o campo `formatado: false` (preferido) ou usar `ricoParaTexto`.
- `TextosGeraisProvider`/`useTextosGerais`: os formatados de `geral` (ex. `idadeTexto`, `erroTexto`) chegam ao cliente como JSON; o componente cliente renderiza com `TextoRico` (garantir que funciona em client component, ex. aviso 18+ e `global-error`).

### T5 — Testes
- Unit (`tests/unit/textos.test.ts` + novo `textos-rico.test.ts`): `textoParaRico`/`ricoParaTexto` ida e volta; `ricoTemTexto` (vazio, só espaços, parágrafo vazio, JSON inválido); `mesclarTextos` com rico vazio → original, rico preenchido → salvo, string legada → convertida; `preencherRico`; sanidade: todo campo longo tem `formatado` explícito; nenhum campo `formatado: true` em chave de Google/meta.
- Render (unit com `react-dom/server` `renderToStaticMarkup`): negrito/itálico/sublinhado/lista/link aparecem como `<strong>/<em>/<u>/<ul>/<a>`; `javascript:alert(1)` e `data:` **não** viram `href`; nó `text` com `<script>alert(1)</script>` sai escapado; nó desconhecido (ex. `upload`, `heading`) não aparece; `inline` não gera `<p>`/`<ul>`.
- Int (`tests/int/textos.int.test.ts`): salvar pelo Local API (como staff) um texto formatado → `getTextos` devolve o JSON; editor vazio → original; anônimo não consegue atualizar.
- E2E (`tests/e2e/textos.spec.ts`): no painel, editar um texto longo (ex. `inicio`/`espaco.intro` ou o que for mais simples de achar), aplicar negrito numa palavra e uma lista/link, salvar, abrir a página e ver `<strong>`/`<a>` no lugar certo; voltar ao original apagando o campo.
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:int`, Playwright `textos.spec.ts` + uma spec da área aberta que use textos longos (ex. home/contato/age gate). `pnpm build` se o ambiente permitir. Registrar números no SUMMARY.

### T6 — Guia e fechamento GSD
- `docs/painel/GUIA-DA-EQUIPE.md`, seção "Textos do site": como formatar (selecionar palavras → negrito/itálico/sublinhado/link/lista; barra fixa no topo do campo); títulos e botões continuam texto simples; apagar tudo e salvar volta ao original.
- `SUMMARY.md` neste diretório (`status: complete`), linha em "Quick Tasks Completed" do `.planning/STATE.md`.
- Commits atômicos por tarefa, mensagens em português no estilo do repo (`feat(textos): …`).

## Riscos
- **Perda de textos já editados** na migração varchar → jsonb: `up` converte dados, testado em banco com valores editados. O `down` devolve texto puro (perde só a formatação).
- **Tipos**: `Textos<K>` muda para os formatados; o `typecheck` aponta cada uso que precisa virar `<TextoRico>`. Não silenciar com `as string`.
- **HTML inválido** (`<div>` dentro de `<p>`, bloco dentro de `<label>`): hydration warnings. Auditar os pais; e2e sem erros de console de hydration.
- **Área aberta / SEO**: textos de meta continuam string; nada de conteúdo restrito muda de lugar.
- **Bundle do cliente**: `@payloadcms/richtext-lexical/react` em componente cliente (geral) — conferir que não puxa o editor inteiro; se pesar, renderizar os textos de `geral` no servidor e passar ReactNode.
