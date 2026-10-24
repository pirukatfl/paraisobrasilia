# Resumo: menu unico para assinante logado

- `getMemberNavItems()` em `src/lib/site/nav.ts` (12 itens + Sair); `NavItem` ganha `exact` e `badge`; `isActivePath` respeita `exact` (Minha assinatura so no caminho exato). `getNavItems()` intacto.
- `Header` agora `async`: `getAssinante()` em try/catch (sem banco = menu publico) escolhe a lista; so um menu vai no HTML. `Nav` e `MobileMenu` recebem `logado`, mostram o `UnreadBadge` em Recados e o botao Sair (form com a server action `sair`).
- Desktop logado: `<ul>` com `flex-wrap justify-end gap-x-4 gap-y-0` (duas linhas alinhadas a direita; conferido em 1280 e 1440). Menu publico com as mesmas classes de antes.
- `(membros)/layout.tsx` sem o `<nav aria-label="Area do assinante">` (o menu do topo e o unico).
- Testes: novo `tests/e2e/menu-logado.spec.ts` (deslogado, logado desktop + pagina publica, mobile, Sair sem reload) e `tests/e2e/helpers/menu.ts` (`headerMenu`, abre o painel no projeto mobile). Specs que usavam `navigation 'Area do assinante'` (classisex-assinante, contos, dicas-hot, mensagens, meus-anuncios, minha-assinatura, recados-privados) apontam para o menu do topo; listas de mensagens e recados-privados agora esperam os 12 itens.
- Obs.: `browser.newContext` herda o dispositivo do projeto (Pixel 7 no projeto mobile), por isso o helper abre o menu quando preciso.

Resultados: `pnpm typecheck` e `pnpm lint` limpos; `pnpm test:unit` 41 arquivos/421 testes ok; playwright menu-logado + classisex-assinante + contos + dicas-hot + mensagens + meus-anuncios + minha-assinatura + recados-privados: 112 passed, 2 skipped (skips ja existentes); shell + modelos + institucional + assine-ja: 48 passed, 6 skipped (skips de projeto mobile/desktop ja existentes); 0 falhas.

## Ajustes do mesmo dia (2026-10-24)

- "Modelos" passa a se chamar "Profissionais e amadoras" no menu público, no menu logado e no rodapé (o link segue `/modelos`; título da página inalterado). O menu público continua em uma linha a 1280 px.
- "Recados" saiu do menu logado e não ganhou link em outro lugar (escolha do cliente). A caixa segue em `/area-do-assinante/mensagens`; o `UnreadBadge` ficou sem uso e foi removido (a rota `nao-lidas` permanece).
- Resultados: typecheck e lint limpos; vitest unit ok; playwright menu-logado + modelos + mensagens + recados-privados + shell + fase5-seguranca + minha-assinatura: 114 passed, 4 skipped, 0 falhas.
