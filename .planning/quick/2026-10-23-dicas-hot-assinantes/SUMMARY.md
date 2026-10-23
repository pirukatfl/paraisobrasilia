# Summary: Dicas Hot so para assinantes

Dicas Hot agora segue o paywall dos Contos.

- `lib/dicas/dto.ts`: DTO publico leva so `open` (splitConto, 3 blocos, mesma regra) + `hasMore`; `MemberDicaDTO` leva o texto completo. Cards e description usam o trecho aberto. Sem campo novo nem migracao.
- `lib/dicas/queries.ts` (membros, sem cache); paginas `/area-do-assinante/dicas-hot` e `/[slug]` com `requireActiveSubscription`/InactivePanel, noindex; item "Dicas Hot" no menu da area; comparativo de planos diz "Contos e Dicas Hot completos".
- Publico `/dicas-hot/[slug]`: capa conferida, trecho, `AssineJaCta`; a lista tem CTA. JSON-LD sem texto, `isAccessibleForFree:false`.
- Home, rodape, menu, sitemap e redirects intocados. Guia da equipe atualizado.
- Testes: unit dica-dto e tier, e2e dicas-hot (sem sentinela em HTML/RSC/JSON-LD, conta gratuita, assinante, link publico->membros).

Resultados: tsc e eslint limpos; vitest 78 arquivos/749 testes ok; playwright dicas-hot, contos, painel-contos, shell, modelos, assine-ja, cadastro, conta-gratuita, fase5, minha-assinatura ok. seo.spec (/quem-somos) falha: paginas institucionais ausentes no DB de teste copiado (vitest resetDatabase apaga), nao relacionado.
