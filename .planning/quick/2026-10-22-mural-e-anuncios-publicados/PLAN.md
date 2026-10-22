# Quick: Mural antigo importado e todos os anuncios antigos publicados

## Decisao do cliente (2026-10-22)
"traz todas e ficam aparecendo, so as novas que vao ter os limites". Substitui M-04 (rascunhos) do 06-CONTEXT.

1. Importar tambem o MURAL antigo (comentarios wpDiscuz do post 749, slug `mural`): mesmas duas chaves `custom_field_*`
   (Eu Sou, Cidade), ~503 aprovados, 41 autores, 33 com fotos (`wmu_attachments`). Posts de origem configuraveis
   (padrao 2894 e 749; `--post` aceita lista separada por virgula). Origem por anuncio: `ads.fonteLegado` = `classisex` | `mural`.
2. TODOS os anuncios antigos (membros e equipe) entram PUBLICADOS (`aprovado`). Regras normais de visibilidade
   (publico: texto sem contato + capa desfocada; autor sem assinatura: so a capa, G-05; assinante ve tudo).
3. Anuncios antigos (marcados por `wpCommentId`, campo so do importador) sao isentos de limites: nao contam nos 3 ativos,
   sem limite de 600 caracteres, sem exigencia de WhatsApp/Telegram, sem limite de fotos por plano (teto absoluto de 10 fica).
   A redacao de contatos para quem nao paga continua valendo. Anuncios NOVOS mantem todos os limites.
   Edicao do autor num anuncio antigo: continua isento (teto generoso de 5000 caracteres so como protecao), volta para a
   moderacao como qualquer edicao (D-03) e nao entra na conta dos 3 ativos.
4. Re-rodada no staging (108 rascunhos de membros, possivelmente 96 da equipe): o importador PROMOVE a publicado os
   rascunhos antigos ainda intocados (sem `submittedAt`, sem `moderatedAt`, mesmo dono esperado), de forma idempotente, e nunca
   sobrescreve decisao da equipe/autor (recusado, despublicado, editado/enviado, reatribuido). Anuncio apagado nao volta
   (a exclusao deixa uma linha de auditoria `anuncio-legado-apagado` com o `wpCommentId`). Relatorio por origem, so contagens:
   `publicados N · promovidos de rascunho N · já existiam N · da equipe N`, fotos por origem. GIF: o pipeline de midia nao
   aceita (JPEG/PNG/WebP), entao conta como recusada.
5. Aviso "voce tinha anuncios no site antigo: revise e publique" sai da home; em Meus anuncios fica uma nota curta
   ("ja estao publicados") para quem tem anuncio antigo.
6. `/mural/` redireciona para `/classisex` (mapa gerado em `src/lib/redirects`).
7. Docs: nota M-04 superada em 06-CONTEXT, GUIA-DA-EQUIPE, runbook 7.6 com a saida esperada.

## Tarefas
1. Schema: `ads.fonteLegado` (select, so servidor, indexado) + valor de auditoria `anuncio-legado-apagado`; migracao
   `20261022_022156_mural_publicado` (unica nova, gerada com `payload migrate:create`; sem diferencas pendentes).
2. Regras: `Ads.ts` (contato/texto isentos para `wpCommentId`; tombstone no `afterDelete`), `AdMedia.ts` (contagem por plano
   isenta), `rules.ts`/`service.ts` (`validateAdInput` com `legacy`, `countActive` ignora antigos, limite nao se aplica),
   `dto.ts`, `AdForm`, `OwnerMediaManager`, paginas (aviso, editar).
3. Importador: `wp-classisex.ts` (fonte por post, lista de posts), `wp-accounts.ts` (filtro de linhas por varios posts),
   `load.ts` (publicar, promover, nao sobrescrever, nao recriar apagados, contadores por origem), `report.ts`, CLI `--post a,b`.
4. Redirect `/mural` -> `/classisex`.
5. Testes: fixture sintetica com comentarios do mural (fotos, GIF, texto longo, contatos no texto, autoria da equipe, resposta,
   outro post); `tests/int/ads-legado.int.test.ts`; `migracao-load`, `migracao-cli`, `anuncios-equipe`, `anuncios-rascunho`
   atualizados; e2e `classisex-antigos.spec.ts` (quadro publico mostra anuncio antigo com texto sem contato) e
   `anuncios-site-antigo.spec.ts`/`anuncios-equipe.spec.ts` ajustados; testes de vazamento seguem verdes.
6. Docs conforme item 7.
