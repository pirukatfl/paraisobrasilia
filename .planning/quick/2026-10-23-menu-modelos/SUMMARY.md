# Resumo: Modelos sempre no menu

- `getNavItems()` sem parametro: Modelos fixo entre Espaco e ClassiSex; Header (agora sincrono) e Footer sem consulta ao banco para isso.
- `/modelos` vazio: 200 com titulo, intro e `EmptyState` com atalhos para festas e espaco; slug nao publicado segue 404.
- Sitemap intocado (so lista `/modelos` com modelo publicada).
- `tests/e2e/modelos.spec.ts`: estado vazio (200), menu/rodape sempre com Modelos, sitemap condicional, despublicar leva `/modelos` ao estado vazio. Guia da equipe atualizado.

Resultados: `pnpm typecheck` e `pnpm lint` limpos; vitest 80 arquivos/794 testes ok; playwright modelos + modelos-seo + shell: 27 passed, 3 skipped (skips de projeto mobile/desktop ja existentes), 0 falhas.
