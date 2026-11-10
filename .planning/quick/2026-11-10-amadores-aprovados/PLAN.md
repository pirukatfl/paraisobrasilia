---
type: quick
slug: amadores-aprovados
date: 2026-11-10
planner: opus
executor: sonnet
---

# Plano: fotos e vídeos aprovados dos envios do público vão para o site (pedido do cliente 2026-11-10)

Pedido: "as fotos recebidas e aprovadas pela equipe devem ser exibidas na galeria de amadores, e os vídeos recebidos e aprovados devem ser exibidos em um novo menu chamado vídeos amadores; quando o vídeo for clicado para assistir só pode ser dado o play se for um assinante".

Hoje `envios-midia` (status novo/aprovado/recusado) e `envios-midia-arquivos` (arquivos em PRIVATE_MEDIA_DIR) são só da equipe; "Aprovado" não publica nada. O arquivo continua no armazenamento privado: o site passa a servir **apenas** os arquivos publicados, por rotas próprias que conferem a regra no servidor a cada pedido. A rota do Payload (`/api/envios-midia-arquivos/file/...`) continua só equipe (read: isStaff, não mexer).

Branch `claude/project-thread-reslsi` (a partir de `main`, 7b7555f).

## Regra de publicação (decisão padrão)
Um arquivo está publicado quando: o envio está `aprovado` **e** o arquivo não está marcado `oculto`. Aprovar o envio publica todos os arquivos dele; a equipe pode esconder um arquivo específico (checkbox) sem recusar o envio. Recusar/voltar para Novo/apagar tira do site na hora (revalidação + checagem por pedido nas rotas).
Legenda pública = apelido do envio (o contato, a mensagem e a observação nunca saem do servidor).

## A1. Coleções
- `EnviosMidiaArquivos`: novo campo `oculto` (checkbox, padrão false, rótulo "Não mostrar no site", descrição "Marque para esconder só este arquivo de um envio aprovado.", sidebar). Hooks `afterChange`/`afterDelete` → `revalidateTag('amadores')` (seguir o padrão de `src/lib/gallery/revalidate.ts` / `src/lib/cache/`).
- `EnviosMidia`: textos do painel atualizados (descrição da coleção e do status: "Aprovado publica as fotos na Galeria → Amadoras e os vídeos em Vídeos amadores (só assinantes dão o play). Recusado ou Novo: nada aparece."). Comentário do topo atualizado (aprovar AGORA publica). Hooks `afterChange`/`afterDelete` → `revalidateTag('amadores')`.
- Migração: `ALTER TABLE "envios_midia_arquivos" ADD COLUMN "oculto" boolean DEFAULT false;` + itens de menu/textos (A5). Preferir gerar com `pnpm payload migrate:create amadores_aprovados` contra o banco local (Postgres 16 está instalado: `/usr/lib/postgresql/16`); se impossível, escrever à mão no padrão dos arquivos `20261105_*` e registrar em `src/migrations/index.ts`. Regenerar `src/payload-types.ts` (`pnpm generate:types`) e o importMap se precisar.

## A2. Regras e consultas (`src/lib/midia-enviada/`)
- `publicacao.ts` (puro, testável): `estaPublicado({ kind, oculto, envioStatus })`, `duracaoRotulo(segundos)` ("0:42", "1:05").
- `publico.ts` (`server-only`):
  - `getFotosAmadoras()` cacheada (`cached(...)`, tag `amadores`): `envios-midia-arquivos` com `kind = foto`, `oculto != true`, `envio.status = aprovado` (consulta pelo relacionamento; se o adapter não aceitar, buscar ids dos envios aprovados primeiro), `depth: 1`, `sort: -createdAt`, limite 200, `overrideAccess: true`, `select` só do necessário. Mapear para `SpaceItemDTO`: `image.url = /amadores/foto/{id}/foto`, `thumbUrl = /amadores/foto/{id}/miniatura`, larguras/alturas do doc e de `sizes.card`; `alt = "Foto enviada por {apelido}"`; `caption = apelido`.
  - `getVideosAmadores()` cacheada (tag `amadores`): mesmo filtro com `kind = video` → `{ id, apelido, duracao (segundos|null), createdAt }`. Sem URL do arquivo no DTO.
  - `arquivoPublicado(payload, id)`: findByID (overrideAccess, depth 1) e aplica `estaPublicado`; devolve `{ kind, filename, cardFilename, mimeType }` ou null. Usado pelas duas rotas, **nunca** do cache.

## A3. Rotas de arquivo (padrão de `area-do-assinante/midia/[id]/[variante]/route.ts`: nome do arquivo só do banco, `path.basename`, `privateMediaDir()`, `nosniff`)
- `GET /amadores/foto/[id]/[miniatura|foto]` (pasta `src/app/(frontend)/amadores/foto/[id]/[variante]/route.ts`): público quando publicado e `kind = foto`; senão 404. `Content-Type: image/webp`, `Cache-Control: public, max-age=300`, `X-Robots-Tag: noindex, noimageindex`.
- `GET /videos-amadores/[id]/video`: 404 se não publicado ou não for vídeo; 403 (JSON "Só assinantes podem assistir.") se quem pede não é equipe nem assinante com acesso `ativa` (`payload.auth` + `accessStatusFor`, como a rota da ClassiSex). Range/206 com `parseRange`, `Cache-Control: private, no-store`… (usar `private, max-age=600` + `Vary: Cookie` como a rota existente), `noindex`. Conferir que o middleware/proxy (`src/proxy.ts`) não bloqueia as novas rotas (age gate etc.).

## A4. Interface (usar a skill Impeccable: `.claude/skills/impeccable/`, regra do projeto)
- **Galeria → Amadoras** (`/modelos?tipo=amadoras`): depois do `ModelGrid`, seção "Fotos dos frequentadores" (título + texto editáveis em Textos do site → modelos) com o `Gallery` existente. Imagens sem o otimizador do Next (`unoptimized`/`plainImages`: adicionar prop ao `Gallery` repassando ao `Image` e ao `Lightbox`), para que uma foto despublicada não fique no cache do otimizador. Link discreto "Envie as suas fotos" → `/enviar-fotos-e-videos`. O estado vazio da página só aparece se não houver modelos **nem** fotos. Sem `tipo` (Galeria inteira) e em Profissionais: não mostrar a seção.
- **Vídeos amadores** (`/videos-amadores`, `src/app/(frontend)/videos-amadores/page.tsx`, `dynamic = 'force-dynamic'`): título/intro editáveis (nova área de textos ou campos na área `modelos`, seção "Vídeos amadores"); metadata via `buildPageMetadata`; incluir no `sitemap.ts`. Grade de cartões (componente cliente `VideosAmadoresGrid`): sem pôster (não há ffmpeg), cartão escuro com ícone de play, apelido e duração. Ao clicar:
  - assinante ativo (ou equipe): abre `<dialog>` com `<video controls autoPlay playsInline src="/videos-amadores/{id}/video">`; Esc/fechar devolve o foco ao cartão; o vídeo para ao fechar.
  - qualquer outra pessoa: o mesmo diálogo sem `<video>`, com a mensagem "Só assinantes dão o play" e botões "Assine já" (`/assine-ja`) e, se não estiver logado, "Entrar" (`/entrar?next=/videos-amadores`; liberar esse caminho em `safeNext`, `src/lib/assinantes/redirect.ts`). Conta logada sem assinatura ativa: só "Assine já" com texto adequado. O servidor decide quem é assinante (`viewerIsActiveSubscriber`) e passa um booleano; a proteção real é a rota do vídeo (A3).
  - Estado vazio quando não há vídeos aprovados (EmptyState existente, textos editáveis, botão para `/enviar-fotos-e-videos`).
- Seguir o visual existente (tokens, `type-*`, `card-lift`, `press`, `reveal stagger`), mobile primeiro, acessível (rótulos, foco, alvos ≥ 44 px).

## A5. Menu
- Novo subitem da Galeria: `{ key: 'galeria-videos-amadores', href: '/videos-amadores', label: t.menuGaleriaVideosAmadores }` (padrão "Vídeos amadores"; campo novo na área `geral`, seção Menu), no menu público e no de assinante (vem com `pick('galeria')`). Registrar em `MENU_ITENS` ("Galeria → Vídeos amadores") e em `PARENT` (`galeria`). O enum `enum_menu_do_site_itens_ocultos` ganha o valor (migração). Conferir rodapé (`Footer.tsx`) e `isActivePath`.

## A6. Testes (os vazamentos são o teste mais valioso)
- Unit: `estaPublicado`, `duracaoRotulo`, `safeNext('/videos-amadores')`, menu (filtro do novo subitem).
- Int (`tests/int/envios-midia.int.test.ts` ou novo): fotos/vídeos só aparecem em `getFotosAmadoras`/`getVideosAmadores` com envio aprovado e arquivo não oculto; contato nunca no DTO.
- E2E (novo `tests/e2e/amadores-aprovados.spec.ts`): envio com foto+vídeo; antes de aprovar, `/amadores/foto/{id}/foto` 404 e nada na página; aprovado → foto em `/modelos?tipo=amadoras`, vídeo em `/videos-amadores`; rota do vídeo 403 para visitante e conta gratuita, 200/206 para assinante ativo; clicar como visitante mostra o convite e não há `<video>`; `oculto` tira o arquivo; recusar tira tudo; `/api/envios-midia-arquivos/file/...` continua negado ao público. Menu mostra "Vídeos amadores" em Galeria.
- Gate: `pnpm typecheck`, `pnpm lint`, Vitest unit+int, `pnpm build`, Playwright dos specs tocados (enviar-midia, modelos, menu-do-site, menu-logado, novo spec).

## A7. Fechamento
- `SUMMARY.md` nesta pasta e linha na tabela de quick tasks de `.planning/STATE.md`.
- Commits em português, push no branch, PR.
