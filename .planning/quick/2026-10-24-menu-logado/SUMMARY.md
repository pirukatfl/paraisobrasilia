# Resumo: menu unico para assinante logado

- `getMemberNavItems()` em `src/lib/site/nav.ts` (12 itens + Sair); `NavItem` ganha `exact` e `badge`; `isActivePath` respeita `exact` (Minha assinatura so no caminho exato). `getNavItems()` intacto.
- `Header` agora `async`: `getAssinante()` em try/catch (sem banco = menu publico) escolhe a lista; so um menu vai no HTML. `Nav` e `MobileMenu` recebem `logado`, mostram o `UnreadBadge` em Recados e o botao Sair (form com a server action `sair`).
- Desktop logado: `<ul>` com `flex-wrap justify-end gap-x-4 gap-y-0` (duas linhas alinhadas a direita; conferido em 1280 e 1440). Menu publico com as mesmas classes de antes.
- `(membros)/layout.tsx` sem o `<nav aria-label="Area do assinante">` (o menu do topo e o unico).
- Testes: novo `tests/e2e/menu-logado.spec.ts` (deslogado, logado desktop + pagina publica, mobile, Sair sem reload) e `tests/e2e/helpers/menu.ts` (`headerMenu`, abre o painel no projeto mobile). Specs que usavam `navigation 'Area do assinante'` (classisex-assinante, contos, dicas-hot, mensagens, meus-anuncios, minha-assinatura, recados-privados) apontam para o menu do topo; listas de mensagens e recados-privados agora esperam os 12 itens.
- Obs.: `browser.newContext` herda o dispositivo do projeto (Pixel 7 no projeto mobile), por isso o helper abre o menu quando preciso.

Resultados: `pnpm typecheck` e `pnpm lint` limpos; `pnpm test:unit` 41 arquivos/421 testes ok; playwright menu-logado + classisex-assinante + contos + dicas-hot + mensagens + meus-anuncios + minha-assinatura + recados-privados: 112 passed, 2 skipped (skips ja existentes); shell + modelos + institucional + assine-ja: 48 passed, 6 skipped (skips de projeto mobile/desktop ja existentes); 0 falhas.
