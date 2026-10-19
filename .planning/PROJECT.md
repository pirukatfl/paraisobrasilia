# Paraíso Brasília — Site novo

## What This Is

Site da casa de festas Paraíso Brasília (swingbrasilia.com.br), refeito para ser mais rápido, limpo e moderno. Tem duas partes: uma área aberta, sem nenhum cadastro, que divulga o espaço e as festas para atrair clientes reais; e uma área controlada, só para assinantes, com o ClassiSex (perfis completos com fotos e vídeos) e recados/mensagens com contato.

## Core Value

Quem chega ao site entende rapidamente o que é a casa, vê as próximas festas e consegue chegar até ela; quem é assinante encontra perfis e consegue fazer contato.

## Requirements

### Validated

- ✓ Festas (o "produto"): flyers no formato das redes sociais (1:1 e 4:5), adaptáveis ao celular, cada um levando a uma página com texto e detalhes da festa; festas passadas saem da home sozinhas — Fase 1 (FEST-01..04; prévia no WhatsApp aguardando confirmação do cliente em staging)
- ✓ Confirmação de maioridade (18+) na entrada, sem exigir cadastro (módulo trocável) — Fase 1 (INST-04; parecer jurídico pendente antes do lançamento)
- ✓ SEO básico correto (título, descrição, Open Graph) nas páginas abertas — Fase 1 (INST-05; desempenho alto no celular segue para a Fase 7)
- ✓ Painel simples para a equipe publicar, editar e despublicar festas/flyers sem desenvolvedor — Fase 1 (PAINEL-01; contos seguem na Fase 5)
- ✓ Fotos e vídeos do espaço e fotos das modelos (até 3 por modelo), com autorização de imagem registrada no painel — Fase 2 (MIDIA-01..03, PAINEL-02; galerias aguardam o backup de uploads do WordPress)
- ✓ Endereço, mapa OSM, "Como chegar" (Google Maps/Waze), WhatsApp e redes — Fase 2 (INST-02, INST-03)
- ✓ Quem Somos com Normas, Regras e Dicas, editáveis no painel — Fase 2 (INST-01, PAINEL-04)
- ✓ Login de assinante (sessão de 30 dias), validade por data sem cron, Assine Já com planos/preços/links PagBank editáveis, liberar/renovar/encerrar com pagamento, vencimentos em 7 dias e registro de ações — Fase 3 (ASS-01, 03..05, PAINEL-05/06/08; ASS-02 por senha provisória/link via WhatsApp, e-mail adiado)
- ✓ Termos de Uso e Política de Privacidade — Fase 2 (INST-06; rascunho com marcas [VALIDAR] até o parecer jurídico)

### Active

**Área aberta (sem cadastro, sem restrição, mas SEM contatos de perfis):**
- [ ] Chamadas (prévias) para todo o conteúdo restrito, sem expor contato: perfis, mensagens/recados, fotos
- [ ] Contos e conteúdo curioso; parte dos contos aberta para gerar curiosidade, o restante para assinantes

**Área controlada (só assinantes):**
- [ ] ClassiSex: perfil completo com fotos e vídeos
- [ ] Recados e mensagens com contato

**Operação:**
- [ ] Painel para a equipe publicar contos (festas, fotos e vídeos já validados nas Fases 1-2)
- [ ] Migração dos assinantes e perfis existentes do WordPress atual
- [ ] Desempenho alto no celular (SEO básico já validado na Fase 1)

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
- WordPress atual hospedado na Hostinger; o cliente tem login no wp-admin e acesso à hospedagem, ainda não compartilhados (2026-10-19). Ainda não sabemos: qual plugin gerencia os assinantes, tipo de hash das senhas, logo vetorial.
- Hospedagem do site novo: Hostinger VPS (Ubuntu 24.04, IP 187.77.246.132), mesma conta do site atual. Staging no ar em https://novo.swingbrasilia.com.br (registro DNS A `novo` no hPanel), confirmado pelo cliente em 2026-10-19.
- Código: GitHub pirukatfl/paraisobrasilia (branch main). Cada push no main roda o workflow deploy-staging, que publica as imagens em ghcr.io/pirukatfl/paraisobrasilia; um timer do systemd na VPS (instalado por scripts/deploy/bootstrap-vps.sh) baixa a versão nova a cada 5 minutos, roda as migrações e reinicia. Ninguém precisa de SSH para publicar.
- Banco (Postgres) e mídia ficam em volumes no disco da VPS; o backup fora do servidor ainda não existe (Fase 7).
- O acesso direto ao domínio (inclusive ao staging) e SSH à VPS a partir do ambiente de desenvolvimento são bloqueados pela rede; verificações em staging dependem do cliente ou do CI.

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
| Painel para a equipe da casa publicar | Autonomia no dia a dia | ✓ Good — festas com rascunho/publicar/despublicar no Payload (Fase 1); teste com a equipe pendente |
| Área aberta mostra só prévias, sem contato | Contato é o valor da assinatura | — Pending (prévias nas Fases 4-5) |
| Stack técnica: Next.js 16 + Payload 3 + Postgres 16, em Docker | Painel pronto em português, um só deploy | ✓ Good — Fase 1 no ar em staging |
| Hospedagem: Hostinger VPS (mesma conta do site atual) | Aceita conteúdo adulto por escrito | ✓ Good — staging no ar em novo.swingbrasilia.com.br (2026-10-19) |
| Fotos e vídeos no disco da própria VPS, sem Backblaze B2 | Decisão do cliente (2026-10-17): menos contas e custos; backup precisa incluir a mídia | ✓ Implementado (volume media); ⚠️ backup fora do servidor pendente (Fase 7) |
| Deploy por pull: GitHub Actions → GHCR → timer systemd na VPS | Nosso ambiente não tem SSH para a VPS; o cliente roda um script uma vez | ✓ Good — run 39162346021 publicou as imagens; site no ar |

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
*Last updated: 2026-10-19 after Phase 3 (aprovada pelo cliente)*
