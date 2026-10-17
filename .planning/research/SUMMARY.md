# Project Research Summary

**Project:** Paraíso Brasília — site novo (swingbrasilia.com.br)
**Domain:** Casa de festas liberais: área aberta de divulgação + área paga de assinantes (ClassiSex, recados) + painel da equipe + migração de WordPress
**Researched:** 2026-10-17
**Confidence:** MEDIUM

## Executive Summary

Site de marketing de casa noturna adulta com um pequeno produto de assinatura acoplado, em escala local (centenas a poucos milhares de assinantes). Abordagem recomendada: monolito TypeScript — Next.js 16 com Payload CMS 3 embutido e PostgreSQL, em VPS própria com Docker; mídia em storage S3-compatível com bucket público (SFW) e bucket privado com URLs assinadas; páginas públicas em ISR, área de membros em SSR sem cache. O Payload entrega painel, auth e controle de acesso quase prontos.

Desenho central: cada entidade restrita tem projeção pública (prévia, sem contato) e privada; assinatura é estado calculado por data (períodos com `expires_at`), não por cron — protege o contato e deixa o pagamento manual auditável.

Maiores riscos são não técnicos: (1) ECA Digital (Lei 15.211/2025, em vigor desde 17/03/2026) pode invalidar o age gate por clique, e LGPD trata vida sexual como dado sensível; (2) vazamento de mídia privada; (3) AUP de hospedagem/CDN/e-mail; (4) migração bloqueada por falta de acesso ao banco/plugin. Mitigação: parecer jurídico cedo, age gate como módulo trocável, storage privado, AUP documentada, investigação da migração na fase 1.

## Key Findings

### Recommended Stack (STACK.md)
- Next.js 16 + React 19; Payload CMS 3.91 (painel, auth, access control); PostgreSQL 16/17
- Tailwind 4 + sharp (WebP/AVIF, flyers 1:1 e 4:5)
- VPS (Hetzner ou BR) + Coolify/Caddy; Cloudflare só DNS/CDN
- Backblaze B2 ou R2 via `@payloadcms/storage-s3` (bucket público + privado)
- E-mail transacional (Resend/SES); Playwright/Vitest incluindo testes de vazamento
- Evitar: Vercel/Netlify, Cloudinary, Cloudflare Stream/Vimeo/YouTube para mídia restrita, bucket público para mídia de assinantes, GA/pixels, gateway na v1

### Expected Features (FEATURES.md)
- **v1:** gate 18+; home com próximas festas; detalhe da festa com OG; endereço/mapa/WhatsApp; galerias SFW do espaço e modelos; Quem Somos (Normas/Regras/Dicas); SEO/OG; painel (festas, mídia, contos, assinantes); login de assinante com validade; Assine Já (manual); ClassiSex e Recados com moderação; prévias sem contato; contos parciais; migração + 301; páginas LGPD e registro de autorização de imagem
- **v1.x:** botão wa.me "Quero ir", lembrete de vencimento, marca d'água, selo verificado, favoritos, contos enviados por assinantes
- **v2+:** gateway Pix/cartão, notificações de festas, busca avançada

### Architecture (ARCHITECTURE.md)
Route groups por confiança (público / membros / admin) com cache e guard próprios; camada `server/` dona do acesso a dados (DTOs); proteção em 3 camadas (middleware, `requireMember()`, URL assinada); migração em `scripts/migration/`, idempotente, fora do runtime.

### Critical Pitfalls (PITFALLS.md)
1. Age gate por clique pode não bastar (ECA Digital) — parecer jurídico, módulo trocável, registrar verificação presencial de assinantes, área aberta sem nudez
2. Mídia privada em URL pública — bucket privado, URLs curtas, derivados de prévia separados, strip EXIF, teste "anônimo não acessa"
3. LGPD dados sensíveis — minimizar, consentimento específico, reconfirmar migrados, exclusão real, nunca circular CSV
4. AUP de provedores — ler antes de contratar, domínio/DNS em conta da casa, backup fora do provedor
5. Migração — acesso ao WP como bloqueador da fase 1; hash legado ou link de nova senha; mapa 301 versionado

## Implications for Roadmap

1. **Descoberta, compliance e fundação** — deploy, AUP, parecer jurídico, inventário do WordPress, identidade visual
2. **Auth, papéis e painel base** — staff/assinantes, guards, 2FA staff, audit log, períodos de assinatura
3. **Site público e painel de conteúdo** — Core Value; festas, espaço, modelos, Quem Somos, mapa, contos, age gate, SEO, páginas legais
4. **Pipeline de mídia** (paralelo à 3) — upload, derivados, buckets, URLs assinadas, vídeo MP4
5. **Assinaturas, ClassiSex e prévias** — gestão de assinantes, perfis, prévias, moderação
6. **Recados e moderação**
7. **Migração** — ETL, ensaio em staging, 301
8. **Cutover e endurecimento** — Lighthouse, segurança, backups, DNS

**Research flags:** fases 1 (ECA/AUP), 2 (Payload x Next 16), 4 (vídeo), 7 (plugin/hashes WP). Padrão: 3, 5, 6, 8.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versões verificadas no npm; capacidades do Payload de conhecimento prévio |
| Features | MEDIUM-LOW | Sem análise de concorrentes |
| Architecture | MEDIUM | Padrões consolidados |
| Pitfalls | MEDIUM | ECA Digital só por imprensa; exige validação jurídica |

### Gaps to Address
- Acesso ao WordPress (hospedagem, dump, plugin) — sem banco, re-cadastro por convite
- Exigência real do ECA Digital — parecer antes da fase 3
- AUP de VPS, registrador, e-mail, storage
- Perfil autogerido x gerido pela equipe
- Endereço público, logo, planos/valores da assinatura

---
*Research completed: 2026-10-17*
