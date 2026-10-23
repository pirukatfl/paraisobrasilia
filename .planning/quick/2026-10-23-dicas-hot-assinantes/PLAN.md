# Quick: Dicas Hot so para assinantes (igual Contos)

Pedido do cliente: "o dicas hot deve ter a mesma funcionalidade do contos, que para ler tudo precisa ser assinante".

1. `src/lib/dicas/dto.ts`: split publico/membro via `splitConto` (mesma regra, 3 blocos abertos por padrao, sem campo novo/migracao). Publico: `open` + `hasMore`, nunca o lexical completo. Membro: `texto` completo.
2. `src/lib/dicas/queries.ts` (membros, sem cache) + `public.ts`/`reads.ts` inalterados nas leituras.
3. Paginas: `/dicas-hot/[slug]` (capa conferida + trecho + `AssineJaCta`), `/dicas-hot` (CTA), `/area-do-assinante/dicas-hot` e `/[slug]` (requireActiveSubscription), item no menu de membros, comparativo de planos.
4. JSON-LD sem texto completo, `isAccessibleForFree: false` (como contos nao tem JSON-LD, so o paywall schema).
5. Testes: unit (dto), int (leituras membro), e2e dicas-hot atualizado + membros. Guia da equipe.
