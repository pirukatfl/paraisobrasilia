# Quick: ClassiSex rolagem infinita

Client: carregar anúncios enquanto rola, em vez de "Anteriores / Próximos".

- Server renders page 1 (or ?pagina=N) as today; new client `InfiniteAds` appends next pages via IntersectionObserver (600px), button fallback, end line, dedupe by id.
- Server action `loadMoreClassisex` decides DTO kind from the session (never the client); public returns redacted DTOs only; page clamped (`clampPage`).
- Pagination links kept inside `<noscript>`.
- Tests: int (`classisex-more.int.test.ts`), e2e scroll in `classisex-assinante.spec.ts`.
