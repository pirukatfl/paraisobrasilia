# Quick: Modelos so com fotos (por enquanto)

Pedido do cliente (2026-10-23): "nessa parte das modelos, por enquanto remova o uso de videos para elas, deixe apenas fotos". Temporario: facil de religar, sem mexer no schema.

1. `src/lib/gallery/flags.ts`: `MODEL_VIDEOS_ENABLED = false`; `modelVideos()` em `queries.ts` devolve vazio com a flag desligada (cards sem "N videos", pagina so com fotos). `/espaco` intocado.
2. `src/collections/Models.ts`: campo `videos` com `admin.hidden: true` (colunas e migracao `20261023_042900_models_videos` intactas, dados salvos preservados); descricao da colecao sem videos.
3. Testes: int e e2e passam a provar que videos guardados NAO aparecem no site; orcamento de peso ajustado.
4. Guia da equipe (secao Modelos): so fotos por enquanto.
