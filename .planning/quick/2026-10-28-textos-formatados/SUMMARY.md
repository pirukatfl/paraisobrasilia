---
type: quick
slug: textos-formatados
date: 2026-10-28
executor: sonnet
status: complete
---

# Resumo: editor de texto formatado nos Textos do site

Pedido do cliente (2026-10-28): editor de texto no painel para os textos do site, com a formatação aparecendo no site.

## O que mudou

- T1 `src/lib/textos`: `CampoTexto.formatado` (explícito; `true` tipa o campo como `TextoRico` em `Textos<K>`), `rico.ts` (`textoParaRico`, `ricoTemTexto`, `ricoParaTexto`, `preencherRico`), `preencher.ts` (separado para evitar import circular), `mesclar.ts` (editor vazio = original; string legada = convertida), `editor.ts` (Lexical: parágrafo, negrito, itálico, sublinhado, listas, link, barra fixa e ao selecionar).
- T2 `src/globals/Textos.ts`: campo `richText` com `defaultValue` = original convertido; descrição do global cita a formatação só nas áreas que têm campo formatado. Tipos e import map regerados.
- T3 migração `20261028_165121_textos_formatados` (46 colunas), ver abaixo.
- T4 `src/components/TextoRico.tsx` (conversores próprios em lista branca, sem `dangerouslySetInnerHTML`; modo `inline`; `vars` para `{nome}`), `richLink.tsx` (SAFE_HREF e `renderLink` extraídos de `RichText.tsx`, sem duplicar), CSS `.texto-rico`. `EmptyState` e `AssineJaCta` aceitam `string | TextoRico`; aviso 18+ (cliente) recebe o JSON.
- T5 testes: `tests/unit/textos-rico.test.ts` (novo), `textos.test.ts`, `tests/int/textos.int.test.ts`, `tests/e2e/textos.spec.ts`.
- T6 guia da equipe (`docs/painel/GUIA-DA-EQUIPE.md`).

## Campos

Formatados (`formatado: true`): 44 dos 52 textarea + 2 irmãos curtos (ver desvios) = 46.
Texto puro (`formatado: false`), 8:
- Meta/Google: `geral.googleDescricao`, `assine.googleDescricao`, `contato.descricaoGoogle`, `classisex.publicoGoogleDescricao`, `contos.googleListaDescricao`, `dicasHot.googleListaDescricao`.
- Dentro de `<label>`: `meusAnuncios.declaracao`, `enviarConto.consentimento`.
`espaco.intro` é formatado e o `<meta description>` usa `ricoParaTexto`.

## Migração

Por coluna: remove o DEFAULT, cria coluna temporária `jsonb`, converte cada linha com `textoParaRico` (cópia congelada no arquivo; vazio vira NULL), apaga a antiga, renomeia, define o DEFAULT jsonb do original. `down` faz o inverso (`jsonb` para texto puro, DEFAULT = original; perde formatação e endereço dos links, as palavras ficam). Testada em banco com valores editados (acentos, aspas, apóstrofo, `\n`, só espaços): up, down e up de novo preservam; `migrate:create` seguinte diz "No schema changes".

## Desvios

- `textoAjuda` e `gerDicaGratis` (curtos) também ficaram formatados, para não misturar string e rico em ternários (`AdFormFields`, `OwnerMediaManager`). A migração foi regerada com as 2 colunas a mais.
- `TextoRico` é componente próprio, não o `RichText` do Lexical (que não tem modo inline e ignora `className` com `disableContainer`).
- Typecheck não pega objeto como filho de fragmento (`<>{t.x} </>`): auditei cada chave por grep; `entrarEsqueciSemEmail` precisou de `TextoRico inline`.
- Um valor NULL salvo (campo apagado) aparece como editor vazio no painel, enquanto o site mostra o original (igual ao comportamento anterior com campo vazio).

## Resultados do gate

- `pnpm typecheck`: limpo. `pnpm lint`: 0 erros, 1 aviso que já existia (`recados-privados.spec.ts`).
- `pnpm test:unit`: 47 arquivos, 518 testes ok.
- `pnpm test:int`: 42 arquivos, 406 testes ok.
- `pnpm build`: ok.
- Playwright (textos, age-gate, classisex-publico, classisex-sem-conta, contato, contos-envio, contos, espaco, conta-gratuita, mensagens; mobile + desktop): 82 passaram, 2 ignorados, 3 falhas, 11 não rodaram em cascata. As 3 falhas eram instáveis: `classisex-sem-conta:85` (meta robots duplicado, já registrado no quick anterior), `classisex-sem-conta:217` (e-mail ao visitante) e `conta-gratuita:171` (delete 400 no setup). Repetidas isoladas, `classisex-sem-conta` (9/9) e `conta-gratuita` (10/10) passam, e `classisex-sem-conta` também passa na base `c84f516`. A primeira execução de `textos.spec.ts` após subir o servidor frio falhou uma vez na home (sem festas ainda); passou na repetição.

## Ambiente

Em banco novo `payload migrate` falha na base (`20261019_023755_contact_global` lê coluna que só existe depois); já era assim antes. Para o banco de teste: criei o schema da base com push (SITE_ENV=development), registrei as migrações existentes e só então rodei a nova.
