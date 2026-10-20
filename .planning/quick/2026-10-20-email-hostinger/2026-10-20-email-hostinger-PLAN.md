---
type: quick
slug: email-hostinger
date: 2026-10-20
requirements: [ASS-02]
---

# Quick 2026-10-20: ligar o e-mail (Hostinger SMTP)

Pedido do cliente: ligar o envio de e-mail pela caixa suporte@swingbrasilia.com.br (D-04 da Fase 3 adiava).

Tarefas:
1. Adaptador `@payloadcms/email-nodemailer@3.91.0` (mesma versão do `payload`), configurado por env; sem `SMTP_USER`/`SMTP_PASS` nada muda (console).
2. "Esqueci minha senha" em `/esqueci-senha` (link em `/entrar`): resposta neutra, 5/hora por IP e por e-mail, e-mail em português (texto + HTML) para `/nova-senha`; guard de `forgotPassword` reaberto só para a ação do site com e-mail configurado e para o link da equipe.
3. Plumbing de deploy: `.env.staging.example`, compose, `bootstrap-vps.sh` (variáveis vazias, nunca geradas nem sobrescritas), `docs/deploy/STAGING.md` seção 11, `scripts/deploy/send-test-email.mjs`.
4. Testes: unitário (fábrica, template, limite), integração (token por e-mail, link antigo cancelado, limite, guard), e2e (neutro, limite, redefinição pelo token capturado), deploy-files.
5. Docs: REQUIREMENTS ASS-02, 03-CONTEXT D-04, PROJECT, GUIA-DA-EQUIPE.
