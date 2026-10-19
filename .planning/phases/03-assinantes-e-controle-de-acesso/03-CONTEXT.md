# Phase 3: Assinantes e controle de acesso — Context

**Gathered:** 2026-10-19 (respostas do cliente no chat)
**Status:** Decisões principais tomadas; tabela de preços aguardando confirmação

## Decisions

- **D-01 Cadastro pela equipe:** o cliente paga, envia o comprovante e a equipe cria a conta no painel. Não há cadastro aberto no site. A equipe pode criar uma conta **sem** acesso à área de assinantes (conta existe, assinatura inativa) e liberar depois.
- **D-02 Pagamento:** links do PagBank por plano (como no site atual). Cada plano no painel tem nome, duração, preço, link de pagamento e um preço promocional opcional ("de / por"). A página "Assine Já" mostra os planos com botão "Pagar" (link PagBank) e a instrução de enviar o comprovante pelo WhatsApp (5561999889772).
  - Links atuais (backup do WP, valores antigos): A pag.ae/7_KBczdX8, B pag.ae/7_KBijcHP, C pag.ae/7_KBjEXQv, D pag.ae/7_KBkGS7R, E pag.ae/7_KBmziQt. Com preços novos, o cliente precisa gerar links novos no PagBank (o valor fica fixo no link).
- **D-03 Preços novos:** o cliente quer subir os preços ("a partir de uns R$ 30") e aceita promoção. Proposta enviada (aguarda confirmação): Mensal R$ 30, Trimestral R$ 75, Semestral R$ 135, Anual R$ 240. Planos são editáveis no painel, então a tabela pode mudar sem desenvolvedor.
- **D-04 Sem e-mail por enquanto:** nenhum disparo de e-mail na v1 desta fase. ASS-02 (redefinir senha por e-mail) fica **adiado**; no lugar: a equipe gera uma senha provisória / link de redefinição no painel e envia pelo WhatsApp; o assinante logado troca a própria senha. Envio de e-mail (SMTP suporte@ da Hostinger) anotado para depois.
- **D-05 Validade:** assinatura = períodos com data de início e fim (fuso America/Sao_Paulo); acesso calculado pela data, sem cron (ASS-04). Renovar estende a partir da maior data entre hoje e o fim atual.
- **D-06 Registro:** toda ação da equipe sobre assinantes (criar, liberar, renovar, encerrar, trocar senha) vai para um log com quem/quando/o quê e o pagamento registrado (plano, valor, forma, observação).

## Deferred
- E-mail transacional (reset de senha, lembrete de vencimento) — depois, via SMTP da Hostinger.
- Migração dos 32 ativos / 26 sem data — Fase 6.
