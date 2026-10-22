# Summary: ClassiSex rolagem infinita

Done. Both boards (`/classisex`, `/area-do-assinante/classisex`) now load further pages while scrolling.

- `src/components/classisex/InfiniteAds.tsx` (client): IntersectionObserver sentinel (rootMargin 600px), loading text, "Carregar mais" button (also error fallback), end-of-list line, dedupe by id. Same card components and grid classes. Server pagination links are rendered inside `<noscript>`; `?pagina=N` still works server-side.
- `src/lib/classisex/more.ts` + `more-actions.ts` (server action): members DTOs only if the server-side session has an active subscription (`scope: 'membros'` forged by a visitor still yields public DTOs); public path uses the tagged cached `getPublicAds`; city filter ignored publicly; `clampPage` added to `board.ts`.
- `PublicBoard.tsx` and the members page use `InfiniteAds` (keyed by filters/page so a filter change resets).
- Tests: `tests/int/classisex-more.int.test.ts` (redaction, member DTOs, clamping); e2e "pagination keeps the filters" replaced by an infinite-scroll test (members + public, URL unchanged, deep link page 2). Docs: GUIA-DA-EQUIPE ClassiSex section.
- Results: typecheck, lint clean; int ad-visibility + classisex-more pass (15); classisex e2e specs (assinante, publico, seguranca, antigos) 64 passed, 2 skipped (pre-existing).
