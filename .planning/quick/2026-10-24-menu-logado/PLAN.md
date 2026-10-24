# Quick: menu único para assinante logado

Pedido do cliente (2026-10-24): com o assinante logado o menu do topo passa a ser
Festas · Quem somos · Espaço · Modelos · ClassiSex · Recados · Contos · Dicas Hot · Contato ·
Meus anúncios · Minha assinatura · Trocar senha · Sair, **no lugar** do menu principal.
Deslogado, o menu principal atual fica igual. Nunca dois menus na tela.

## Decisões

- **Detecção no servidor.** `Header` (layout raiz) vira `async` e escolhe a lista pelo
  `getAssinante()` de `src/lib/assinantes/session.ts` (sessão de equipe = deslogado). Envolto em
  try/catch como o `Footer` (prerender sem banco = menu público). Só um menu vai no HTML: nada de
  esconder com CSS, nada de cookie auxiliar. Quase todas as páginas já são `force-dynamic`; a única
  ISR (`/festas/[slug]`) passa a ser renderizada por requisição, custo aceito (uma leitura, igual à home).
- **Destinos do menu logado:** Festas `/`, Quem somos (mesmos filhos Normas/Regras/Dicas no mobile),
  Espaço `/espaco`, Modelos `/modelos`, ClassiSex `/area-do-assinante/classisex`,
  Recados `/area-do-assinante/mensagens` (com o `UnreadBadge`), Contos `/area-do-assinante/contos`,
  Dicas Hot `/area-do-assinante/dicas-hot`, Contato `/contato`, Meus anúncios
  `/area-do-assinante/meus-anuncios`, Minha assinatura `/area-do-assinante` (ativo só no caminho exato),
  Trocar senha `/area-do-assinante/senha`, Sair (botão de formulário com a server action `sair`).
- **Sub-menu da área do assinante removido** de `(membros)/layout.tsx`: o menu do topo já tem tudo
  (era o "segundo menu").
- **Desktop (≥ xl):** 13 itens não cabem numa linha de 1200 px; a lista logada quebra em duas linhas
  alinhadas à direita dentro do mesmo `<nav aria-label="Principal">`. Abaixo de xl, o mesmo menu mobile
  (botão Menu) com os 13 itens.
- Login/logout por server action mexem no cookie, então o Next re-renderiza o layout: o menu troca na
  hora (verificar no e2e).

## Passos

1. `src/lib/site/nav.ts`: `NavItem` ganha `exact?` e `badge?`; `getMemberNavItems()`; `isActivePath` respeita `exact`.
2. `Header.tsx` async + escolha da lista; `Nav`/`MobileMenu` recebem `logado` e mostram badge e Sair.
3. `(membros)/layout.tsx` sem o `<nav>`.
4. Testes e2e: novo `menu-logado.spec.ts` (logado: lista exata, um único nav, sem "Assine Já"/"Área do
   assinante", Sair volta ao menu público; deslogado: menu atual); specs que usavam
   `navigation 'Área do assinante'` passam a usar o menu do topo.
