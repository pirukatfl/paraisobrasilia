---
type: quick
slug: amadoras-juntas
date: 2026-11-11
planner: opus
executor: sonnet
---

# Plano: fotos aprovadas JUNTO das amadoras, vídeos só "vídeos amadores", play só assinante (correção do cliente 2026-11-11)

Pedido: "pedi para que as fotos enviadas pela promoção aparecessem na galeria -> amadoras, mas você colocou para exibir em fotos dos frequentadores, e é apenas para exibir juntamente na galeria das amadoras, e nos vídeos recebidos pela promoção, o play só pode ser executado se for assinante, e não precisa falar que é vídeo de frequentadores, mas sim vídeos amadores."

Base: `main` f96b46e (PR #84 já mesclado; quick anterior em `.planning/quick/2026-11-10-amadores-aprovados/`). Branch `claude/project-thread-reslsi` recriado a partir de `main`.

## B1. Fotos aprovadas como cartões na grade das Amadoras (sem seção separada)
- Remover a seção "Fotos dos frequentadores" de `/modelos?tipo=amadoras` (título, texto, link "Envie as suas fotos", `Gallery` separado).
- Cada **envio aprovado com ≥ 1 foto publicada** vira um cartão na MESMA grade (`ModelGrid`) das amadoras, com o mesmo visual do cartão de modelo: capa = primeira foto (miniatura `/amadores/foto/{id}/miniatura`), nome = apelido, contagem "N fotos" (usar `countLabel`). Ordem: as modelos amadoras (ordem atual) e em seguida os envios, do mais novo para o mais antigo. Na Galeria inteira (sem `tipo`) também aparecem (são amadoras); em Profissionais, não.
- `ModelGrid` passa a aceitar itens com `href` próprio (ex.: estender `ModelCardDTO` com `href?` ou um tipo união), e a capa dos envios usa `unoptimized` (não passar pelo otimizador do Next: uma foto despublicada não pode ficar no cache dele). Cartões de modelo continuam iguais.
- Nova página do envio: `/amadoras/[id]` (`src/app/(frontend)/amadoras/[id]/page.tsx`, `force-dynamic`), igual em espírito à página de modelo: link de volta "Amadoras" (`/modelos?tipo=amadoras`), título = apelido, contagem, `Gallery` com `plainImages` das fotos publicadas desse envio (rótulo do lightbox: "Fotos de {apelido}"). 404 (`notFound()`) se o envio não existe, não está aprovado ou não tem foto publicada. Metadata via `buildPageMetadata` (título = apelido; descrição curta neutra, ex. "{apelido}, amadora do Paraíso Brasília: fotos."), incluir no `sitemap.ts` junto das modelos. Nunca expor contato/mensagem/observação.
- Consultas em `src/lib/midia-enviada/publico.ts`: trocar/estender `getFotosAmadoras` para devolver os envios agrupados (`getAmadorasEnviadas()` → `{ envioId, apelido, capa, fotos: GalleryImage[], fotoCount, createdAt }[]`, cacheado com tag `amadores`) e `getAmadoraEnviada(id)`. Remover o que ficar sem uso.
- Imagens: alt "Foto de {apelido}" (sem "enviada por"/"frequentador").
- Estado vazio da página: só quando não há modelos nem envios na lista filtrada.
- `hasPublishedModels`/menu: sem mudança obrigatória; conferir que a home (`GaleriaSlider`) não precisa mudar (não precisa).

## B2. Vídeos: só "vídeos amadores", sem "frequentadores" nem "enviado por"
- Cartão: rótulo "Vídeo amador" + duração (tirar o apelido do cartão e do título do diálogo; diálogo com título "Vídeo amador"). `aria-label` "Assistir vídeo amador, duração 0:42". O DTO pode deixar de levar o apelido.
- Textos padrão novos (área modelos):
  - `videosIntro`: "Vídeos amadores aprovados pela equipe. Só assinantes dão o play."
  - `videosVazioTexto`: "Novos vídeos amadores aparecem aqui assim que a equipe aprova."
  - (os demais já não falam de frequentadores; revisar todos os textos novos de #84 e tirar "frequentador(es)", "enviado(s) pelo público", "quem frequenta a casa").
- **Migração de dados**: as colunas já existem no banco com o padrão antigo, então mudar o `padrao` no código não muda o site. Na mesma migração: `UPDATE "textos_modelos" SET "videos_intro" = <novo jsonb> WHERE "videos_intro" = <jsonb antigo>` (idem `videos_vazio_texto`), para não sobrescrever um texto que a equipe já editou; `ALTER COLUMN ... SET DEFAULT <novo>`. Down reverte.
- Remover os campos `fotosFrequentadoresTitulo/Texto/Enviar` da área modelos e `DROP COLUMN` na migração (down recria com o padrão antigo). Nome sugerido: `20261111_120000_amadoras_juntas`, registrar em `src/migrations/index.ts`, regenerar `payload-types.ts`.

## B3. Play só para assinante (sem exceção para a equipe)
- O cliente quer o play **só** para assinante ativo. Hoje a equipe logada no painel também assiste (`espectador.ts` e a rota `/videos-amadores/{id}/video` aceitam `users`), o que faz parecer que qualquer um dá play ao testar no mesmo navegador do painel. Remover essa exceção nos dois lugares: só `assinantes` com `accessStatusFor(...).state === 'ativa'`. A equipe continua vendo e baixando os vídeos no painel (Fotos e vídeos enviados), que não muda. Atualizar comentários e textos do painel (`EnviosMidia` descrição: "Aprovado publica as fotos junto das Amadoras e os vídeos em Vídeos amadores (só assinantes dão o play)").
- `logado` para o convite: sessão de equipe sem assinante conta como visitante (mostra "Entrar" e "Assine já").

## B4. Testes
- Atualizar `tests/e2e/amadores-aprovados.spec.ts`: envio aprovado aparece como cartão na grade das Amadoras (e não há heading "Fotos dos frequentadores"); cartão abre `/amadoras/{id}` com as fotos; envio recusado/não aprovado → cartão some e `/amadoras/{id}` 404; arquivo oculto some; vídeos: cartão "Vídeo amador" sem apelido; rota do vídeo 403 para visitante, conta gratuita **e sessão só de equipe**; 200/206 para assinante ativo; texto "frequentador" não aparece em `/videos-amadores` nem em `/modelos?tipo=amadoras`.
- Unit/int dos agrupamentos (envio sem foto publicada não vira cartão; contato nunca no DTO).
- Gate: `pnpm typecheck`, `pnpm lint` (sem erros novos), Vitest unit+int, `pnpm build`, Playwright dos specs tocados (amadores-aprovados, modelos, modelos-seo, seo/sitemap se houver).

## B5. Fechamento
- `SUMMARY.md` nesta pasta, linha na tabela de quick tasks de `.planning/STATE.md`, commits em português, push.
