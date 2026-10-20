# Quick task: conta gratuita no ClassiSex — Context

**Pedido do cliente (2026-10-20, prioridade máxima):** "se eu não for pagante, eu posso ver apenas os meus anúncios, e se eu não for pagante eu posso criar um anúncio com apenas uma imagem, e se eu for pagante posso criar o anúncio como está hoje, 10 imagens e 2 vídeos, e essa informação do que pode fazer sendo pagante ou não deve ser visível para o usuário".
Cliente respondeu "ok" às recomendações abaixo.

## Decisions
- **G-01 Cadastro aberto:** qualquer pessoa 18+ cria a própria conta (e-mail + senha + apelido) em /cadastro, com declaração de 18+ e aceite de Termos/Privacidade. Verificação de e-mail obrigatória (e-mail via Hostinger já funciona). Rate limit por IP/e-mail. Conta nasce sem assinatura (gratuita). A equipe continua podendo criar contas e liberar assinatura (Fase 3 intacta). Revoga a parte "sem cadastro aberto" de 03-CONTEXT D-01 e o bloqueio de first-register só para o caso vazio continua seguro.
- **G-02 Gratuito:** pode criar anúncio com 1 foto, sem vídeo (limite de anúncios ativos continua 3); vê só os próprios anúncios em "Meus anúncios"; não vê a lista do ClassiSex dos assinantes nem contatos; não manda/recebe mensagens nem recados (Fase 5) — vê a chamada "Assine Já".
- **G-03 Assinante:** como hoje — 10 fotos, 2 vídeos, vê todos os anúncios com contatos.
- **G-04 Visibilidade de anúncio gratuito:** depois de aprovado pela equipe, aparece na lista dos assinantes (com 1 foto) e na prévia aberta (apelido, tipo, foto desfocada).
- **G-05 Vencimento:** substitui 04-CONTEXT D-06 / escolha 5 do cliente. Quando a assinatura vence, o anúncio continua no ar como gratuito, mostrando só a primeira foto (capa) e nenhum vídeo; as demais mídias ficam guardadas e voltam ao renovar. Ao editar sendo gratuito, só pode manter 1 foto.
- **G-06 Comparativo visível:** em /cadastro, "Meus anúncios", "Novo anúncio" e /assine-ja, um quadro simples Grátis × Assinante (1 foto, só seus anúncios × 10 fotos, 2 vídeos, todos os anúncios e contatos, mensagens e recados) com botão "Assine Já".
