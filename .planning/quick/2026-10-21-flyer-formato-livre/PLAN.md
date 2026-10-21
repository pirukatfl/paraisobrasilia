# Quick: flyer em formato livre (sem corte) + festa em destaque na home

## Problema
Flyer enviado em 16:9 (2000x1125) aparecia cortado numa caixa 4:5 no card da home e na pagina da festa.
A cliente posta flyers em formatos variados (quadrado, 4:5, stories 9:16, paisagem) e quer ve-los inteiros.
Extra: no site antigo o flyer da proxima festa era grande (~1000 px, metade da tela); no novo o card tem ~330 px.

## Tarefas
1. Derivado sem corte: usar o size `gallery` (largura 1600, withoutEnlargement, sem altura) em vez de `portrait`/`square`
   (evita nova coluna/migracao). `og` permanece igual (1200x630, contain).
2. Proporcao real: `FlyerFrame` usa width/height da midia (`lib/parties/flyer-frame.ts`); caixa com `aspect-ratio` do proprio flyer,
   `object-contain` sobre o fundo da marca. Cards: minimo 3:4 (stories 9:16 ficam com barras laterais, nao dominam a grade);
   destaque e pagina da festa: sem minimo, altura maxima 80vh/85vh.
3. Home: primeira festa vira `PartyFeatured` (largura total ate 1000 px, titulo/data abaixo); demais festas na grade de cards alinhada ao topo.
4. `flyerFormat`: campo mantido (coluna e default, sem migracao destrutiva), oculto no admin e nao usado pelo site.
   Descricao do upload: "Envie no formato que usa nas redes (quadrado, vertical, stories ou horizontal); o site mostra inteiro."
5. Consistencia: sitemap nao tem imagens, nao ha JSON-LD de festa, og inalterado.
6. Testes: unit `flyer-frame`, e2e `flyer-formato.spec.ts` (destaque, paisagem sem corte, stories limitado, pagina), fixtures
   paisagem/stories e seed; ajuste de metadata/parties tests.

## Verificacao
typecheck, lint, Vitest completo, Playwright festas (home, party, flyer-formato, admin-party, seo, home-sem-festas).
