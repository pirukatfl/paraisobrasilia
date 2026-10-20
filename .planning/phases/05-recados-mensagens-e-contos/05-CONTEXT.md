# Phase 5: Recados, mensagens e contos — Context

**Gathered:** 2026-10-20 — cliente respondeu "ok" a todas as recomendações.

## Decisions
- **D-01 Recados:** mural de mensagens curtas (só texto, até 500 caracteres) visível apenas a assinantes ativos; todo recado novo passa pela fila de moderação da equipe (REC-01, REC-04). Autor aparece pelo apelido (mesmo conceito do ClassiSex). Some quando a assinatura do autor vence. Contatos no texto são removidos automaticamente (mesmo redactContacts) — o contato vem pelas mensagens privadas.
- **D-02 Mensagens privadas:** só texto, entre assinantes ativos, iniciadas pelo botão "Enviar mensagem" no anúncio do ClassiSex (e no recado). Conversa em fio com respostas (REC-02). Bloquear (o bloqueado não consegue mais mandar) e denunciar (vai para a equipe, como as denúncias de anúncio) (REC-03). Sem moderação prévia das mensagens privadas.
- **D-03 Contos:** importar os 50 contos do WordPress (categoria Contos; ~1.280 palavras em média; 10 eram restritos). Cada conto tem trecho aberto (padrão: primeiros ~3 parágrafos, editável pela equipe) e o restante só para assinantes (PREV-03, PAINEL-03). Equipe publica novos contos e define o trecho aberto no painel. A importação é um script que lê o dump do WP por caminho informado em variável de ambiente (o dump fica fora do git, em /mnt/project-files/private; quem roda é o orquestrador) e cria os contos via Local API, idempotente.
- **D-04 Aviso de mensagem nova:** contador de mensagens não lidas no menu da área do assinante. E-mail continua desligado.
- **D-05 Prévias (PREV-02, PREV-04):** área aberta mostra chamadas de recados sem contato e sem apelido identificável (ex.: "N recados novos esta semana" + trechos curtos redigidos) e toda prévia tem chamada "Assine Já".

## Deferred
- "Dicas Hot" (30 posts) — avaliar junto com contos se der; não é requisito.
- Envio de conto pelo assinante (CONT-01, v2).

## Orchestrator defaults for planner's open questions (2026-10-20, client may override)
1. Contos reach staging via (A): reviewed export committed as src/migrations/seed/contos-wp.json (repo is private).
2. All 50 contos partial, as D-03 says.
3. Recados: max 3 active per person, no expiry besides the subscription.
4. One apelido per account for recados/messages; ads keep their own apelido.
5. A "menor de idade" report on a message suspends the reported person's messaging immediately (like ads), pending staff review.
6. Contos text only (no covers) until the uploads backup arrives.
7. /recados and /contos in the sitemap.
