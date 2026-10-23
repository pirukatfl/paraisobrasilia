# Resumo: Modelos so com fotos

- Flag unica `MODEL_VIDEOS_ENABLED` (false) em `src/lib/gallery/flags.ts`; para religar: `true` + remover `hidden: true` do campo `videos` em `Models.ts`.
- Campo `videos` escondido no painel; sem mudanca de schema (`migrate:create` sem alteracoes).
- `/modelos` e `/modelos/<slug>`: so fotos, sem "N videos"; videos guardados continuam no banco.
- Testes atualizados (models.int, modelos.spec, perf-galeria.spec); guia da equipe atualizado.
