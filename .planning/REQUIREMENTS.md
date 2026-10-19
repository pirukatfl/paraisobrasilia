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

### Área aberta — Prévias e contos (PREV)

- [ ] **PREV-01**: Visitante vê chamadas (prévias) de perfis do ClassiSex, sem nenhum contato ou dado identificável
- [ ] **PREV-02**: Visitante vê chamadas de recados/mensagens, sem contato
- [ ] **PREV-03**: Visitante lê o início de cada conto; o restante aparece só para assinantes
- [ ] **PREV-04**: Toda prévia tem chamada clara para assinar ("Assine Já")

### Área aberta — Institucional (INST)

- [x] **INST-01**: Visitante acessa "Quem Somos" com submenus Normas, Regras e Dicas
- [x] **INST-02**: Visitante vê endereço, mapa e botões "Como chegar" (Google Maps/Waze)
- [x] **INST-03**: Visitante fala com a casa por botão de WhatsApp e vê redes sociais oficiais
- [x] **INST-04**: Visitante confirma ter 18+ ao entrar, sem cadastro (módulo trocável caso a lei exija verificação mais forte)
- [x] **INST-05**: Site tem título, descrição e prévia de compartilhamento corretos em todas as páginas abertas
- [x] **INST-06**: Site tem páginas de Termos de Uso e Política de Privacidade (LGPD)

### Assinantes (ASS)

- [x] **ASS-01**: Assinante entra com e-mail e senha e continua logado entre visitas
- [x] **ASS-02**: Assinante redefine a senha por link enviado ao e-mail (v1: link/senha provisória gerados pela equipe e enviados pelo WhatsApp; e-mail adiado — decisão do cliente 2026-10-19)
- [x] **ASS-03**: Assinante vê até quando sua assinatura vale
- [x] **ASS-04**: Assinatura vencida perde acesso ao conteúdo restrito automaticamente na data
- [x] **ASS-05**: Visitante vê na página "Assine Já" os planos e como pagar (pagamento manual)

### ClassiSex (CLAS)

- [ ] **CLAS-01**: Assinante vê a lista de perfis com fotos
- [ ] **CLAS-02**: Assinante abre o perfil completo com fotos, vídeos e contato
- [x] **CLAS-03**: Assinante cria e edita o próprio perfil (fotos, vídeos, texto, contato)
- [x] **CLAS-04**: Perfil novo ou editado só aparece depois de aprovado pela equipe
- [ ] **CLAS-05**: Assinante denuncia um perfil
- [ ] **CLAS-06**: Fotos e vídeos dos perfis nunca abrem por link direto para quem não é assinante

### Recados e mensagens (REC)

- [ ] **REC-01**: Assinante publica recado visível para outros assinantes
- [ ] **REC-02**: Assinante envia mensagem a outro perfil e vê as respostas
- [ ] **REC-03**: Assinante bloqueia ou denuncia quem envia mensagem
- [ ] **REC-04**: Recados passam por moderação da equipe

### Painel da equipe (PAINEL)

- [x] **PAINEL-01**: Equipe publica, edita e despublica festas com flyer, sem ajuda técnica
- [x] **PAINEL-02**: Equipe envia fotos e vídeos do espaço e das modelos, registrando a autorização de uso de imagem
- [ ] **PAINEL-03**: Equipe publica contos e define o trecho aberto
- [x] **PAINEL-04**: Equipe edita Quem Somos, Normas, Regras, Dicas e dados de contato
- [x] **PAINEL-05**: Equipe libera, renova e encerra a assinatura de um cliente, registrando o pagamento
- [x] **PAINEL-06**: Equipe vê a lista de assinaturas que vencem nos próximos 7 dias
- [ ] **PAINEL-07**: Equipe aprova ou recusa perfis e recados na fila de moderação
- [x] **PAINEL-08**: Toda ação da equipe sobre assinantes fica registrada (quem, quando, o quê)

### Migração e lançamento (MIG)

- [ ] **MIG-01**: Assinantes atuais entram no site novo sem perder o tempo de assinatura que já pagaram
- [ ] **MIG-02**: Perfis atuais do ClassiSex aparecem no site novo com suas fotos
- [ ] **MIG-03**: Links antigos importantes redirecionam para as páginas novas (sem 404 no Google)
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
| CLAS-01 | Fase 4 | Pending |
| CLAS-02 | Fase 4 | Pending |
| CLAS-03 | Fase 4 | Complete |
| CLAS-04 | Fase 4 | Complete |
| CLAS-05 | Fase 4 | Pending |
| CLAS-06 | Fase 4 | Pending |
| PAINEL-07 | Fase 4 | Pending |
| PREV-01 | Fase 4 | Pending |
| PAINEL-03 | Fase 5 | Pending |
| PREV-02 | Fase 5 | Pending |
| PREV-03 | Fase 5 | Pending |
| PREV-04 | Fase 5 | Pending |
| REC-01 | Fase 5 | Pending |
| REC-02 | Fase 5 | Pending |
| REC-03 | Fase 5 | Pending |
| REC-04 | Fase 5 | Pending |
| MIG-01 | Fase 6 | Pending |
| MIG-02 | Fase 6 | Pending |
| MIG-03 | Fase 6 | Pending |
| MIG-04 | Fase 7 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-17*
*Last updated: 2026-10-19 after Phase 1 completion*
