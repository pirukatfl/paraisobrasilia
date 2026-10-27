---
type: quick
slug: classisex-mais-contatos
date: 2026-10-27
executor: sonnet
status: complete
---

# Resumo: mais campos de contato no anúncio do ClassiSex

Pedido do cliente (2026-10-27): e-mail, links de outras plataformas e como a pessoa prefere ser contactada, além de WhatsApp e Telegram. Só assinantes com acesso ativo veem; a área aberta, contas gratuitas e assinaturas vencidas não recebem nada disso.

## O que mudou

- T1 `src/lib/classisex/rules.ts`: `normaliseEmailContato`, `isValidEmailContato`, `normaliseLink(s)`, `isValidLink` (só http/https, host com ponto, sem espaços nem credenciais, até 300), `normaliseObservacao` (até 120), `platformLabel`, `contatoData`. Erros `emailContato`, `links`, `observacao`.
- T2 coleção `ads` (grupo `contato`: `email`, `links[{url}]` máx. 5, `observacao`), hook do painel com as mesmas regras. Migração `20261027_190955_classisex_mais_contatos` (colunas `contato_email`, `contato_observacao` e tabela `ads_contato_links`, `down` simétrico).
- T3 formulário compartilhado (assinante e sem conta): e-mail, 3 links visíveis + 2 em "Adicionar mais links" (sem JavaScript), observação; ações, rota `/classisex/anunciar/enviar`, valores de edição.
- T4 exibição: `toMemberAdDTO` (mailto, botões por plataforma, observação), `ContactLinks` (links com `nofollow ugc`), cartão do dono, painel de moderação. `toPublicAdDTO` não lê `contato`.
- T5 Textos do site (Meus anúncios e ClassiSex) e migração `20261027_191302_classisex_mais_contatos_textos`.
- T6 testes unitários, de integração (`tests/int/ads-mais-contatos.int.test.ts`) e e2e.

## Desvio do plano

Os textos novos são colunas com `DEFAULT` nas tabelas das áreas de textos, então precisaram de uma segunda migração (T5). Ela também atualiza as linhas que ainda guardam o padrão antigo de `contato_legenda` e `anunciar_intro`.

## Resultados do gate

- `pnpm typecheck`: limpo.
- `pnpm lint`: 0 erros, 1 aviso que já existia (`tests/e2e/recados-privados.spec.ts`).
- `pnpm test:unit`: 46 arquivos, 499 testes ok.
- `pnpm test:int`: 42 arquivos, 402 testes ok (uma primeira execução teve falhas em `aviso-novo-cadastro`, que passaram isoladas e na repetição completa).
- Playwright (classisex-assinante, meus-anuncios, classisex-publico, classisex-seguranca, conta-gratuita-seguranca, classisex-sem-conta, moderacao, textos; mobile + desktop): 122 passaram, 4 ignorados, 1 falha, 3 não rodaram por causa dela.
  - A falha é `moderacao.spec.ts:41` (clique em "Ver fila" no painel). Também falha 3 de 3 vezes com o código da base `183066b` neste ambiente; o mesmo clique funciona com espera. Não tem relação com esta mudança.
  - Uma execução anterior mostrou `classisex-sem-conta.spec.ts:85` no mobile falhando por `meta[name=robots]` duplicado (modo estrito); passou no desktop e na execução seguinte.

## Privacidade

Testes cobrem: DTO público, `loadMoreAds` das audiências sem acesso, `findPublicAds`, API REST anônima e de conta gratuita e de assinatura vencida (sem documentos), HTML/RSC da área aberta e de conta gratuita/vencida (e2e), com e-mail, links e observação plantados.
