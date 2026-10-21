# Roadmap: Paraíso Brasília — Site novo

## Visão geral

Cada fase entrega uma capacidade ponta a ponta. A Fase 1 já coloca no ar (em staging) a vitrine de festas sobre uma fundação funcional, que é o Core Value. As fases seguintes completam o site aberto, liberam a área de assinantes, migram os dados do WordPress e fazem o lançamento. Descoberta do acesso ao WordPress, parecer jurídico (ECA Digital/LGPD) e leitura das políticas de uso (AUP) dos provedores começam na Fase 1; a migração só roda depois que o esquema de dados está estável (Fases 3 a 5).

## Phases

- [x] **Phase 1: Fundação e vitrine de festas** - Site no ar em staging com festas, age gate e SEO, mais descoberta do WordPress e parecer jurídico (completed 2026-10-19)
- [x] **Phase 2: Site aberto completo e mídia** - Espaço, modelos, Quem Somos, mapa, contato e páginas legais, com galerias rápidas (completed 2026-10-19)
- [x] **Phase 3: Assinantes e controle de acesso** - Login, validade de assinatura e gestão de assinantes pela equipe (completed 2026-10-19)
- [x] **Phase 4: ClassiSex e prévias de perfis** - Perfis completos para assinantes, moderação e prévias sem contato (completed 2026-10-20)
- [x] **Phase 5: Recados, mensagens e contos** - Recados e mensagens entre assinantes e contos parciais (completed 2026-10-21)
- [ ] **Phase 6: Migração do WordPress** - Assinantes, perfis e links antigos trazidos para o site novo
- [ ] **Phase 7: Lançamento e desempenho** - Virada de DNS com site abrindo em menos de 2,5 s no celular

## Phase Details

### Phase 1: Fundação e vitrine de festas

**Goal**: Visitante chega ao site novo (em staging), confirma 18+ e vê as próximas festas; a equipe publica festas sozinha, e as dúvidas de descoberta (WordPress, jurídico, hospedagem) ficam respondidas
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FEST-01, FEST-02, FEST-03, FEST-04, PAINEL-01, INST-04, INST-05
**Success Criteria** (what must be TRUE):

  1. Visitante entra, confirma ter 18+ sem cadastro e vê na home os flyers das próximas festas em 1:1 ou 4:5, adaptados ao celular
  2. Visitante clica em um flyer e abre a página da festa com texto, data, horário e detalhes
  3. Ao compartilhar a página da festa no WhatsApp/Instagram, a prévia mostra o flyer e o título corretos
  4. Equipe cria, edita e despublica uma festa com flyer no painel, sem ajuda técnica, e a festa passada some da home sozinha após a data
  5. Estão registrados: acesso (ou ausência de acesso) ao WordPress e plugin de assinantes, parecer jurídico sobre age gate, e AUP da hospedagem/e-mail/storage

**Plans:** 10/10 plans complete
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold Next.js 16 + Payload 3 + Postgres, Portuguese admin, local run (wave 1)
- [x] 01-02-PLAN.md — Discovery records: WordPress, legal brief on age gate, provider AUPs (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Test harness (Vitest + Playwright), seed helpers, failing home e2e (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Brand shell: logo assets, dark tokens, header/footer, error pages (wave 3)
- [x] 01-05-PLAN.md — Skeleton slice: Parties + Media, visibility rule, home flyer grid (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — Swappable 18+ age gate (self-declaration overlay) (wave 4)
- [x] 01-07-PLAN.md — Party page with full details and pt-BR dates (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-08-PLAN.md — SEO and share previews: OG image, metadata, robots, sitemap (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-09-PLAN.md — Staff publishing: drafts, publish/unpublish, revalidation (wave 6)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 01-10-PLAN.md — Staging deploy on the VPS with HTTPS, media on the VPS disk, acceptance check (wave 7)

**UI hint**: yes

### Phase 2: Site aberto completo e mídia

**Goal**: Visitante entende a casa por inteiro: vê fotos e vídeos do espaço e das modelos, sabe chegar e falar com a casa, e lê Quem Somos e páginas legais
**Mode:** mvp
**Depends on**: Fase 1
**Requirements**: MIDIA-01, MIDIA-02, MIDIA-03, INST-01, INST-02, INST-03, INST-06, PAINEL-02, PAINEL-04
**Success Criteria** (what must be TRUE):

  1. Visitante vê galerias de fotos e vídeos do espaço e de fotos profissionais das modelos, que carregam rápido no celular
  2. Visitante acessa Quem Somos com submenus Normas, Regras e Dicas
  3. Visitante vê endereço, mapa, botões "Como chegar" (Google Maps/Waze), botão de WhatsApp e redes sociais oficiais
  4. Visitante acessa Termos de Uso e Política de Privacidade (LGPD)
  5. Equipe envia fotos e vídeos registrando a autorização de uso de imagem e edita Quem Somos, Normas, Regras, Dicas e contatos sem ajuda técnica

**Plans:** 6/6 plans complete
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Contact slice: global Contato e endereço, /contato with OSM map, Como chegar (Google Maps/Waze), WhatsApp, header menu + footer (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Pages slice: Quem Somos + Normas/Regras/Dicas, Termos and Privacidade seeded from 02-CONTENT.md, staff editing (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Space gallery: photos + MP4 videos on MEDIA_DIR, lightbox, empty state, non-blocking image authorization (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — Models gallery: name + max 3 photos, hidden when empty (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-05-PLAN.md — Home without parties (D-10), metadata/sitemap, mobile weight budgets (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 02-06-PLAN.md — Runbook + staff guide, push to main (deploy + migrations on the VPS), client check on staging (wave 6) — Task 1 done (pushed 93fcccd, run 39198530631 green); awaiting client check

Cross-cutting constraints: schema-changing plans run in sequential waves (Payload migration snapshots); every public query is published-only, cached with tags and revalidated on staff changes; media stays on the VPS disk (MEDIA_DIR).
**UI hint**: yes

### Phase 3: Assinantes e controle de acesso

**Goal**: Assinante entra com e-mail e senha e acessa a área restrita até o vencimento; a equipe libera, renova e encerra assinaturas pelo painel
**Mode:** mvp
**Depends on**: Fase 2
**Requirements**: ASS-01, ASS-02, ASS-03, ASS-04, ASS-05, PAINEL-05, PAINEL-06, PAINEL-08
**Success Criteria** (what must be TRUE):

  1. Assinante entra com e-mail e senha, continua logado entre visitas e troca a senha (senha provisória ou link de uso único gerado pela equipe e enviado pelo WhatsApp; e-mail adiado, D-04)
  2. Assinante vê até quando sua assinatura vale, e ao vencer perde o acesso ao conteúdo restrito automaticamente na data
  3. Visitante vê na página "Assine Já" os planos e como pagar (pagamento manual)
  4. Equipe libera, renova e encerra uma assinatura registrando o pagamento, e vê quais vencem nos próximos 7 dias
  5. Toda ação da equipe sobre assinantes aparece em um registro com quem, quando e o quê

**Plans**: 7 plans
- [x] 03-01-PLAN.md — Acesso só da equipe, coleção assinantes, /entrar e área do assinante
- [x] 03-02-PLAN.md — Planos e página Assine Já
- [x] 03-03-PLAN.md — Períodos de assinatura e validade por data
- [x] 03-04-PLAN.md — Liberar, renovar, encerrar e registro de ações
- [x] 03-05-PLAN.md — Troca de senha, senha provisória e link de nova senha
- [x] 03-06-PLAN.md — Vencem em 7 dias e testes de vazamento
- [x] 03-07-PLAN.md — Guias, deploy e conferência do cliente
**UI hint**: yes

### Phase 4: ClassiSex e prévias de perfis

**Goal**: Assinante navega e abre perfis completos com fotos, vídeos e contato, cria o próprio perfil e a equipe modera; visitante vê só prévias sem contato
**Mode:** mvp
**Depends on**: Fase 3
**Requirements**: CLAS-01, CLAS-02, CLAS-03, CLAS-04, CLAS-05, CLAS-06, PREV-01, PAINEL-07
**Success Criteria** (what must be TRUE):

  1. Assinante vê a lista de perfis com fotos e abre o perfil completo com fotos, vídeos e contato
  2. Assinante cria e edita o próprio perfil, que só aparece após aprovação da equipe na fila de moderação
  3. Assinante denuncia um perfil e a equipe vê a denúncia
  4. Quem não é assinante, ao abrir o link direto de uma foto ou vídeo de perfil, não consegue acessá-lo
  5. Visitante vê chamadas de perfis na área aberta sem nenhum contato ou dado identificável

> Nesta fase "perfis" = **anúncios** (04-CONTEXT D-01: o ClassiSex continua um mural de anúncios curtos).

**Plans**: 10 plans
- [x] 04-01-PLAN.md — Regras puras: tirar contatos do texto e ler/limpar vídeos MP4/MOV (wave 1)
- [x] 04-02-PLAN.md — Anúncios do assinante: opções "Eu sou", coleção ads, Meus anúncios, tudo em análise (wave 1)
- [x] 04-03-PLAN.md — Fila de moderação da equipe: aprovar, recusar, despublicar e registro (wave 2)
- [x] 04-04-PLAN.md — ClassiSex do assinante: lista com filtros, anúncio com contatos, vencimento esconde (wave 3)
- [x] 04-05-PLAN.md — Mídia privada: volume separado, coleção ad-media, rota protegida com ranges (wave 4)
- [x] 04-06-PLAN.md — Fotos e vídeo: envio pelo assinante e exibição no ClassiSex (wave 5)
- [x] 04-07-PLAN.md — Prévia pública /classisex sem contatos, fotos desfocadas, menu e sitemap (wave 6)
- [x] 04-08-PLAN.md — Denúncias: assinante denuncia, equipe resolve ou despublica (wave 7)
- [x] 04-09-PLAN.md — Matriz de vazamento: mídia, contatos, APIs e cabeçalhos (wave 8)
- [x] 04-10-PLAN.md — Guia, runbook, smoke, deploy, volume na VPS e conferência do cliente (wave 9)
**UI hint**: yes

### Phase 5: Recados, mensagens e contos

**Goal**: Assinantes trocam recados e mensagens com contato, leem contos completos, e visitantes veem só prévias com chamada para assinar
**Mode:** mvp
**Depends on**: Fase 4
**Requirements**: REC-01, REC-02, REC-03, REC-04, PREV-02, PREV-03, PREV-04, PAINEL-03
**Success Criteria** (what must be TRUE):

  1. Assinante publica um recado, visível a outros assinantes só depois de aprovado pela equipe
  2. Assinante envia mensagem a outro perfil e vê as respostas; também bloqueia ou denuncia quem enviou
  3. Visitante vê chamadas de recados sem contato e lê o início de cada conto, com o restante só para assinantes
  4. Toda prévia mostra uma chamada clara "Assine Já"
  5. Equipe publica contos e define o trecho aberto sem ajuda técnica

**Plans**: 12 plans
- [x] 05-01-PLAN.md — Importação dos contos (núcleo): leitor do dump do WP e HTML/Elementor → Lexical, só com dados sintéticos (wave 1)
- [x] 05-02-PLAN.md — Contos no painel: coleção com rascunho, "Parágrafos abertos" e prévia do trecho aberto (wave 1)
- [x] 05-03-PLAN.md — Leitura dos contos: início aberto com Assine Já, texto completo para assinantes, menu e sitemap (wave 2)
- [x] 05-04-PLAN.md — Script idempotente de importação (WP_DUMP_PATH), pacote revisado + migração; execução no dump real pelo orquestrador (wave 3)
- [x] 05-05-PLAN.md — Recados: apelido, envio com contatos removidos, limite de 3, mural do assinante (wave 4)
- [x] 05-06-PLAN.md — Moderação de recados: aprovar, recusar, despublicar, fila e registro (wave 5)
- [x] 05-07-PLAN.md — Prévia pública /recados sem apelido nem contato e Assine Já em todas as prévias (wave 6)
- [x] 05-08-PLAN.md — Mensagens privadas (dados e regras): conversas fechadas, só ativos, a partir de anúncio/recado, não lidas (wave 7)
- [x] 05-09-PLAN.md — Mensagens na tela: Enviar mensagem, caixa de entrada, conversa, contador no menu (wave 8)
- [x] 05-10-PLAN.md — Bloquear e denunciar mensagens; equipe resolve e suspende envio (wave 9)
- [x] 05-11-PLAN.md — Matriz de vazamento da Fase 5: recados, mensagens, bloqueio e contos (wave 10)
- [x] 05-12-PLAN.md — Guia, runbook, smoke, deploy e conferência do cliente (wave 11)
**UI hint**: yes

### Phase 6: Migração do WordPress

**Goal**: Assinantes e perfis atuais passam para o site novo sem perder tempo de assinatura, e links antigos continuam funcionando
**Mode:** mvp
**Depends on**: Fase 5 (esquema de dados estável) e acesso ao WordPress obtido na Fase 1
**Requirements**: MIG-01, MIG-02, MIG-03
**Success Criteria** (what must be TRUE):

  1. Assinante atual entra no site novo (com a senha antiga ou por link de nova senha) com o tempo de assinatura já pago preservado
  2. Perfis atuais do ClassiSex aparecem no site novo com suas fotos, após ensaio em staging
  3. Links antigos importantes redirecionam para as páginas novas, sem 404 para o Google

**Plans**: 10 plans
- [x] 06-01-PLAN.md — Verificador das senhas do WordPress ($wp$ bcrypt+HMAC-SHA384 e $P$ phpass), com vetores do PHP (wave 1)
- [x] 06-02-PLAN.md — Leitura do dump (só dados sintéticos): contas, assinatura, anúncios antigos, --inspect e relatório só com contagens (wave 1)
- [x] 06-03-PLAN.md — Mapa de links antigos (301) gerado e versionado, ligado ao next.config, com e2e (wave 1)
- [x] 06-04-PLAN.md — Campos de conta da migração, hash antigo invisível, marcador "Assinante antigo sem data de vencimento" (lista, ficha, filtro, painel) (wave 2)
- [x] 06-05-PLAN.md — Login com a senha antiga em /entrar, conversão no 1º acesso, senha curta → nova senha (wave 3)
- [x] 06-06-PLAN.md — Anúncios antigos como rascunho do autor: status, aviso, revisar e enviar para análise (wave 4)
- [x] 06-07-PLAN.md — Carga idempotente: contas, períodos "Migrado do site antigo", rascunhos e fotos (wave 5)
- [x] 06-08-PLAN.md — CLI import:wordpress (--inspect, --dry-run, gravação, --uploads), saída só com contagens (wave 6)
- [x] 06-09-PLAN.md — Guia da equipe, runbook 7.6 (importação na VPS) e smoke de staging (wave 7)
- [ ] 06-10-PLAN.md — Orquestrador no dump real, ensaio no staging pelo cliente e conferência do cliente (wave 8)

### Phase 7: Lançamento e desempenho

**Goal**: Site novo vai ao ar em swingbrasilia.com.br e as páginas abertas abrem em menos de 2,5 s no celular
**Mode:** mvp
**Depends on**: Fase 6
**Requirements**: MIG-04
**Success Criteria** (what must be TRUE):

  1. As páginas abertas carregam em menos de 2,5 s no celular em 4G (medido por Lighthouse/teste real)
  2. O domínio swingbrasilia.com.br aponta para o site novo, com backups funcionando e teste de que anônimo não acessa mídia restrita

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação e vitrine de festas | 10/10 | Complete    | 2026-10-19 |
| 2. Site aberto completo e mídia | 6/6 | Complete    | 2026-10-19 |
| 3. Assinantes e controle de acesso | 7/7 | Complete    | 2026-10-19 |
| 4. ClassiSex e prévias de perfis | 10/10 | Complete    | 2026-10-20 |
| 5. Recados, mensagens e contos | 12/12 | Complete    | 2026-10-21 |
| 6. Migração do WordPress | 9/10 | In Progress|  |
| 7. Lançamento e desempenho | 0/? | Not started | - |
