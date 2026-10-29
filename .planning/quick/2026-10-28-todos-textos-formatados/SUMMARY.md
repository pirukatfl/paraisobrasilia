---
type: quick
slug: todos-textos-formatados
date: 2026-10-28
executor: sonnet
status: complete
---

# Resumo: formatação em todos os Textos do site

Pedido do cliente (2026-10-28): todos os textos de **Textos do site** podem ser formatados no painel, e a formatação aparece no site.

## O que mudou

- T1 registro: `formatado` saiu; todo campo é editor. `bloco: true` (52 campos: os 46 do PR #23 + os longos que eram puros) usa o editor completo; os demais (499) usam o editor de **linha** (negrito, itálico, sublinhado, riscado; sem links nem listas). `soTexto: true` (45 campos) marca destinos que só aceitam texto puro; o painel mostra o aviso `AVISO_SO_TEXTO` na ajuda do campo. `Textos<K>` agora é `TextoRico` em todos os campos.
- T2 global com `editorBloco`/`editorLinha` (`src/lib/textos/editor.ts`) e migração `20261028_224917_todos_textos_formatados` (505 colunas varchar → jsonb, mesmo padrão do PR #23: coluna temporária, conversão com cópia congelada de `textoParaRico`, vazio → NULL, DEFAULT jsonb do original; `down` simétrico).
- T3 site: todos os usos trocados por `<TextoRico linha />` (ou bloco) e `textoPuro(...)` nos destinos `soTexto`; menu, menu mobile, abas, botões, formulários, avisos, e-mails.
- Correção na retomada: `TextoRico` inline sem `id`/`role`/`className` não gera `<span>`; texto sem formatação sai idêntico à string de antes (a regex de `fase5-seguranca.spec.ts:349` sobre `>Assine Já` falhava por causa do span).
- T5 guia da equipe atualizado.

### Campos `soTexto` (formatação não aparece)
Títulos e descrições do Google/aba (`googleTitulo`, `googleDescricao`, `*GoogleTitulo`, `*GoogleDescricao`, `googleLista`, `membrosGoogle*`, `google*NaoEncontrad*`, `descricaoGoogle`, …), textos de botões que trocam por estado em JS ou viram `value`/`aria-*` (`formEnviando`, `botaoEnviando`, `visitanteBotaoEnviando`, `carregarMais`, `fimDaLista`, `denunciarBotao`), mensagens pré-preenchidas do WhatsApp (`cartaoWhatsappMensagem`, `comprovanteMensagem`), placeholders/rótulos de atributo (`campoEmail`, `reenviarCampo`, `denunciarDetalhes`), avisos que entram dentro de outra frase (`renovFaltam`, `renovUltimoDia`, `contaTipoGratuita`), etc. Lista completa: `grep -rn "soTexto: true" src/lib/textos/areas`.

## Desvios

- O executor foi interrompido duas vezes por reinício do ambiente; a verificação final (gate, base, migração) foi feita na retomada.
- Um valor de teste manual (`menu_botao = "Menu & <b>co</b>"`) ficou no banco de teste após a interrupção e derrubou specs do menu na primeira rodada; os textos do banco de teste foram voltados ao padrão e as specs passaram.

## Resultados do gate

- `pnpm typecheck`: limpo. `pnpm lint`: 0 erros, 1 aviso que já existia (`tests/e2e/recados-privados.spec.ts`).
- `pnpm test:unit`: 47 arquivos, 528 testes ok. `pnpm test:int`: 42 arquivos, 407 testes ok.
- `pnpm build`: ok.
- Playwright completo (mobile + desktop), última rodada: 569 passaram, 9 falharam, 22 não rodaram (séries interrompidas pelas falhas), 150 ignorados.
  - As 9 falhas também falham na base `ec7aff0` (rodadas no mesmo ambiente): `anuncio-midia:79` (mobile/desktop), `assinante-login:87` (mobile), `login-site-antigo:53` (mobile), `senhas:33` (mobile/desktop; procura `nav[aria-label="Área do assinante"]`, que não existe no código), `admin-aprovar-lista:83`, `admin-sessao:10`, `bloqueio-denuncia:119` (desktop). Não têm relação com esta mudança.
- Migração no banco de teste: down → valor editado com acentos, aspas, apóstrofo e `\n` → up preserva o texto (quebra de linha vira `linebreak`); só espaços → NULL (original); down de novo devolve o texto; `migrate:create` seguinte: "No schema changes detected".

## Painel

Área com mais campos (ClassiSex, 93 editores): ~1,0–1,4 s para abrir com `next start` (produção); ~8 s no `next dev`.
