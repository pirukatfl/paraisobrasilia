# Resumo: Flyer ampliado na home

- Home: clicar no flyer (carrossel ou card da grade) abre o flyer grande no `Lightbox` compartilhado ("Flyers das festas"), navegavel entre todas as proximas festas (setas, teclado, swipe); Esc fecha e devolve o foco ao botao clicado.
- Titulo/data do card continuam sendo o link "Ver detalhes da festa X"; o lightbox tem tambem o link "Ver detalhes da festa" para a festa aberta (`LightboxSlide.href`, opcional; galerias de /espaco, modelos e ClassiSex inalteradas).
- `PartyGrid` virou client component; card = botao do flyer + link irmaos (sem interativos aninhados).
- Testes: novo `tests/e2e/home-flyer-ampliado.spec.ts`; `home.spec`, `flyer-formato.spec` e `staging-smoke.spec` acham o flyer pelo botao "Ampliar flyer da festa X". Gate: typecheck, lint, Vitest unit 421, Playwright (home, carrossel, flyer-formato, party, perf-galeria, home-sem-festas, espaco, novo spec) 58 passed; `staging-smoke` nao rodado aqui.
- Follow-up: `Lightbox` ganhou a prop opcional `fitScreen` (default false; so o ramo next/image) que amplia flyers pequenos para preencher a area disponivel mantendo a proporcao (`fill` + `object-contain`); `PartyGrid` a usa. Novo teste e2e desktop confere que o flyer aberto ocupa >=60% da altura ou >=80% da largura da viewport.
