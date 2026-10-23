# Quick: Flyer ampliado na home

Pedido do cliente (2026-10-23): "no / que mostra as festas, ao clicar em uma festa, seria bacana se a imagem da festa abrisse maior".

Leitura escolhida: na home, clicar no FLYER (carrossel e cards da grade) abre o flyer grande no
lightbox ja existente (`src/components/Lightbox.tsx`), navegavel entre todas as proximas festas
(setas, teclado, swipe). O titulo/data do card continua sendo o link "Ver detalhes da festa X"
para `/festas/<slug>`, e o lightbox mostra tambem um link "Ver detalhes da festa" para a festa aberta.

1. `src/lib/gallery/types.ts`: `LightboxSlide` ganha `href?: string` opcional.
   `Lightbox.tsx`: rodape mostra o label e, com `href`, um `next/link` "Ver detalhes da festa".
2. `src/components/PartyGrid.tsx` vira client component: guarda o indice aberto, monta os slides
   (flyer `gallery` 1600 px, label "Titulo · data"), um unico `<Lightbox label="Flyers das festas">`,
   e devolve o foco ao botao que abriu (como `Gallery.tsx`).
3. `PartyCarousel.tsx` e `PartyCard.tsx`: card vira `<div>` com dois alvos irmaos (sem aninhar
   interativos): `<button aria-label="Ampliar flyer da festa X">` com o `FlyerFrame` e o `<Link>`
   "Ver detalhes da festa X" (titulo/data, mantem `data-featured-party` e href). Prop `onOpenFlyer`.
4. Testes e2e: abrir o flyer na home abre o dialog com a imagem grande, setas trocam de festa,
   Esc fecha e devolve foco, link "Ver detalhes" no dialog leva a `/festas/<slug>`.
   Testes atuais que usam o link "Ver detalhes da festa X" continuam valendo.
