# Summary: flyer em formato livre + festa em destaque

**Resultado:** o flyer aparece inteiro, na proporcao real do arquivo enviado (quadrado, 4:5, stories, paisagem), na home e na pagina da festa. A proxima festa e um flyer grande no topo da home.

## Mudancas
- `src/lib/parties/queries.ts`: usa o derivado `gallery` (1600 px, sem corte, sem ampliar); sem `flyerFormat` no DTO.
- `src/lib/parties/flyer-frame.ts` + `src/components/party/FlyerFrame.tsx`: caixa com `aspect-ratio` do proprio flyer, `object-contain` sobre o fundo da marca. Cards: minimo 3:4 (9:16 recebe barras, nao domina a grade). Destaque/pagina: altura maxima 80vh/85vh.
- `PartyFeatured` (novo): primeira festa em largura total ate 1000 px, titulo e data abaixo. `PartyGrid`: demais festas em grade alinhada ao topo (`items-start`). `PartyCard` sem `featured`/`h-full`.
- `festas/[slug]/page.tsx` usa `FlyerFrame`.
- `Parties.ts`: `flyerFormat` oculto no admin, coluna e default mantidos (sem migracao); descricao do upload: "Envie no formato que usa nas redes (quadrado, vertical, stories ou horizontal); o site mostra inteiro."
- og (1200x630 contain) inalterado. Sitemap nao tem imagens e nao ha JSON-LD de festa: nada a ajustar.
- Testes: `tests/unit/flyer-frame.test.ts`, `tests/e2e/flyer-formato.spec.ts` (destaque, paisagem 16:9 sem corte, stories limitado, pagina), fixtures `flyer-landscape.jpg` (2000x1125) e `flyer-stories.jpg`, seed e global-setup com festas Paisagem/Stories, `admin-party.spec` e testes de metadata/parties ajustados.
- Infra de teste: guarda de banco aceita `paraiso_test_<sufixo>`; `playwright.config.ts` aceita `E2E_PORT`.

## Resultados
typecheck e lint limpos; Vitest 68 arquivos / 647 testes passando; Playwright festas: flyer-formato, home, party, seo (exceto abaixo), admin-party passando.
Falhas sem relacao com flyers (textos de paginas institucionais no banco clonado): `home-sem-festas` (texto "Quem somos") e `seo` titulo de /quem-somos.

## Desvios
Sem migracao: `gallery` em vez de novo size `flyer` (novo size exigiria colunas).
