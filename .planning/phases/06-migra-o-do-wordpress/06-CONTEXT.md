# Phase 6: Migração do WordPress — Context

**Gathered:** 2026-10-21
**Status:** Aprovado pelo cliente em 2026-10-21 ("o restante tudo ok"), com o ajuste em M-02.

## O que existe no WordPress (backup de 2026-10-19, só agregados)
- **402 contas** (wp26_users). Senhas: 307 no formato `$wp$2y$` (WP 6.8+: bcrypt sobre HMAC-SHA384 em base64) e 95 no formato phpass `$P$`.
- **Assinatura = plugin "Expire User"** (`_expire_user_date` em timestamp Unix, `_expire_user_expired` Y/N, papel `subscriber` vs `no_assinante`). Não há MemberPress/PMS/WooCommerce com dados úteis (PMS: 6 linhas pendentes/abandonadas; mepr_members 14 sem transações).
  - 32 contas com vencimento no futuro (out/2026: 9, nov: 13, dez: 7, 2027-03: 1, 2027-08: 2) → **pagantes ativos**.
  - 28 contas `subscriber` sem data de vencimento (ambíguo: cortesia/permanente ou cadastro manual).
  - 108 `subscriber` e 197 `no_assinante` com vencimento passado; 31 `no_assinante` sem data.
  - 6 administradores (inclui contas de teste/desenvolvedor).
- **ClassiSex antigo:** 205 anúncios (comentários wpDiscuz no post 2894), 70 autores, contatos dentro do texto, só 10 com foto (ver 04-CONTEXT).
- **Contos:** já migrados na Fase 5 (48 no pacote).
- Fotos/uploads: não estão no backup do banco; o cliente ainda vai enviar o backup da pasta uploads.

## Decisions (defaults — o cliente pode mudar)
- **M-01 Quem vem:** todas as contas com e-mail válido, exceto administradores e contas de teste, entram como **conta gratuita já confirmada** (G-01..G-06). Apelido = display_name/nicename saneado (sem contato).
- **M-02 Tempo pago:** as 32 com vencimento futuro vêm como **pagantes até a mesma data** (plano "Migrado do site antigo"). As 28 `subscriber` sem data vêm como gratuitas e **o painel admin mostra claramente que não têm data de vencimento** (pedido do cliente 2026-10-21): marcador "Assinante antigo sem data de vencimento" visível na lista e na ficha do assinante, com filtro/lista para a equipe revisar e decidir; o marcador some quando a equipe define uma assinatura ou dispensa o aviso.
- **M-03 Senha:** a senha antiga continua valendo. O hash do WordPress é guardado e conferido no primeiro login (`$wp$2y$` e `$P$`); depois de conferido, a senha é regravada no formato do site novo e o hash antigo apagado. "Esqueci minha senha" funciona para todos.
- **M-04 Anúncios antigos (LGPD):** os 205 anúncios vêm como **rascunho do próprio autor**, invisíveis ao público e aos outros assinantes, com aviso na área do assinante ("Você tinha anúncios no site antigo: revise e publique"). Contatos do texto antigo não são extraídos para os campos novos automaticamente; o autor preenche WhatsApp/Telegram ao publicar. Fotos (10 anúncios) só se o backup de uploads chegar; sem ele, vêm sem foto.
- **M-05 Links antigos:** redirecionamento 301 dos endereços antigos importantes: /classisex1/ → /classisex, /assine-ja/ → /assine-ja, posts de contos → /contos/<slug> (inclusive slugs alterados na importação), páginas institucionais para as equivalentes, perfis/membros/fórum/atividade (BuddyPress, Ultimate Member, Youzify) → /classisex ou /entrar, feeds e wp-admin/wp-login → /entrar. Mapa gerado do backup e versionado no repositório; o resto que não existe vira 410/404 normal.
- **M-06 Ensaio e virada:** a importação é um script idempotente (por ID do WordPress), ensaiada no staging com este backup. Na virada (Fase 7) roda de novo com um backup novo, trazendo só o que mudou.
- **M-07 Sem e-mail em massa nesta fase:** aviso aos usuários sobre o site novo fica para a Fase 7 (lançamento).

- **M-08 Dicas Hot (cliente, 2026-10-21):** os 30 posts "Dicas Hot" entram como **seção nova** no site (trazem visitas do Google), com os links antigos redirecionando para ela. Planejar como quick task depois das etapas 06-01..06-09.
- **M-09 Exclusões e e-mail já existente (cliente, 2026-10-21):** sem lista extra de contas a excluir além de administradores e testes óbvios. Conta nova confirmada com o mesmo e-mail é unida à antiga (mantém a senha nova e ganha o tempo pago); cadastro não confirmado não é unido.
- **Uploads (2026-10-21):** o backup de arquivos do cliente trouxe só uploads/2024 (1.864 arquivos); as pastas 2025 e 2026 (fotos dos anúncios) vieram vazias. Pedido ao cliente baixá-las de novo.

## Deferred
- Aviso por e-mail aos usuários antigos — Fase 7.
- Grupos/fórum/atividade do BuddyPress e mensagens antigas — não migram.
