# Phase 2: Site aberto completo e mídia - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Completar a área aberta: galerias do espaço e das modelos, Quem Somos (Normas, Regras, Dicas), endereço/mapa/"Como chegar", WhatsApp e rede social, Termos de Uso e Política de Privacidade, e o painel para a equipe enviar mídia e editar esses textos e contatos.
Requisitos: MIDIA-01, MIDIA-02, MIDIA-03, INST-01, INST-02, INST-03, INST-06, PAINEL-02, PAINEL-04.

</domain>

<decisions>
## Implementation Decisions

### Endereço e mapa
- **D-01:** Endereço completo e mapa ABERTOS a todos: "Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450". Botões "Como chegar" para Google Maps e Waze. Endereço editável no painel (global de contato).
- **D-02:** Mapa sem custo e sem rastreamento pesado: preferir link/embedding que não exija chave paga; zona rural — permitir que a equipe ajuste as coordenadas (lat/lng) no painel, porque o geocoding do endereço pode errar.

### Contato e redes
- **D-03:** WhatsApp único: (61) 99988-9772 (link wa.me/5561999889772). Também o telefone e o e-mail suporte@swingbrasilia.com.br do site atual.
- **D-04:** NÃO há Facebook. Instagram: os antigos foram derrubados; existe um novo, pequeno — handle ainda não informado. Campo de redes no painel com Instagram opcional (oculto se vazio). Não exibir links antigos.

### Textos institucionais
- **D-05:** Aproveitar e REVISAR os textos atuais de Quem Somos, Normas, Regras, Dicas (e FAQ, se houver) de https://swingbrasilia.com.br/ (corrigir erros de digitação, tom elegante, sem conteúdo explícito na área aberta). O cliente vai ler e ajustar depois — os textos ficam editáveis no painel.
- **D-06:** Informação faltante pode ser obtida do site atual (cliente autorizou).

### Fotos do espaço e das modelos
- **D-07:** Não existem fotos profissionais novas; as fotos são as do site atual. Fonte: backup do WordPress (wp-content/uploads) quando o cliente fornecer — nosso ambiente não alcança o domínio antigo diretamente. Enquanto isso, galerias funcionam vazias com estado vazio elegante, e a equipe pode subir fotos pelo painel.
- **D-08:** Galeria de modelos: foto + NOME (nome artístico), no máximo 3 fotos por modelo, sem página individual por modelo (grade com nome; ampliar foto em lightbox). A seção é secundária ("uso porque não tenho conteúdo") — design não deve depender dela; ocultar a seção se não houver modelos publicadas.
- **D-09:** Direito de imagem: o cliente entende que as fotos enviadas pelas modelos são públicas. Manter um campo simples e NÃO bloqueante no painel ("Autorização de uso de imagem": data + observação, ex.: "enviou as fotos por WhatsApp para divulgação em DD/MM"), recomendado mas não obrigatório para publicar. Registrar na Política de Privacidade o canal para pedir remoção de imagem, com remoção rápida pelo painel.

### Contexto estratégico
- **D-10:** O cliente pensa em encerrar as festas no futuro, mas quer manter o site. O site responde em dois domínios: swingbrasilia e "paraiso brasilia" (domínio exato a confirmar). Implicação: a área aberta não deve depender só de festas — home precisa funcionar bem sem festas futuras (estado vazio que destaca espaço, contos/prévias, assinatura). Planejamento de domínios entra na Fase 7.

### Claude's Discretion
- Estrutura de rotas e menu (ex.: /quem-somos, /quem-somos/normas, /regras, /dicas, /espaco, /modelos, /contato, /termos, /privacidade).
- Textos de Termos e Política de Privacidade (rascunho em pt-BR marcado como "rascunho, revisar com advogado").
- Vídeos do espaço: upload MP4 pelo painel com poster; sem serviço externo.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (Phase 2)
- `.planning/research/SUMMARY.md`, `PITFALLS.md` (LGPD, direito de imagem, mídia)
- `.planning/phases/01-funda-o-e-vitrine-de-festas/01-UI-SPEC.md` — design system já aprovado (cores, fontes, componentes) — Fase 2 deve reutilizar
- `.planning/phases/01-funda-o-e-vitrine-de-festas/SKELETON.md` e summaries 01-04..01-10 — padrões de coleções, cache/tag, mídia local (MEDIA_DIR), testes
- `docs/discovery/AGE-GATE-LEGAL.md` — perguntas LGPD para o advogado
- Site atual (fonte de textos): https://swingbrasilia.com.br/ — páginas Quem Somos, FAQ, Dicas, normas/regras

</canonical_refs>

<code_context>
## Existing Code Insights

- Next.js 16 + Payload 3.91 + Postgres; coleções `users`, `media`, `parties`; mídia em disco via `MEDIA_DIR`; cache por tags com revalidação ao publicar; age gate; layout com header/footer da marca; testes Vitest + Playwright.
- Deploy: push em main → GitHub Actions → GHCR → VPS atualiza sozinha (timer). Migrações rodam no deploy.

</code_context>

<specifics>
## Specific Ideas

- Máx. 3 fotos por modelo.
- Home deve continuar bonita sem festas futuras.

</specifics>

<deferred>
## Deferred Ideas

- Segundo domínio (paraiso brasilia) apontando para o site — Fase 7.
- Importar fotos do WordPress automaticamente — depende do backup (Fase 2 se chegar a tempo, senão Fase 6).

</deferred>

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Context gathered: 2026-10-19*
