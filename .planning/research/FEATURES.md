# Feature Research

**Domain:** Site de casa de swing/festas liberais (Brasília) com área pública de divulgação + área de assinantes (classificados de perfis, recados) e painel da equipe
**Researched:** 2026-10-17
**Confidence:** MEDIUM-LOW. Baseado em conhecimento de domínio (sites de clubes de swing, classificados adultos, sites de eventos) e no PROJECT.md. Nenhuma busca web foi feita nesta rodada; competidores não foram analisados um a um. Validar com o cliente.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Confirmação 18+ na entrada | Padrão do setor; protege indexação e a casa | LOW | Gate leve (cookie/localStorage), sem cadastro. Não bloquear crawlers de forma que quebre SEO/OG (renderizar conteúdo, overlay por cima). |
| Home com próximas festas em destaque | Visitante quer saber "quando e quanto" | LOW | Grade de flyers ordenada por data; festas passadas saem do destaque. |
| Página de detalhe da festa | Flyer leva a texto, data, horário, valores, regras da noite | MEDIUM | URL própria, OG com o flyer (compartilhamento no WhatsApp/Instagram é o canal principal). Flyer em proporção das redes (1:1 e 4:5). |
| Endereço, mapa, como chegar, horários | Hoje o endereço nem aparece; é o principal gargalo de conversão | LOW | Mapa embutido (ou link para Maps/Waze); decidir com o cliente quanto do endereço expor. |
| Contato da casa e CTA de WhatsApp | Reservas/lista/dúvidas passam por WhatsApp no Brasil | LOW | Botão fixo no mobile; telefone da casa, não de perfis. |
| Fotos e vídeos do espaço | Prova de ambiente é o que converte casal novato | MEDIUM | Galeria otimizada (WebP/AVIF, lazy load); vídeos hospedados com player leve, sem autoplay pesado. |
| Fotos profissionais das modelos | Já faz parte da oferta da casa | LOW | Mesma galeria; sem nudez explícita na área aberta. |
| Quem Somos: Normas, Regras, Dicas | Etiqueta é central em swing; reduz fricção na porta | LOW | Conteúdo editável pelo painel; páginas estáticas com boa tipografia. |
| Site rápido e responsivo (mobile-first) | Maioria do tráfego é celular; site atual é pesado | MEDIUM | Meta de Core Web Vitals; imagens responsivas; sem page builder. |
| SEO básico + Open Graph corretos | Corrigir título/description/og:site_name atuais | LOW | Sitemap, robots, alt em imagens, marca consistente, schema LocalBusiness/Event. |
| Login de assinante (e-mail/usuário + senha, recuperação) | Acesso à área restrita | MEDIUM | Hash forte (argon2/bcrypt), reset por e-mail, rate limit, sessão segura. |
| Controle de acesso por status da assinatura | Núcleo do modelo de negócio | MEDIUM | Estados: ativo, expirado, suspenso; checagem no servidor em toda rota/mídia restrita. |
| ClassiSex: lista e perfil completo com fotos/vídeos | O produto pago | HIGH | Busca/filtro simples (tipo de perfil, cidade/região), paginação, galeria por perfil. |
| Recados/mensagens com contato (mural de anúncios entre assinantes) | O outro produto pago | MEDIUM | Publicar, listar, expirar anúncio; contato visível só para assinante. |
| Prévias da área restrita sem contato | Gera desejo de assinar; exigência do cliente | MEDIUM | Versão pública com mídia borrada/limitada e CTA "Assine"; nunca renderizar contato ou mídia completa no HTML/URL público. |
| Página "Assine já" com instruções de pagamento manual | Como o cliente converte hoje | LOW | Planos, valores, chave Pix/WhatsApp para enviar comprovante. |
| Painel da equipe: festas/flyers, fotos, vídeos, contos | Autonomia sem desenvolvedor | HIGH | CRUD simples, upload com redimensionamento automático, rascunho/publicar, agendamento opcional. |
| Gestão de assinantes (liberar, renovar, expirar, buscar) | Pagamento é manual | MEDIUM | Data de vencimento, histórico de renovações, lista de "vencendo em 7 dias". |
| Moderação/aprovação de perfis e recados | Sem isso o classificado vira spam/golpe/menor de idade | MEDIUM | Fila de aprovação; remover/suspender; denunciar. |
| Contos: parte aberta + resto para assinantes | Já pedido; gera curiosidade e SEO | LOW | Corte por "ler mais" com bloqueio no servidor (não só CSS). |
| Migração de assinantes, perfis e redirecionamentos 301 | Ninguém perde acesso na troca | HIGH | Depende de acesso ao WordPress (desconhecido). Fluxo "defina nova senha" em vez de migrar hashes, se não forem compatíveis. |
| Páginas legais: termos, privacidade (LGPD), política de uso de imagem | Dados sensíveis (vida sexual) sob LGPD | LOW | Aceite de termos no cadastro/perfil; canal para exclusão de dados e remoção de imagem. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Compartilhamento otimizado de festa (OG + botão WhatsApp) | Divulgação orgânica; festa é o "produto" | LOW | Barato e de alto retorno. |
| Calendário/agenda de festas e filtro por tipo de noite | Visitante planeja; casa reduz perguntas | MEDIUM | Lista simples já cobre v1. |
| Botão "Quero ir" / lista de nome ou interesse na festa | Conversão visitante para cliente real | MEDIUM | Sem cadastro: link WhatsApp pré-preenchido. Evita guardar dados. |
| Aviso de vencimento ao assinante (e-mail/WhatsApp link) | Reduz churn sem gateway | LOW-MEDIUM | Lembrete manual assistido pelo painel (link wa.me pronto) antes de automatizar. |
| Marca d'água automática nas mídias de perfis | Dissuade vazamento de fotos | MEDIUM | Aplicar no upload; também protege direito de imagem. |
| Mídia restrita com URLs assinadas/expiráveis | Impede hotlink e compartilhamento do link | MEDIUM | Essencial se o conteúdo vale a assinatura. |
| Registro de autorização de imagem por modelo/perfil | Cumpre constraint de direito de imagem | LOW-MEDIUM | Campo + anexo no painel; bloqueia publicação sem autorização. |
| Perfil verificado (selo) | Confiança em ambiente de golpes/fakes | MEDIUM | Verificação manual pela equipe. |
| Favoritos e perfis vistos | Retém assinante | MEDIUM | v1.x. |
| Contos enviados por assinantes (já existe "Envie seu conto") | Conteúdo gerado de graça, engaja | MEDIUM | Formulário + moderação; manter se o cliente usa hoje. |
| Pagamento manual com comprovante enviado pelo assinante | Agiliza liberação | MEDIUM | v1.x; ponte até um gateway. |
| Identidade visual moderna e discreta | Percepção premium vs. site atual | MEDIUM | Depende de logo/identidade (ainda desconhecidos). |
| Notificação de nova festa para quem pediu (opt-in) | Retorno recorrente | MEDIUM | Futuro; exige base legal LGPD. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Mural, Rede Social, IA HOT Vídeos, Galeria Amadora | Existiam no site atual | Já cortados pelo cliente; moderação pesada, risco legal | Manter fora (Out of Scope). |
| Chat em tempo real entre membros | "Redes sociais adultas" têm | Moderação, assédio, armazenamento de conversas sensíveis | Recados com contato externo (WhatsApp). |
| Cobrança automática por gateway na v1 | Parece moderno | Fora do escopo; gateways restringem conteúdo adulto | Pagamento manual; avaliar depois. |
| Cadastro obrigatório na área aberta | Capturar leads | Atrito; contradiz o requisito "sem cadastro" | CTA de WhatsApp. |
| Contatos/telefones de perfis na área aberta | Atrair cliques | Quebra o valor da assinatura e a regra do cliente; risco de scraping | Prévia com contato oculto. |
| Nudez explícita na área aberta | Atrair tráfego | Risco de bloqueio por buscadores/hospedagem/redes; público menor de idade | Material sugestivo na aberta; explícito só atrás de login. |
| Upload livre de fotos por visitantes | Engajamento | Risco de revenge porn/menores/direito de imagem | Upload só de assinantes, com aprovação prévia. |
| Verificação de idade por documento no acesso público | "Mais seguro" | Fricção alta, coleta de dado sensível | Gate 18+ simples; verificação só no perfil/assinatura se necessário. |
| Analytics/pixels de terceiros invasivos (Meta Pixel) | Remarketing | Revelam navegação em site adulto, LGPD | Analytics sem cookies e agregado. |
| Page builder no novo site | Fácil de editar | Origem da lentidão atual | Painel com campos estruturados. |
| Comentários/curtidas públicas | Engajamento | Spam e moderação | Nenhum. |

## Feature Dependencies

```
Gate 18+ ──enhances──> toda a área aberta

Login de assinante
    └──requires──> Modelo de assinatura (status/validade)
                       └──requires──> Gestão de assinantes no painel

ClassiSex (perfis) ──requires──> Login + status ativo
    ├──requires──> Upload de mídia com processamento (resize, marca d'água)
    ├──requires──> Moderação/aprovação
    └──requires──> Autorização de imagem registrada

Recados ──requires──> Login + moderação

Prévias públicas ──requires──> ClassiSex/Recados/Contos (mesmos dados, saída filtrada sem contato)

Contos parcial ──requires──> Controle de acesso no servidor

Migração WordPress ──requires──> Modelo de dados de assinante/perfil definido
                              └──requires──> Acesso ao banco/plugin atual (BLOQUEADOR externo)

Painel (CMS) ──requires──> Auth de equipe (papéis separados de assinante)
    └──enhances──> Festas, galerias, contos

Redirecionamentos 301 ──requires──> Mapa de URLs do site atual
```

### Dependency Notes

- **Prévias dependem do modelo restrito:** o dado de contato nunca deve sair em rotas públicas; construir a camada de projeção "pública" desde o início.
- **Migração é o maior risco de prazo:** depende de acesso ao WordPress e do plugin de assinantes. Desenhar o modelo de dados já pensando no mapeamento.
- **Painel antes do conteúdo:** festas, mídias e contos precisam do CMS para a equipe operar; sem ele o site vira trabalho de desenvolvedor.
- **Moderação conflita com publicação automática:** perfis e recados entram como pendentes.

## MVP Definition

### Launch With (v1)

- [ ] Gate 18+, home, festas (lista + detalhe), espaço, modelos, endereço/mapa, Quem Somos (Normas/Regras/Dicas), WhatsApp: núcleo da proposta "entender, ver festas, chegar"
- [ ] SEO/OG corretos, mobile rápido
- [ ] Auth de equipe + painel (festas, mídia, contos, assinantes)
- [ ] Login de assinante + status/validade + Assine Já (pagamento manual)
- [ ] ClassiSex e Recados com moderação; prévias públicas sem contato
- [ ] Contos parciais
- [ ] Migração de assinantes/perfis + 301
- [ ] Páginas legais LGPD; autorização de imagem registrada

### Add After Validation (v1.x)

- [ ] Marca d'água e URLs assinadas, caso não entrem no v1: gatilho = primeiro caso de vazamento ou ao definir hospedagem de mídia
- [ ] Lembrete de vencimento assistido via WhatsApp: gatilho = churn por esquecimento
- [ ] Comprovante de pagamento enviado pelo assinante
- [ ] Favoritos, selo de verificado, contos enviados por assinantes

### Future Consideration (v2+)

- [ ] Gateway Pix/cartão recorrente: avaliar política dos provedores para conteúdo adulto
- [ ] Notificações opt-in de novas festas
- [ ] Busca avançada e filtros no ClassiSex

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Festas (lista + detalhe + OG) | HIGH | MEDIUM | P1 |
| Endereço/mapa/WhatsApp | HIGH | LOW | P1 |
| Gate 18+ | HIGH | LOW | P1 |
| Galerias espaço/modelos | HIGH | MEDIUM | P1 |
| Quem Somos | MEDIUM | LOW | P1 |
| Painel CMS | HIGH | HIGH | P1 |
| Login + status de assinatura | HIGH | MEDIUM | P1 |
| ClassiSex | HIGH | HIGH | P1 |
| Recados | HIGH | MEDIUM | P1 |
| Moderação | HIGH | MEDIUM | P1 |
| Prévias sem contato | HIGH | MEDIUM | P1 |
| Migração WordPress + 301 | HIGH | HIGH | P1 |
| Contos parciais | MEDIUM | LOW | P1 |
| Páginas legais/LGPD | HIGH | LOW | P1 |
| Marca d'água / URLs assinadas | MEDIUM | MEDIUM | P2 |
| Lembrete de vencimento | MEDIUM | LOW | P2 |
| Selo de verificado, favoritos | LOW | MEDIUM | P3 |
| Gateway de pagamento | MEDIUM | HIGH | P3 |

## Competitor Feature Analysis

Sem análise direta de concorrentes (não pesquisados nesta rodada). Padrões gerais do setor, de conhecimento prévio (confiança baixa):

| Feature | Sites de clubes de swing | Classificados adultos | Our Approach |
|---------|--------------------------|----------------------|--------------|
| Gate 18+ | Quase universal | Universal | Overlay leve, sem cadastro |
| Agenda/flyers | Central, via Instagram | Raro | Flyer para página de detalhe |
| Perfis | Raro, ou via app/redes | Central, com verificação | Só assinantes, moderados |
| Pagamento | Por fora (Pix/WhatsApp) | Gateway ou créditos | Manual na v1 |

## Sources

- /mnt/project-files/paraiso-site/.planning/PROJECT.md (escopo, restrições, problemas do site atual)
- Conhecimento de domínio e boas práticas (LGPD para dados sensíveis, política de conteúdo adulto de buscadores/hospedagem): MEDIUM-LOW, não verificados em fontes externas
- Pendente de validação: lista de concorrentes brasileiros, políticas de gateways para conteúdo adulto, comportamento real do plugin de assinatura atual

---
*Feature research for: site de casa de swing com área de assinantes (Paraíso Brasília)*
*Researched: 2026-10-17*
