# Phase 4: ClassiSex e prévias de perfis — Context

**Gathered:** 2026-10-19
**Status:** Cliente pediu para pular as perguntas e seguir o modelo do ClassiSex atual (https://swingbrasilia.com.br/classisex1/). Defaults abaixo escolhidos por nós a partir do backup do banco; o cliente pode ajustar.

## Como é o ClassiSex atual (backup do WP, só agregados)
- Não é perfil: são **anúncios curtos** (comentários wpDiscuz no post 2894). 205 aprovados (2025-04 a 2026-10), 70 autores, todos logados; ~3 anúncios por autor; quase sem respostas (1).
- Campos do formulário: **Eu Sou** (obrigatório, rádio: Casal / Solteiro / Solteira), **Cidade** (texto livre, opcional), texto livre. Nome e e-mail não aparecem no anúncio.
- Texto curto: mediana 21 palavras, máximo 94. O contato fica **dentro do texto**: 80 têm telefone, 61 e-mail, 32 citam WhatsApp.
- Fotos raras: só 10 dos 205 têm anexo.
- Visitante vê o anúncio; "os contatos (e-mail, celular) só são visíveis aos assinantes".

## Decisions (defaults — o cliente pode mudar)
- **D-01 Formato:** ClassiSex continua sendo um mural de anúncios curtos, não uma rede de perfis. Cada anúncio: Eu sou (Casal, Solteiro, Solteira — lista editável no painel), Cidade (opcional), texto (até 600 caracteres), contato em **campos separados** (WhatsApp, Telegram, e-mail; ao menos um), até 5 fotos e 1 vídeo curto (até 60 s) opcionais.
- **D-02 Quem publica:** só assinante com acesso ativo, pela área do assinante. Pode ter vários anúncios (como hoje), com limite de 3 ativos ao mesmo tempo. Pode editar e apagar os seus.
- **D-03 Moderação:** anúncio novo ou editado entra na fila da equipe e só aparece depois de aprovado (CLAS-04, PAINEL-07). A equipe pode recusar com motivo.
- **D-04 Área aberta (PREV-01):** lista com Eu sou, cidade e texto; telefones, e-mails, links e @ do texto são removidos automaticamente no servidor; fotos aparecem desfocadas (derivado borrado gerado no servidor, nunca o original); botão "Assine para ver o contato". Nada de nome, e-mail ou contato.
- **D-05 Assinante:** vê tudo, incluindo contatos e mídia original servida por rota protegida (CLAS-06: link direto não abre para quem não é assinante).
- **D-06 Vencimento:** quando a assinatura vence, os anúncios da pessoa somem da lista (pública e restrita) até renovar.
- **D-07 Lista:** mais recentes primeiro, filtro por Eu sou e cidade, paginação.
- **D-08 Denúncia (CLAS-05):** assinante denuncia um anúncio com motivo; a equipe vê na fila e pode despublicar.

## Deferred
- Migração dos 205 anúncios antigos (decisão LGPD do cliente) — Fase 6.
- Mensagens entre assinantes — Fase 5.
