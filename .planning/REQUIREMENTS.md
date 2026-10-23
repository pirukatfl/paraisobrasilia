# Requirements: Paraíso Brasília — Site novo

**Defined:** 2026-10-17 (aprovado pelo cliente)
**Core Value:** Quem chega ao site entende rapidamente o que é a casa, vê as próximas festas e consegue chegar até ela; quem é assinante encontra perfis e consegue fazer contato.

## v1 Requirements

### Área aberta — Festas (FEST)

- [x] **FEST-01**: Visitante vê na home as próximas festas como flyers no formato das redes sociais (1:1 e 4:5), que se adaptam ao celular
- [x] **FEST-02**: Visitante clica no flyer e abre a página da festa com texto, data, horário e detalhes
- [x] **FEST-03**: Visitante compartilha a página da festa no WhatsApp/Instagram e a prévia mostra flyer e título corretos
- [x] **FEST-04**: Festas passadas saem da home automaticamente após a data

### Área aberta — Espaço e modelos (MIDIA)

- [x] **MIDIA-01**: Visitante vê galeria de fotos e vídeos do espaço
- [x] **MIDIA-02**: Visitante vê galeria de fotos profissionais das modelos da casa
- [x] **MIDIA-03**: Fotos e vídeos carregam rápido no celular (formatos modernos, carregamento sob demanda)
- [ ] **MIDIA-06**: Visitante vê em /modelos os cards das modelos (foto de capa + nome artístico) e, ao tocar em um card, abre a página da modelo (Fase 06.1, pedido do cliente 2026-10-23)
- [ ] **MIDIA-07**: Visitante vê na página da modelo o nome, uma descrição curta e a galeria de até 30 fotos e até 3 vídeos, sem nenhum contato, aberta a todos depois do age gate

### Área aberta — Prévias e contos (PREV)

- [x] **PREV-01**: Visitante vê chamadas (prévias) de perfis do ClassiSex, sem nenhum contato ou dado identificável
- [x] **PREV-02**: Visitante vê o convite para mandar recados (botão Enviar recado trancado que leva ao Assine Já), sem contato (revisado 2026-10-20, quick recados-privados)
- [x] **PREV-03**: Visitante lê o início de cada conto; o restante aparece só para assinantes
- [x] **PREV-04**: Toda prévia tem chamada clara para assinar ("Assine Já")

### Área aberta — Institucional (INST)

- [x] **INST-01**: Visitante acessa "Quem Somos" com submenus Normas, Regras e Dicas
- [x] **INST-02**: Visitante vê endereço, mapa e botões "Como chegar" (Google Maps/Waze)
- [x] **INST-03**: Visitante fala com a casa por botão de WhatsApp e vê redes sociais oficiais
- [x] **INST-04**: Visitante confirma ter 18+ ao entrar, sem cadastro (módulo trocável caso a lei exija verificação mais forte)
- [x] **INST-05**: Site tem título, descrição e prévia de compartilhamento corretos em todas as páginas abertas
- [x] **INST-06**: Site tem páginas de Termos de Uso e Política de Privacidade (LGPD)

### Assinantes (ASS)

- [x] **ASS-01**: Assinante entra com e-mail e senha e continua logado entre visitas
- [x] **ASS-02**: Assinante redefine a senha por link enviado ao e-mail (v1: link/senha provisória gerados pela equipe e enviados pelo WhatsApp; e-mail adiado — decisão do cliente 2026-10-19; e-mail ligado em 2026-10-20: "Esqueci minha senha" em /esqueci-senha envia o link pelo SMTP da Hostinger (suporte@swingbrasilia.com.br), com a senha provisória/link da equipe mantidos)
- [x] **ASS-03**: Assinante vê até quando sua assinatura vale
- [x] **ASS-04**: Assinatura vencida perde acesso ao conteúdo restrito automaticamente na data (desde 2026-10-20 o anúncio da própria pessoa continua no ar como gratuito: só a capa, sem vídeos — CONTA-03)
- [x] **ASS-05**: Visitante vê na página "Assine Já" os planos e como pagar (pagamento manual)

### ClassiSex (CLAS)

- [x] **CLAS-01**: Assinante vê a lista de perfis com fotos
- [x] **CLAS-02**: Assinante abre o perfil completo com fotos, vídeos e contato
- [x] **CLAS-03**: Assinante cria e edita o próprio perfil (fotos, vídeos, texto, contato)
- [x] **CLAS-04**: Perfil novo ou editado só aparece depois de aprovado pela equipe
- [x] **CLAS-05**: Assinante denuncia um perfil
- [x] **CLAS-06**: Fotos e vídeos dos perfis nunca abrem por link direto para quem não é assinante

### Recados e mensagens (REC)

- [x] **REC-01**: Assinante manda recado privado ao dono de um anúncio pagante e vê só os recados que mandou ou recebeu (revisado 2026-10-20, quick recados-privados)
- [x] **REC-02**: Assinante envia mensagem a outro perfil e vê as respostas (recados = conversas privadas)
- [x] **REC-03**: Assinante bloqueia ou denuncia quem envia mensagem
- [x] ~~Recados passam por moderação da equipe~~ **REC-04**: substituído em 2026-10-20 (R-01): sem mural, recados são privados, com bloqueio e denúncia (REC-03)

### Painel da equipe (PAINEL)

- [x] **PAINEL-01**: Equipe publica, edita e despublica festas com flyer, sem ajuda técnica
- [x] **PAINEL-02**: Equipe envia fotos e vídeos do espaço e das modelos, registrando a autorização de uso de imagem
- [x] **PAINEL-03**: Equipe publica contos e define o trecho aberto
- [x] **PAINEL-04**: Equipe edita Quem Somos, Normas, Regras, Dicas e dados de contato
- [x] **PAINEL-05**: Equipe libera, renova e encerra a assinatura de um cliente, registrando o pagamento
- [x] **PAINEL-06**: Equipe vê a lista de assinaturas que vencem nos próximos 7 dias
- [x] **PAINEL-07**: Equipe aprova ou recusa perfis e recados na fila de moderação
- [x] **PAINEL-08**: Toda ação da equipe sobre assinantes fica registrada (quem, quando, o quê)
- [ ] **PAINEL-09**: Só a equipe cadastra modelos (nome, descrição, capa, até 30 fotos e 3 vídeos), ordena, publica e despublica pelo painel

### Conta gratuita (CONTA)

Pedido do cliente em 2026-10-20 (quick task `2026-10-20-conta-gratuita`, decisões G-01..G-06).

- [x] **CONTA-01**: Qualquer pessoa com 18+ cria a própria conta em /cadastro (e-mail, senha, apelido), aceita Termos e Privacidade e confirma o e-mail antes de entrar; a equipe continua criando contas
- [x] **CONTA-02**: Conta gratuita cria anúncio com 1 foto e sem vídeo, vê só os próprios anúncios e não manda nem recebe recados
- [x] **CONTA-03**: Ao vencer a assinatura o anúncio continua no ar como gratuito (só a capa, sem vídeos); as outras mídias ficam guardadas e voltam ao renovar
- [x] **CONTA-04**: O quadro Grátis × Assinante é visível em /cadastro, Meus anúncios, Novo anúncio e /assine-ja, e a equipe vê a conta e a origem na lista de assinantes e na moderação

### Migração e lançamento (MIG)

- [x] **MIG-01**: Assinantes atuais entram no site novo sem perder o tempo de assinatura que já pagaram
- [x] **MIG-02**: Perfis atuais do ClassiSex aparecem no site novo com suas fotos
- [x] **MIG-03**: Links antigos importantes redirecionam para as páginas novas (sem 404 no Google)
- [ ] **MIG-04**: Site abre em menos de 2,5 s no celular em 4G nas páginas abertas

## v2 Requirements

- **PAG-01**: Pagamento automático por Pix/cartão com renovação recorrente
- **REL-01**: Lembrete automático de vencimento por e-mail/WhatsApp
- **CLAS-07**: Selo de perfil verificado
- **CLAS-08**: Favoritos e busca avançada no ClassiSex
- **CONT-01**: Assinante envia o próprio conto para aprovação
- **MIDIA-04**: Marca d'água automática nas fotos restritas

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mural | Cortado pelo cliente para um site mais limpo |
| Rede Social | Cortado pelo cliente |
| IA HOT Vídeos | Cortado pelo cliente |
| Galeria Amadora | Cortado pelo cliente |
| Chat em tempo real | Complexo e caro de moderar; mensagens assíncronas bastam |
| Cadastro na área aberta | Pedido explícito: área aberta sem nenhuma restrição |
| Contatos ou nudez na área aberta | Contato é o valor da assinatura; protege indexação e compliance |
| Page builder | Causa da lentidão do site atual |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEST-01 | Fase 1 | Complete |
| FEST-02 | Fase 1 | Complete |
| FEST-03 | Fase 1 | Complete |
| FEST-04 | Fase 1 | Complete |
| INST-04 | Fase 1 | Complete |
| INST-05 | Fase 1 | Complete |
| PAINEL-01 | Fase 1 | Complete |
| INST-01 | Fase 2 | Complete |
| INST-02 | Fase 2 | Complete |
| INST-03 | Fase 2 | Complete |
| INST-06 | Fase 2 | Complete |
| MIDIA-01 | Fase 2 | Complete |
| MIDIA-02 | Fase 2 | Complete |
| MIDIA-03 | Fase 2 | Complete |
| PAINEL-02 | Fase 2 | Complete |
| PAINEL-04 | Fase 2 | Complete |
| ASS-01 | Fase 3 | Complete |
| ASS-02 | Fase 3 | Complete |
| ASS-03 | Fase 3 | Complete |
| ASS-04 | Fase 3 | Complete |
| ASS-05 | Fase 3 | Complete |
| PAINEL-05 | Fase 3 | Complete |
| PAINEL-06 | Fase 3 | Complete |
| PAINEL-08 | Fase 3 | Complete |
| CLAS-01 | Fase 4 | Complete |
| CLAS-02 | Fase 4 | Complete |
| CLAS-03 | Fase 4 | Complete |
| CLAS-04 | Fase 4 | Complete |
| CLAS-05 | Fase 4 | Complete |
| CLAS-06 | Fase 4 | Complete |
| PAINEL-07 | Fase 4 | Complete |
| PREV-01 | Fase 4 | Complete |
| PAINEL-03 | Fase 5 | Complete |
| PREV-02 | Fase 5; revisado em Quick 2026-10-20-recados-privados | Complete |
| PREV-03 | Fase 5 | Complete |
| PREV-04 | Fase 5 | Complete |
| REC-01 | Fase 5; revisado em Quick 2026-10-20-recados-privados | Complete |
| REC-02 | Fase 5 | Complete |
| REC-03 | Fase 5 | Complete |
| REC-04 | Fase 5; substituído em Quick 2026-10-20-recados-privados | Complete |
| MIG-01 | Fase 6 | Complete |
| MIG-02 | Fase 6 | Complete |
| MIG-03 | Fase 6 | Complete |
| MIG-04 | Fase 7 | Pending |
| MIDIA-06 | Fase 06.1 | Pending |
| MIDIA-07 | Fase 06.1 | Pending |
| PAINEL-09 | Fase 06.1 | Pending |
| CONTA-01 | Quick 2026-10-20-conta-gratuita | Complete |
| CONTA-02 | Quick 2026-10-20-conta-gratuita; texto revisado em Quick 2026-10-20-recados-privados | Complete |
| CONTA-03 | Quick 2026-10-20-conta-gratuita | Complete |
| CONTA-04 | Quick 2026-10-20-conta-gratuita | Complete |

**Coverage:**
- v1 requirements: 51 total (44 + 4 de conta gratuita, quick task + 3 da galeria de modelos, Fase 06.1)
- Mapped to phases: 51
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-17*
*Last updated: 2026-10-20 after quick task conta-gratuita*
