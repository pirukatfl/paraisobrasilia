# Paraíso Brasília — Site novo

## What This Is

Site da casa de festas Paraíso Brasília (swingbrasilia.com.br), refeito para ser mais rápido, limpo e moderno. Tem duas partes: uma área aberta, sem nenhum cadastro, que divulga o espaço e as festas para atrair clientes reais; e uma área controlada, só para assinantes, com o ClassiSex (perfis completos com fotos e vídeos) e recados/mensagens com contato.

## Core Value

Quem chega ao site entende rapidamente o que é a casa, vê as próximas festas e consegue chegar até ela; quem é assinante encontra perfis e consegue fazer contato.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Área aberta (sem cadastro, sem restrição, mas SEM contatos de perfis):**
- [ ] Festas (o "produto"): flyers em tamanho igual/adaptável ao das redes sociais; cada flyer leva a uma página com o texto e os detalhes da festa
- [ ] Fotos e vídeos do espaço onde acontecem as festas
- [ ] Fotos profissionais das modelos que a casa contrata
- [ ] Chamadas (prévias) para todo o conteúdo restrito, sem expor contato: perfis, mensagens/recados, fotos
- [ ] Contos e conteúdo curioso; parte dos contos aberta para gerar curiosidade, o restante para assinantes
- [ ] Endereço, mapa e informações que atraiam clientes reais
- [ ] Menu "Quem Somos" com submenus: Normas, Regras, Dicas
- [ ] Confirmação de maioridade (18+) na entrada, sem exigir cadastro

**Área controlada (só assinantes):**
- [ ] ClassiSex: perfil completo com fotos e vídeos
- [ ] Recados e mensagens com contato
- [ ] Login de assinante
- [ ] Assinatura com pagamento manual: o cliente paga por fora e a casa libera/renova o acesso pelo painel

**Operação:**
- [ ] Painel simples para a equipe da casa publicar festas/flyers, fotos, vídeos e contos sem depender de desenvolvedor
- [ ] Gestão de assinantes no painel (liberar, renovar, expirar acesso)
- [ ] Migração dos assinantes e perfis existentes do WordPress atual
- [ ] SEO básico correto (título, descrição, Open Graph) e desempenho alto no celular

### Out of Scope

- Mural — cortado a pedido do cliente para deixar o site mais limpo
- Rede Social — cortada a pedido do cliente
- IA HOT Vídeos — cortado a pedido do cliente
- Galeria Amadora — cortada a pedido do cliente
- Cobrança automática por gateway (cartão/Pix recorrente) — hoje o pagamento é manual; pode virar um marco futuro

## Context

- Site atual: WordPress + Elementor 3.29, em https://swingbrasilia.com.br/. Menu atual: Home, Mural, FAQ, Contos (Envie seu conto), Dicas Hot, Classisex, Fotos, Galeria (Amadora/Hot), IA HOT Videos, Assine Já, Rede Social, Login.
- Problemas observados no site atual: menu repetido 3 vezes no HTML, meta description "news", og:site_name "Paraiso Club" (diferente da marca), handle de Twitter inválido, copyright 2005–2024, muitas imagens sem alt, erros de digitação ("assinantess", "profissinais"), item "Fotos" apontando para "quemsomos", dois Instagrams diferentes, uploads com nome de teste, página pesada por causa do page builder.
- Contato atual: telefone (61) 9 9988-9772, suporte@swingbrasilia.com.br, Facebook e Instagram. Endereço físico não aparece no site atual.
- Público: adultos em Brasília interessados em festas liberais; a casa quer converter visitantes em clientes reais e assinantes.
- Ainda não sabemos: onde o site está hospedado, acesso ao banco/admin do WordPress (necessário para migrar assinantes), qual plugin gerencia os assinantes hoje, logo e identidade visual.
- O acesso direto ao domínio a partir do ambiente de desenvolvimento foi bloqueado pela rede; a análise foi feita só pelo texto da página.

## Constraints

- **Conteúdo adulto**: confirmação 18+ na entrada; área aberta sem nudez explícita nem contatos — protege a indexação e respeita o pedido "tudo sem contato"
- **Direito de imagem**: fotos e vídeos de modelos e frequentadores só com autorização de uso registrada pela casa
- **Privacidade (LGPD)**: dados de assinantes e perfis são sensíveis; acesso restrito, senhas com hash e nada exposto na área aberta
- **Operação**: a equipe da casa precisa publicar sozinha, então o painel deve ser simples
- **Pagamento**: manual (liberação de acesso pelo painel), sem gateway na v1
- **Domínio**: manter swingbrasilia.com.br e preservar URLs importantes com redirecionamentos

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pagamento manual na v1 | É como a casa cobra hoje | — Pending |
| Migrar assinantes e perfis existentes | Ninguém perde acesso na troca | — Pending |
| Cortar Mural, Rede Social, IA HOT Vídeos e Galeria Amadora | Site mais limpo e focado | — Pending |
| Painel para a equipe da casa publicar | Autonomia no dia a dia | — Pending |
| Área aberta mostra só prévias, sem contato | Contato é o valor da assinatura | — Pending |
| Stack técnica | A definir na pesquisa | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-17 after initialization*
