# Pitfalls Research

**Domain:** Site de casa de swing (Brasília) com área pública de divulgação + área de assinantes (perfis com fotos/vídeos, recados), pagamento manual, migração de WordPress
**Researched:** 2026-10-17
**Confidence:** MEDIUM (ECA Digital confirmado só por imprensa; decreto regulamentador e guia da ANPD não verificados em fonte oficial. Itens legais exigem validação com advogado. Demais itens: experiência de domínio, sem fonte externa.)

## Critical Pitfalls

### Pitfall 1: Tratar o "clique em Sou maior de 18" como suficiente (ECA Digital)

**What goes wrong:** A confirmação 18+ por botão/checkbox (hoje prevista em PROJECT.md) pode não bastar. A Lei 15.211/2025 (ECA Digital) entrou em vigor em 17/03/2026. Segundo a imprensa (Canaltech, 2026), exige verificação de idade confiável e auditável para conteúdo adulto, e a autodeclaração deixa de ser aceita como mecanismo de verificação. Multa até 10% do faturamento no Brasil, limitada a R$ 50 mi por infração, e fiscalização pela ANPD, que sinalizou abordagem inicial "responsiva", com decreto regulamentador ainda pendente na data da matéria.
**Why it happens:** Portais copiam o "age gate" clássico; a lei é nova e o decreto ainda detalha o que conta como verificação.
**How to avoid:** (1) Contratar parecer jurídico curto ANTES da fase de área pública: a área aberta, sem nudez explícita, é conteúdo "pornográfico" para a lei? (2) Projetar o age gate como módulo trocável (interface única), começando pelo mínimo defensável e podendo plugar verificação via Gov.br / token de idade / provedor terceiro. (3) Ter a área de assinantes com verificação real: a casa já conhece seus clientes presencialmente, então registrar conferência de documento no cadastro do assinante (flag `idade_verificada_por`, `data`) é barato e auditável. (4) Não armazenar foto de documento no site. (5) Manter a área aberta SEM nudez explícita (já é restrição do projeto) para reduzir exposição.
**Warning signs:** Age gate implementado só com cookie/localStorage; ninguém decidiu quem "verifica"; decreto novo publicado e ninguém monitora.
**Phase to address:** Fase de fundação/compliance (antes da área pública) + revisão jurídica; reavaliar na pré-publicação.

---

### Pitfall 2: Mídia privada acessível por URL pública (vazamento de fotos/vídeos de assinantes)

**What goes wrong:** Fotos e vídeos de perfis ficam em `/uploads/...` (padrão WordPress) ou bucket público; basta ter o link (ou Google/crawler/WhatsApp preview) para ver sem login. Também: links compartilháveis, thumbnails públicos de mídia restrita, miniaturas usadas em Open Graph.
**Why it happens:** CDN/bucket público é o caminho mais simples; "proteger a página" é confundido com "proteger o arquivo".
**How to avoid:** Mídia de assinantes em storage privado, servida por URL assinada de curta duração (ou proxy autenticado) com checagem de sessão ativa e assinatura válida; `Cache-Control: private`, sem cache em CDN público; nomes de arquivo não adivinháveis (UUID). Prévias da área aberta = derivados separados (desfocados/recortados/marcados) gerados no upload, nunca o original. `X-Robots-Tag: noindex` e `robots` bloqueando a área restrita. Strip de EXIF (GPS!) em todo upload. Considerar marca d'água com ID do assinante em vídeos.
**Warning signs:** Abrir URL de imagem em aba anônima funciona; mesmos arquivos aparecem no sitemap/Google Imagens; URL da imagem de perfil não expira.
**Phase to address:** Fase da área de assinantes/mídia (decisão de storage na fase de stack/fundação). Teste automatizado "anônimo não acessa" como critério de aceite.

---

### Pitfall 3: Dados sensíveis (vida sexual) sob LGPD tratados como cadastro comum

**What goes wrong:** Ser assinante de uma casa de swing + perfis + recados revelam vida sexual (dado sensível, LGPD art. 5º II e art. 11). Vazamento causa dano grave (chantagem, outing). Problemas típicos: sem base legal/consentimento específico e destacado, sem política de privacidade, logs com PII, backups sem criptografia, e-mail de aviso com dados em claro, base migrada do WordPress copiada em planilhas pelo WhatsApp.
**Why it happens:** Equipe pequena, "é só um site"; dump do banco circula por e-mail/pen drive durante a migração.
**How to avoid:** Minimizar dados (nome/apelido, e-mail, telefone só se necessário); consentimento específico no cadastro e na migração (reconfirmar existentes); política de privacidade e Termos; canal do titular (acesso, exclusão — e exclusão real, incluindo mídia e backups com prazo); senhas com argon2/bcrypt; HTTPS+HSTS; backups criptografados; acesso de staff por papéis (staff de conteúdo não vê contatos); registro de acesso ao painel; plano de resposta a incidente (comunicação à ANPD/titulares). Definir encarregado (DPO) — pode ser o responsável da casa.
**Warning signs:** CSV de assinantes em e-mail/Drive; staff com login compartilhado; sem fluxo de "apagar minha conta".
**Phase to address:** Fundação (modelo de dados/papéis) + fase de migração (manuseio do dump) + pré-lançamento (textos legais).

---

### Pitfall 4: Direito de imagem e consentimento não registrados (modelos e membros)

**What goes wrong:** Foto/vídeo de modelo ou frequentador publicado sem autorização escrita específica (escopo, prazo, meios, direito de revogar). Foto de terceiros em perfis de casais (o parceiro/a parceira não consentiu). Conteúdo íntimo divulgado sem consentimento é crime (Cód. Penal art. 218-C e art. 7º-A/Marco Civil art. 21 permitem remoção rápida por notificação); menor ou pessoa não identificada nas fotos de festas é risco grave.
**Why it happens:** O painel só tem "upload"; a autorização fica em papel ou no WhatsApp; fotos de festa tiradas com público ao fundo.
**How to avoid:** Campo obrigatório no upload: "autorização registrada" (referência/arquivo da autorização ou checkbox de responsabilidade da casa) para modelos; no perfil de assinante, aceite de termos afirmando que todas as pessoas nas fotos consentiram e são maiores de 18; fluxo de denúncia/remoção em até 24h com contato visível; fotos do espaço e das festas sem rostos de público, ou só com autorização. Botão "despublicar" rápido no painel. Modelos contratadas: contrato com cláusula de uso e término.
**Warning signs:** Mídia sem metadados de origem; não há como achar quem autorizou; pedido de remoção exige desenvolvedor.
**Phase to address:** Painel de conteúdo (campo/regra) e ClassiSex (termos/denúncia).

---

### Pitfall 5: Hospedagem, CDN, e-mail e redes com política de uso aceitável incompatível

**What goes wrong:** Site derrubado ou conta suspensa após lançamento porque o provedor (hospedagem barata, CDN, serviço de e-mail transacional, Cloudflare Stream/Images, buckets, analytics, Google/Meta Ads, Instagram) proíbe ou restringe conteúdo adulto/nudez, ou o storage de vídeo (YouTube/Vimeo) bloqueia o vídeo. Sem plano B, perde-se mídia e DNS.
**Why it happens:** Escolhe-se plataforma pela facilidade e só se lê a AUP depois.
**How to avoid:** Antes de decidir stack, ler a AUP de CADA provedor (hosting, object storage, CDN, vídeo, e-mail, formulário, mapas, analytics) e escolher os que permitem conteúdo adulto legal; guardar a decisão em STACK.md. Manter o domínio e DNS em conta separada, controlada pela casa (não pelo desenvolvedor). Backup de mídia/banco fora do provedor principal. Não depender de YouTube/Vimeo para vídeos restritos. Anúncios pagos: assumir que não funcionarão para o site; Instagram/Facebook podem derrubar flyers explícitos — manter flyers "SFW" na área aberta (coincide com o requisito).
**Warning signs:** Termos do provedor mencionam "sexually explicit"/"adult"; e-mails de entrega caindo em spam; aviso de revisão de conta.
**Phase to address:** Pesquisa de stack/infra (primeiro) e fase de deploy.

---

### Pitfall 6: Perder assinantes e URLs na migração do WordPress

**What goes wrong:** Hash de senha do WordPress (phpass `$P$`/ bcrypt do WP 6.8+) não é reutilizado e todos precisam redefinir; plugin de assinatura desconhecido guarda validade/planos em tabelas próprias; perfis do ClassiSex são custom post types/meta; mídia com nomes de teste; redirecionamentos 301 esquecidos derrubam SEO; usuários não sabem do novo login. Hoje também não há acesso ao admin/banco e não se sabe a hospedagem.
**Why it happens:** Migração deixada para o fim; só se descobre o formato dos dados quando já se construiu o modelo.
**How to avoid:** Fase 0: obter acesso (hosting, DB dump, lista de plugins) — é bloqueio de roteiro, tratar como dependência. Inventariar usuários, validades, perfis, mídias, URLs indexadas (Search Console). Script de migração idempotente, rodado em staging com dados reais; relatório de conferência (contagens, amostra manual). Suportar hash legado do WP (verificar phpass no login e rehash para argon2) OU enviar link de definição de senha — decidir antes. Mapa de redirecionamentos 301 versionado e testado; manter o WordPress acessível (somente leitura) por semanas. Comunicar assinantes (WhatsApp/e-mail) antes e depois. Congelar edições no WP na janela de corte.
**Warning signs:** "Assinante antigo não consegue entrar" no 1º dia; queda de tráfego orgânico; 404 em URLs de contos/festas.
**Phase to address:** Descoberta/acesso (início) + fase de migração dedicada antes do cutover.

---

### Pitfall 7: Painel complexo demais para a equipe (volta a depender de dev)

**What goes wrong:** CMS poderoso (campos, blocos, papéis) que a equipe não usa; flyers saem com tamanho errado; upload de foto de 12 MB trava; esquecem de expirar assinante; equipe volta a publicar só no Instagram.
**Why it happens:** Painel desenhado por desenvolvedor, não para o fluxo "recebi o flyer, publico em 2 minutos".
**How to avoid:** Fluxos mínimos e nomeados em português ("Nova festa", "Novo conto", "Renovar assinante"); formulários curtos, preview, validação do tamanho/proporção do flyer com recorte automático; processamento de imagem no servidor (redimensiona, converte WebP/AVIF, tira EXIF); lista de assinantes com filtro "vence em 7 dias" e ação de 1 clique "renovar +30 dias"; trilha de auditoria; teste de usabilidade com a equipe real antes do lançamento; 1 página de manual. Ser opinionado: não usar construtor de páginas livre.
**Warning signs:** Equipe pede ao desenvolvedor para trocar um flyer; campos opcionais sempre vazios.
**Phase to address:** Fase do painel — validar com a equipe em protótipo.

---

### Pitfall 8: Indexação/SEO de conteúdo adulto errada

**What goes wrong:** Duas falhas opostas: (a) conteúdo restrito ou prévias explícitas indexado e cacheado, vazando perfis no Google; (b) site inteiro bloqueado ou com `noindex` por engano, ou classificado sem SafeSearch correto, e perdendo clientes. Age gate que bloqueia o Googlebot (interstitial sem HTML renderizável) resulta em páginas vazias/"soft 404".
**How to avoid:** Área restrita: `noindex` + `X-Robots-Tag` + exige login (não só robots.txt, que expõe caminhos). Área aberta: conteúdo textual renderizado no servidor, age gate como overlay sem esconder o HTML; marcar páginas adultas com `<meta name="rating" content="adult">` e `rta` label (RTA) para filtros parentais; sitemap só com URLs públicas; títulos/descrições/OG corretos (os atuais têm "news", "Paraiso Club"); alt text real. Open Graph de prévia usa imagem sem nudez. Checar Search Console após o cutover.
**Warning signs:** `site:swingbrasilia.com.br` mostrando URLs de perfis; Search Console com "Excluída por noindex" em páginas principais.
**Phase to address:** Área pública (SEO) e fase de cutover (verificação).

## Moderate Pitfalls

### Pitfall 9: Pagamento manual sem trilha — acesso expira errado
**What goes wrong:** Datas de validade editadas à mão sem histórico; acesso liberado a quem não pagou; conflito "eu paguei".
**Prevention:** Registro de pagamentos (data, valor, forma, quem registrou, período coberto); expiração automática por data no servidor (não por tarefa manual); aviso de vencimento; reverter ação. Mesmo sem gateway, projetar a tabela `assinaturas` para receber gateway no futuro.
**Phase:** Gestão de assinantes.

### Pitfall 10: Recados/mensagens como vetor de assédio e spam
**What goes wrong:** Contato exposto a todos os assinantes gera assédio, golpe, perfis falsos, vazamento por print/scrape, "faça login e raspe todos os contatos".
**Prevention:** Denunciar/bloquear, limites de taxa, moderação da equipe, ocultar telefone até interação ou opt-in do dono do perfil, controle de visibilidade por perfil, log de acesso a contatos; aviso nos Termos sobre proibição de repasse; marca d'água. Perfis só aprovados pela casa.
**Phase:** ClassiSex/recados.

### Pitfall 11: Vídeos pesados quebrando desempenho e custo
**What goes wrong:** MP4 grande servido direto; página inicial com autoplay; imagens sem `srcset`; tráfego estoura plano.
**Prevention:** Transcodificação para HLS/MP4 otimizado e poster; `preload="none"`; imagens responsivas WebP/AVIF e lazy-load; limite de tamanho no upload; orçamento de desempenho (LCP < 2,5 s em 4G); CDN privado/assinado para restritos (Pitfall 2). Calcular custo de banda antes de escolher o provedor.
**Phase:** Fundação de mídia + auditoria final (Lighthouse).

### Pitfall 12: Contos de assinantes (UGC) com conteúdo ilegal
**What goes wrong:** "Envie seu conto" recebe conteúdo envolvendo menores, não-consentimento ou difamação de pessoas reais.
**Prevention:** Moderação prévia (nada auto-publica); regras explícitas nas Normas; tolerância zero e processo de remoção/denúncia; retenção de logs conforme Marco Civil (guarda de registros de acesso por 6 meses para provedor de aplicações).
**Phase:** Contos / Normas.

### Pitfall 13: Segurança básica do painel e login
**What goes wrong:** Sem rate limit, sem 2FA para staff, sessões longas, enumeração de e-mail, CSRF; uploads aceitando arquivos executáveis.
**Prevention:** 2FA para staff (ao menos TOTP), limite de tentativas, validação de MIME real no upload, cookies `HttpOnly/Secure/SameSite`, atualizações automáticas de dependências. Evitar reintroduzir superfície de plugins (WordPress) se a stack for custom.
**Phase:** Fundação/autenticação.

## Minor Pitfalls

- **Conteúdo herdado com erros** ("assinantess", "profissinais", Instagram duplicado, copyright 2005–2024, handle de Twitter inválido): fazer revisão editorial/checklist de marca; copyright dinâmico. Fase: conteúdo.
- **Endereço físico ausente hoje**: a casa pode querer discrição; decidir (endereço completo vs. bairro + "peça pelo WhatsApp") antes de desenhar a página e o mapa. Fase: área pública.
- **Cookies/analytics e LGPD**: banner de consentimento se houver analytics/pixel; evitar pixels Meta/Google nas páginas restritas. Fase: área pública.
- **Menu duplicado/HTML repetido** do WP não deve ser portado; evitar page-builder.
- **Falta de textos legais em PT-BR** (Termos, Privacidade, Normas, DMCA/remoção). Fase: pré-lançamento.
- **Acessibilidade** (alt, contraste, foco): ainda necessária.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Bucket/pasta pública de uploads para tudo | Implementação trivial | Vazamento de mídia privada (P2) | Nunca para mídia de assinantes; ok só para flyers/fotos públicas |
| Age gate só em JS/cookie | Rápido | Descumprimento do ECA Digital (P1) | Apenas como placeholder interno antes do lançamento, nunca em produção |
| Importar assinantes via CSV por e-mail | Rápido | Vazamento LGPD (P3) | Nunca |
| Editar validade do assinante direto no banco | Evita construir tela | Sem auditoria, erros | Nunca após o lançamento |
| Redirecionamentos manuais ad hoc | Corte rápido | Perda de SEO e 404 | Nunca; usar mapa versionado |
| Página de política copiada de modelo | Rápido | Texto não cobre dados sensíveis | Só como rascunho até revisão jurídica |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Hospedagem/CDN | Assumir que aceita adulto | Ler AUP, documentar, ter backup externo |
| E-mail transacional | Reset de senha cai em spam; provedor bloqueia conteúdo | SPF/DKIM/DMARC; assunto neutro; provedor que permite o ramo |
| Instagram/Facebook | Embeds e links com conteúdo explícito causam strike | Usar apenas links e imagens "SFW"; sem widgets de feed |
| Mapas (Google Maps) | Chave pública sem restrição, custo | Restringir chave por domínio/API; ou mapa estático/OSM |
| Vídeos (YouTube/Vimeo) | Vídeo derrubado ou público | Hospedagem própria/privada para restritos |
| WhatsApp (CTA) | Mostrar número da casa na área aberta como único canal | Link wa.me com mensagem pré-pronta; ok, é número da casa, não de perfis |
| WordPress legado | Importar hash/plugin sem entender | Inventário + staging (P6) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Imagens originais de câmera (5–15 MB) | Página lenta no 4G | Pipeline de resize/WebP no upload | Desde a 1ª festa publicada |
| Vídeo autoplay / MP4 único | Estouro de banda, travamento | HLS/poster/lazy | Dezenas de acessos simultâneos em noite de festa |
| Listagem de perfis sem paginação | TTFB alto | Paginação/cursor, thumbnails | Centenas de perfis |
| URLs assinadas geradas para toda a galeria em uma página | Latência | Gerar sob demanda/lazy | Perfis com muitas fotos |
| Pico pré-festa (sexta/sábado) | Site lento quando mais importa | Cache de páginas públicas (festas) e CDN | Picos de divulgação |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Contato visível no HTML/JSON para quem não é assinante | Quebra o valor da assinatura, LGPD | Renderizar contatos só no servidor após autorização; testes de API |
| IDs sequenciais em perfis/mídia (IDOR) | Scraping de toda a base | UUID + checagem de autorização por objeto |
| EXIF com GPS preservado | Localização de residência de membros | Strip no upload |
| Senhas fracas/hash legado mantido | Credential stuffing | argon2 + rehash na migração + rate limit |
| Tokens de reset reutilizáveis/longos | Takeover de conta | Uso único, expiração curta |
| Painel de staff sem 2FA e papéis | Vazamento interno | Papéis, 2FA, log de auditoria |
| Backups em local público ou sem criptografia | Vazamento em massa | Criptografar, chave separada, retenção definida |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Age gate agressivo que bloqueia o conteúdo antes de qualquer informação | Perde visitantes reais | Overlay curto, direto, lembra a escolha; verificação mais forte só onde exigida |
| Esconder como assinar/preço | Não converte | CTA claro "Como virar assinante" + WhatsApp |
| Prévias borradas demais ou explícitas demais | Sem curiosidade ou risco legal | Prévias sugestivas SFW com selo "restrito a assinantes" |
| Sem próximas festas em destaque | Core value perdido | Home com próximas festas e como chegar |
| Login sem recuperação de senha | Suporte sobrecarregado | Reset por e-mail + canal de suporte WhatsApp |
| Flyer cortado no mobile | Informação perdida | Proporção fixa 4:5/1:1 definida no painel |

## "Looks Done But Isn't" Checklist

- [ ] **Age gate:** parecer jurídico sobre ECA Digital registrado; método de verificação documentado.
- [ ] **Mídia restrita:** URL aberta em aba anônima retorna 401/403 e expira.
- [ ] **Open Graph/WhatsApp preview:** nenhuma imagem restrita ou explícita aparece no preview.
- [ ] **Migração:** contagem de usuários/perfis/validades confere; amostra de 20 logins reais testados.
- [ ] **Redirecionamentos:** todas as URLs do Search Console com tráfego mapeadas; 0 404 relevantes.
- [ ] **Privacidade:** Termos, Política, canal do titular, fluxo de exclusão testado.
- [ ] **Direito de imagem:** toda mídia publicada tem registro de autorização.
- [ ] **Painel:** equipe real publicou uma festa e renovou um assinante sozinha.
- [ ] **Expiração:** assinante vencido perde acesso sem ação manual.
- [ ] **E-mails:** reset de senha chega na caixa de entrada (Gmail/Outlook).
- [ ] **SEO:** `noindex` na área restrita; sitemap só com público; metas corrigidas.
- [ ] **Backup:** restauração testada.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vazamento de URL de mídia | MEDIUM | Rotacionar chaves/assinaturas, renomear arquivos, invalidar cache CDN, pedir remoção no Google, notificar afetados |
| Suspensão por AUP | HIGH | Restaurar de backup externo em outro provedor; DNS sob controle da casa reduz o tempo |
| Falha na migração de senhas | LOW | Envio em massa de link de definição de senha + suporte WhatsApp |
| Foto sem autorização | LOW | Despublicar imediatamente, registrar, regularizar ou remover |
| Incidente de dados | HIGH | Plano de incidente: conter, avaliar, comunicar ANPD/titulares, documentar |
| Indexação indevida | MEDIUM | `noindex`, remoção temporária no Search Console, exigir login |

## Pitfall-to-Phase Mapping

(Fases sugeridas, ajustar ao roadmap final.)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P1 Age verification / ECA Digital | Fundação + parecer jurídico; revisão pré-lançamento | Parecer arquivado; módulo age gate testado |
| P2 Mídia privada exposta | Fundação de mídia / área de assinantes | Teste anônimo automatizado |
| P3 LGPD sensível | Fundação + migração + pré-lançamento | Checklist de privacidade, papéis, exclusão |
| P4 Direito de imagem | Painel + ClassiSex | Upload sem registro é bloqueado |
| P5 AUP de provedores | Pesquisa de stack/infra (1ª) | AUP de cada provedor documentada |
| P6 Migração WordPress | Descoberta/acesso + fase de migração | Relatório de conferência, login real |
| P7 Painel complexo | Painel | Teste de usabilidade com a equipe |
| P8 SEO/indexação | Área pública + cutover | Search Console, `site:` check |
| P9 Pagamentos manuais | Gestão de assinantes | Trilha de auditoria, expiração automática |
| P10 Recados/assédio | ClassiSex/recados | Denúncia, rate limit, visibilidade |
| P11 Mídia pesada | Fundação de mídia + auditoria | Lighthouse mobile |
| P12 UGC contos | Contos | Fila de moderação |
| P13 Segurança painel | Fundação/auth | 2FA, rate limit |

**Pontos para pesquisa mais profunda:** (a) texto do decreto e guia da ANPD sobre verificação de idade em conteúdo adulto (jurídico); (b) formato dos dados do plugin de assinatura atual (depende de acesso); (c) AUP dos provedores finalistas.

## Sources

- Canaltech, "Pontos para entender o ECA Digital que entra em vigor nesta terça (17)" (2026-03): https://canaltech.com.br/internet/pontos-para-entender-o-eca-digital-que-entra-em-vigor-nesta-terca-17/ (MEDIUM; veículo de imprensa, não a lei)
- TecMundo, sobre verificação de idade em sites adultos sob o ECA Digital (resultado de busca; página não acessível ao fetch, não lida): https://www.tecmundo.com.br/internet/411742-eca-digital-so-3-dos-10-maiores-sites-pornos-no-brasil-verificam-idade-corretamente.htm (LOW)
- LGPD (Lei 13.709/2018) arts. 5º II, 11; Marco Civil (Lei 12.965/2014) arts. 15 e 21; Cód. Penal art. 218-C: conhecimento prévio, não reverificado nesta pesquisa (LOW-MEDIUM; validar com advogado)
- Pitfalls 2, 5, 7, 8, 9, 10, 11, 13: experiência de domínio, sem fonte externa (LOW-MEDIUM)

---
*Pitfalls research for: site de casa de swing com área de assinantes (Brasil)*
*Researched: 2026-10-17*
