# Phase 1: Fundação e vitrine de festas - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fundação técnica do site novo (app, banco, painel, deploy em staging) e a vitrine de festas: visitante confirma 18+, vê os flyers das próximas festas na home, abre a página de cada festa e compartilha com prévia correta; a equipe publica festas sozinha pelo painel. Também fecha a descoberta: acesso ao WordPress, parecer sobre age gate e AUP dos provedores.
Requisitos: FEST-01..04, PAINEL-01, INST-04, INST-05.

</domain>

<decisions>
## Implementation Decisions

### Identidade visual
- **D-01:** O cliente tem logo e cores definidos. Logo oficial em `brand/logo-original.webp` (fundo preto; arco laranja→vermelho inspirado no Palácio da Alvorada; símbolos ♀ em vermelho e ♂ em dourado; "PARAÍSO" em laranja e "BRASÍLIA" em vermelho, fonte sans fina em caixa alta).
- **D-02:** Paleta derivada do logo: fundo preto/quase preto, laranja (#F08A24 aprox.), vermelho (#C0281E aprox.), dourado (#E8B931 aprox.). Extrair os valores exatos do arquivo. Sem outras cores de destaque.
- **D-03:** Logo vetorial (SVG) ainda não existe; planejar versão otimizada/vetorizada do logo para header e favicon.

### Clima do site
- **D-04:** Escuro e elegante, estilo casa noturna premium. Fundo escuro, tipografia limpa, destaque em laranja/dourado, nada de neon.

### Página da festa
- **D-05:** Campos: flyer (1:1 e/ou 4:5), título, data, horário, texto/detalhes, **valores por tipo** (casal, mulher sozinha, homem sozinho — lista editável), **dress code/tema**, **atrações** (DJ, shows, modelos).
- **D-06:** Botão "Quero ir" pelo WhatsApp NÃO foi escolhido; manter só o botão geral de WhatsApp da casa (INST-03, Fase 2). Não adicionar CTA de WhatsApp por festa.

### Endereço
- **D-07:** Cliente respondeu apontando para o site atual, que hoje NÃO mostra o endereço exato. Seguir o site atual: sem endereço completo na Fase 1 (endereço/mapa é INST-02 na Fase 2; confirmar com o cliente antes daquela fase).

### Acesso ao WordPress
- **D-08:** O cliente tem login do painel do WordPress e acesso à hospedagem. Credenciais NÃO devem ser enviadas no chat; combinar um meio seguro quando a migração/descoberta precisar. Na Fase 1, a descoberta registra: plugin de assinantes, versão do WP, tipo de hash, URLs indexadas.

### Claude's Discretion
- Stack conforme pesquisa (Next.js + Payload + Postgres, VPS); detalhes de layout, tipografia e componentes.
- Age gate: overlay que não bloqueia o HTML para buscadores, implementado como módulo trocável (ECA Digital).

</decisions>

<canonical_refs>
## Canonical References

### Projeto
- `.planning/PROJECT.md` — visão, restrições e decisões do projeto
- `.planning/REQUIREMENTS.md` — FEST-01..04, PAINEL-01, INST-04, INST-05
- `.planning/ROADMAP.md` — Phase 1 e critérios de sucesso

### Pesquisa
- `.planning/research/SUMMARY.md` — resumo
- `.planning/research/STACK.md` — stack recomendada e versões
- `.planning/research/ARCHITECTURE.md` — route groups, gating, mídia
- `.planning/research/PITFALLS.md` — ECA Digital, AUP, mídia privada, SEO do age gate

### Marca
- `brand/logo-original.webp` — logo oficial enviado pelo cliente

</canonical_refs>

<code_context>
## Existing Code Insights

Greenfield: ainda não há código. Site antigo é WordPress + Elementor (não reaproveitar código).

</code_context>

<specifics>
## Specific Ideas

- Flyers no mesmo tamanho das redes sociais (1:1 e 4:5), adaptáveis ao celular.
- Festas passadas somem da home automaticamente.

</specifics>

<deferred>
## Deferred Ideas

- Botão "Quero ir" com mensagem pronta no WhatsApp (não escolhido agora; possível v1.x).
- Endereço completo e mapa — Fase 2, confirmar com o cliente.

</deferred>

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Context gathered: 2026-10-17*
