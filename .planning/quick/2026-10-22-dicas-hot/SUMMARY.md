# SUMMARY — Dicas Hot

## Plan A (b4f5467, 8d355ba)
Coleção `dicas` só da equipe, com rascunho/publicar (maxPerDoc 20), sem plugin SEO (I-5). Tags de cache `dicas` e `dica:<slug>` expiradas a cada mudança, inclusive o slug anterior. Migração `20261022_102706_dicas`. Leituras só publicadas, mais novas primeiro, 12 por página. DTOs mostram capa/og só com `capaConferida === true`.

## Plan B (0d2ee98, aaefedc)
`/dicas-hot` e `/dicas-hot/[slug]` com texto integral, canonical, og:image (capa conferida ou `/og-default.jpg`), JSON-LD Article, "Leia também", 404 para rascunho. Link no rodapé após Contos; seção na home (oculta se vazia); sitemap. Redirect antigo `/dicas-hot` → `/quem-somos/dicas` removido.

## Plan C (726175e, 0cce1dc)
Importador `pnpm import:dicas` (--dry-run, --export, --listar-capas, --from-bundle, --uploads), idempotente por wpId, fixture sintética. Testes: unit 20, int 17.

## Plan D (orquestrador)
Dump real: 30 dicas encontradas, 5 Elementor, 15 com capa, 0 rascunhos/ignoradas/duplicadas, 20 para conferir. Pacote `src/migrations/seed/dicas-wp.json` (30 dicas, 30 links antigos); varredura sem e-mails, telefones ou WhatsApp. Capas referenciadas: 15.

## Plan E (a8e9700, cf0f45a, fd37fb9, plus fix)
- **E1 (a8e9700):** migração `20261022_120000_dicas_wp_bundle` (sem schema, carrega `seed/dicas-wp.json` pelo `loadDicasBundleIfPresent`, idempotente por wpId, log só de contagens), registrada por último no `index.ts` e commitada JUNTO com o pacote (30 dicas, 30 links antigos). `tests/unit/dicas-bundle.test.ts`: pacote válido, os 30 slugs antigos cobertos, todo destino é dica publicada, migração última e arquivo+pacote juntos. Aplicada no banco de teste (`paraiso_test_dicas`: 15 dicas após a carga + testes).
- **E2 (cf0f45a):** `buildLegacyRedirects(markdown, contos, dicas)`; cada post `dicas-hot` vai para `/dicas-hot/<slug>` (ou `/dicas-hot` se o legado for null/ausente); regras `/category/dicas-hot`, `/category/dicas-hot/:path*` (antes de `/category/:slug`) e `/dicas-hot/page/:n`; `LEGACY_SEM_DESTINO` = só `/o-que-e-dogging`; nenhuma origem igual a `/dicas-hot`. Mapa regenerado. e2e: `/dicas-hot/`, `/category/dicas-hot/`, `/dicas-hot/page/2/` e as 30 dicas antigas terminam no destino do mapa só com 301/308; `/o-que-e-dogging/` termina em 404.
- **E3 (fd37fb9):** GUIA-DA-EQUIPE (seção "Dicas Hot", Capa conferida, filtro "Conferir texto importado", diferença para Dicas de Quem somos; linha dos links antigos trocada), STAGING.md 7.7 (deploy + capas), `.env.example`, linha na tabela Quick Tasks do STATE.md.
- **Correção de bloqueio (Rule 3):** `src/app/(frontend)/esqueci-senha/page.tsx` exportava `NEUTRAL_MESSAGE` (não é export válido de página) e derrubava o type-check do `next build`; agora é `const` local (ninguém mais importava).

### Gate
typecheck e lint limpos; Vitest 78 arquivos / 747 testes passando; `next build --webpack` ok; Playwright (mobile + desktop) 515 passed, 0 failed, 147 skipped (specs só de um projeto). Observação de ambiente: sem rede, o mock de fontes só funciona com webpack (`next dev/build --webpack`); e `next start` exige `PRIVATE_MEDIA_DIR` (senão os envios de foto do ClassiSex dão 503 de propósito).

### Capas no staging (7.7)
1. `docker compose --env-file .env.staging run --rm migrate node_modules/.bin/payload run scripts/import/dicas.ts -- --from-bundle src/migrations/seed/dicas-wp.json --listar-capas` (lista os 15 arquivos).
2. Cliente extrai só esses arquivos do backup para `/opt/paraiso-site/importacao/uploads` (AAAA/MM) e `chown -R 1000:1000 /opt/paraiso-site/importacao/uploads`; backup do banco antes (7.6 passo 2); `docker volume ls | grep media` para confirmar o nome do volume.
3. `docker compose --env-file .env.staging run --rm -v /opt/paraiso-site/importacao:/importacao:ro -v paraiso-staging_media:/app/media -e MEDIA_DIR=/app/media migrate node_modules/.bin/payload run scripts/import/dicas.ts -- --from-bundle src/migrations/seed/dicas-wp.json --uploads /importacao/uploads`
4. Cliente devolve só a linha `Capas: gravadas N · ausentes N · ...`; repetir é seguro; capas entram desmarcadas ("Capa conferida").

## Follow-up (2026-10-23)
Dicas Hot passou a ter link no menu principal (depois de Contos, antes de Contato; segue no rodapé): `src/lib/site/nav.ts`, specs `modelos` e `dicas-hot` atualizados, GUIA-DA-EQUIPE ajustado.
