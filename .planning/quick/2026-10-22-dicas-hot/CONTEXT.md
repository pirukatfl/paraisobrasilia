# Quick task: Dicas Hot — Context

**Pedido do cliente (06-CONTEXT M-08, 2026-10-21):** os 30 posts "Dicas Hot" do site antigo (categoria WordPress
`dicas-hot`; 8 deles também em `postdev`) entram como **seção nova e aberta** no site, porque trazem visitas do Google. Os
links antigos (`/<slug>/`, permalink `/%postname%/`) e a página/categoria `/dicas-hot/` redirecionam (301) para as páginas
novas. Planejado depois das etapas 06-01..06-09.

Fonte dos slugs: `.planning/phases/06-migra-o-do-wordpress/06-OLD-URLS.md` (30 posts com `dicas-hot`; `/dicas-hot/` também
aparece como **página** publicada e como **categoria**). Hoje esses 30 slugs estão em `LEGACY_SEM_DESTINO` (404 de
propósito) e `/dicas-hot` redireciona para `/quem-somos/dicas` (texto institucional "Dicas para a sua visita", que **não**
é a mesma coisa e continua existindo).

## Decisions (locked)

- **DH-01 Seção pública:** coleção nova `dicas` ("Dicas Hot"), **totalmente aberta**: sem paywall, sem trecho aberto,
  sem "Assine Já" no meio do texto. O age gate atual já cobre o site; nada muda nele.
- **DH-02 Endereços:** lista `/dicas-hot` (12 por página, `?pagina=N`, componente `Pagination` existente) e detalhe
  `/dicas-hot/<slug>`. O texto institucional `/quem-somos/dicas` continua igual (rótulo "Dicas" no menu Quem somos).
- **DH-03 Onde aparece:** **rodapé** ("Dicas Hot", depois de "Contos") **+ seção na home** ("Dicas Hot": as 3 mais
  recentes, só texto, com link "Ver todas as Dicas Hot"; some quando não há dica publicada). O **menu principal não muda**
  (já tem FESTAS, QUEM SOMOS, ESPAÇO, CLASSISEX, CONTOS, CONTATO, ASSINE JÁ, ÁREA DO ASSINANTE).
- **DH-04 SEO primeiro:** título da página = título da dica; meta description = campo **Resumo** (se vazio, os primeiros
  ~155 caracteres do texto); canonical; Open Graph/Twitter com a **capa** (tamanho `og` 1200×630 da coleção Media) quando
  houver capa conferida (DH-07), senão a imagem padrão do site; JSON-LD `Article`; link "Leia também" com outras dicas;
  `/dicas-hot` e cada dica publicada no `sitemap.xml`. Rascunhos nunca aparecem (página, lista, home, sitemap, REST).
- **DH-05 Painel:** a equipe cria, edita, salva rascunho e publica sozinha (versões com rascunho, como Contos). Campos:
  Título, Endereço, Data de publicação, Resumo, Imagem de capa, "Capa conferida", Texto (parágrafo, H2/H3, negrito,
  itálico, listas — mesmo editor dos Contos), "Conferir texto importado" e os campos só-leitura da importação.
  REST é **só da equipe**; o público lê por DTO no servidor (padrão de Contos, T-05-01).
- **DH-06 Importação como os Contos (Fase 5):** reusa `readWpTables` (parser em streaming), `extractContos(…,
  { categorySlug: 'dicas-hot' })`, `htmlToLexical`, limpeza de shortcodes e `redactContacts` (área aberta sem contatos).
  Idempotente por `wpId` (dica existente nunca é tocada; edição da equipe nunca é sobrescrita). Pacote revisado no
  repositório `src/migrations/seed/dicas-wp.json` + migração carregadora. Sem autor (post_author nunca lido), sem
  usuários, sem comentários.
- **DH-07 Imagens (capas):** opção `--uploads <pasta>` como no importador da Fase 6: a capa (imagem destacada,
  `_thumbnail_id` → `_wp_attached_file`) vira um arquivo da coleção pública `media` ligado à dica. Sem a pasta, as dicas
  vêm **sem capa** e o resto funciona. Imagens dentro do texto não são importadas (o editor é só texto; a dica fica marcada
  para conferência).
- **DH-08 Elementor e shortcodes:** shortcodes/builders são removidos como no importador de contos; posts montados no
  Elementor (`_elementor_edit_mode = builder`) e posts que perderam shortcodes/imagens, com texto estranho (mojibake), sem
  título ou curtos ficam com **"Conferir texto importado"** marcado (filtro/coluna na lista do painel) para revisão manual.
- **DH-09 Links antigos:** o mapa gerado `src/lib/redirects/*` passa a mandar os 30 slugs para `/dicas-hot/<slug novo>`
  (ou para `/dicas-hot` quando o post antigo foi descartado por estar vazio, virou rascunho ou era duplicado sem
  destino); `/dicas-hot/` vira página real (sai o redirecionamento para `/quem-somos/dicas`); `/category/dicas-hot/`
  (e subpáginas) e `/dicas-hot/page/N` → `/dicas-hot`. Tudo 301, destinos fixos.
- **DH-10 Saída só agregada:** o importador imprime contagens e **slugs** (posts públicos, liberado pelo cliente),
  nunca títulos nem texto. O dump real fica fora do git; quem roda a importação real é o **orquestrador** (sessão
  principal), nunca um executor.

## Interpretations chosen (planner discretion, flagged to the client)

- **I-1 Capa só depois de conferida:** o projeto proíbe nudez explícita na área aberta (PROJECT.md). Capas que vêm do site
  antigo chegam com **"Capa conferida" desmarcada** e **não aparecem** no site nem na prévia de compartilhamento até a
  equipe olhar e marcar. Capa enviada pela própria equipe já vem marcada (padrão = marcado). O arquivo existe em
  `/api/media/file/…` (coleção pública, como no site antigo, onde já era público), mas não é linkado nem indexado.
- **I-2 Meta description:** ordem `Yoast/Rank Math (se o site antigo tinha)` → `resumo (post_excerpt)` → vazio (o site
  usa o começo do texto ao vivo). Motivo: a descrição do plugin de SEO era a que o Google mostrava; manter preserva o
  snippet. Se o cliente preferir sempre o resumo, é trocar a ordem em `pickResumo`.
- **I-3 Publicar ou não:** dica com **60 palavras ou mais** entra **publicada** (inclusive as do Elementor, marcadas para
  conferência); abaixo disso entra como **rascunho** marcado para conferência e o link antigo vai para `/dicas-hot`.
  Vazias (0 palavras) não são importadas. Duplicadas (mesmo texto) ficam só a mais antiga; o link da duplicada leva à que
  ficou.
- **I-4 Sem remoção de "assinatura":** o importador de contos apaga um último parágrafo curto começando com "Por…"
  (autor). Em texto editorial isso apagaria frases como "Por isso, aproveite!", então **não** é aplicado às dicas.
- **I-5 Sem plugin de SEO na coleção:** o `@payloadcms/plugin-seo` (usado em Festas e Páginas) não é ligado em `dicas`;
  Resumo e Imagem de capa já são a descrição e a imagem de compartilhamento — um campo a menos para a equipe.
- **I-6 Nomes:** "Dicas Hot" (coleção, rodapé, home, título) para não confundir com "Dicas" (texto da visita, em Quem somos).
- **I-7 Contatos no texto:** telefones, e-mails, links e @ encontrados pelo `redactContacts` são **apagados** do texto da
  dica (não fica o rótulo "[contato só para assinantes]", que não faz sentido num texto aberto) e a dica fica marcada
  para conferência.

## Deferred

- Item "Dicas Hot" no menu principal (DH-03: só se o cliente pedir depois).
- Imagens dentro do texto das dicas, categorias/tags, busca, comentários.
- Enviar o sitemap ao Google Search Console — no lançamento (Fase 7), com o domínio de produção.
