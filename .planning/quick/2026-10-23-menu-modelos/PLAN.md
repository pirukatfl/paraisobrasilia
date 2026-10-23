# Quick: Modelos sempre no menu

Pedido do cliente (2026-10-23): "falta adicionar esse menu" (galeria Modelos, fase 06.1, nao aparecia no menu).

1. `src/lib/site/nav.ts`, `Header.tsx`, `Footer.tsx`: Modelos sempre no menu, menu mobile e rodape, na mesma posicao (Espaco, Modelos, ClassiSex). Sem o gating `hasModels` (D-08); `hasPublishedModels` segue em `queries.ts` (usada em testes de integracao).
2. `/modelos` nao da mais 404 sem modelo publicada: titulo + intro + `EmptyState` ("Em breve, as modelos da casa aqui."). `/modelos/<slug>` nao publicada continua 404.
3. Sitemap inalterado: `/modelos` so entra com modelo publicada (sem pagina vazia no Google).
4. Testes e2e `modelos.spec.ts` ajustados ao novo comportamento; guia da equipe (secao Modelos) atualizado.
