# Descoberta do WordPress atual (swingbrasilia.com.br)

Registro dos fatos sobre o site atual em WordPress, necessários para planejar a migração (Fase 6). Decisão de referência: D-08.

## Status do acesso

Status: fatos coletados em 2026-10-19 (a partir do dump do banco enviado pelo cliente; sem arquivos de uploads e sem acesso ao wp-admin ainda). Ver "Análise do backup (2026-10-19)" abaixo.

> Atualizar esta linha quando o acesso for liberado (`Status: fatos coletados em {data}`) ou quando o cliente confirmar que não há acesso (`Status: sem acesso em {data}`).

## Canal seguro combinado

Regra (D-08): **senhas e credenciais nunca são enviadas no chat nem gravadas no git.** Este documento registra apenas *qual* canal foi usado, nunca o segredo.

Opções aceitas:

1. **Usuário administrador temporário no WordPress**, criado pelo próprio cliente (wp-admin → Usuários → Adicionar novo, função Administrador), com o e-mail do desenvolvedor. O usuário é **removido logo após a descoberta**.
2. **Compartilhamento por gerenciador de senhas** (ex.: Bitwarden Send, 1Password share), com link que expira.

Para a hospedagem (painel e banco de dados), vale a mesma regra: usuário próprio ou compartilhamento temporário por gerenciador de senhas.

- Canal usado: 2026-10-19 — dump do banco (`.sql.gz`) enviado pelo cliente, guardado fora do git em `private/`; login no wp-admin ainda não compartilhado
- Acesso à hospedagem: cliente tem acesso ao painel da Hostinger (hPanel), informado em 2026-10-19; forma de compartilhamento (subconta ou dump) a combinar

## Checklist de descoberta

Preencher com fatos agregados. Não copiar e-mails, nomes de assinantes, dumps ou senhas para este repositório.

| Item | Valor encontrado | Como obter |
|------|------------------|------------|
| Versão do WordPress | 6.9.10 (db_version 60717); prefixo ativo `wp26_` (o conjunto `wp_` é resto de migração da Hostinger, 1 usuário, sem uso) | wp-admin → Painel → Atualizações (ou rodapé do painel) |
| Tema e Elementor | Tema Hello Elementor; Elementor 3.29.1 + Elementor Pro 3.28.0 | wp-admin → Aparência → Temas; Plugins |
| Lista de plugins ativos | 33 ativos (lista na seção de análise; versões só no wp-admin) | wp-admin → Plugins (copiar nome + versão de cada ativo) |
| Plugin de assinantes (nome, versão, tabelas próprias) | Nenhum plugin de pagamento: papel `subscriber` + plugin **Expire Users** (sem tabela própria, usa `wp26_usermeta`); liberação manual após comprovante. MemberPress, PMS, WPUF, WooCommerce e Ultimate Member estão inativos e só têm testes de 2025 | wp-admin → Plugins; no banco, listar tabelas que não sejam padrão do WP (prefixo `wp_` + nome do plugin) |
| Onde fica a validade da assinatura (tabela/meta key) | `wp26_usermeta._expire_user_date` (timestamp Unix) + `_expire_user_expired` (Y/N) + `_expire_user_settings` (papel de rebaixamento `no_assinante`) | Abrir um assinante de teste no painel do plugin; no banco, procurar a meta key correspondente em `wp_usermeta` ou na tabela própria do plugin |
| Tipo de hash das senhas | bcrypt WP 6.8+ (`$wp$2y$`) 307; phpass (`$P$`) 95 | Ver abaixo |
| Total de usuários e de assinantes ativos | 402 usuários; 32 com validade futura (assinantes ativos); 166 com papel `subscriber` | Contagem em wp-admin → Usuários e no relatório do plugin de assinantes |
| Perfis do ClassiSex (custom post type e campos) | Não é CPT: são comentários wpDiscuz no post `/classisex1/` (205 aprovados) e no post `/mural/` (503); campos `Eu Sou` e `Cidade`; fotos via wpDiscuz (`wmu_attachments`) | Nome do post type, campos personalizados (meta keys), onde ficam as fotos |
| Tamanho de wp-content/uploads | ~0,26 GB só dos originais registrados (335 anexos); tamanho real da pasta a medir na Hostinger | Gerenciador de arquivos da hospedagem ou `du -sh wp-content/uploads` via SSH |
| URLs indexadas | ~125 candidatas do banco (20 páginas, 100 posts, 3 categorias); ver seção de análise | Ver abaixo |
| Hospedagem atual (provedor, plano, acesso a backup/dump) | Hostinger (informado pelo cliente em 2026-10-17); plano e acesso a backup a confirmar no hPanel | Painel da hospedagem; confirmar se é possível baixar backup completo (arquivos + banco) |

### Tipo de hash

O formato das senhas decide se os assinantes poderão manter a senha atual no site novo ou se precisarão criar uma nova.

Como verificar (somente leitura, sem expor nenhuma senha): rodar no banco, pelo phpMyAdmin ou equivalente, a consulta `SELECT LEFT(user_pass,4) AS prefixo, COUNT(*) FROM wp_users GROUP BY 1` (ajustar o prefixo `wp_` se a instalação usar outro). Ela devolve apenas os 4 primeiros caracteres do hash e a quantidade de usuários em cada formato. Registrar só esse resumo:

| Prefixo | Significado | Quantidade |
|---------|-------------|------------|
| `$P$` ou `$H$` | phpass (WordPress antigo) | 95 (`$P$`) |
| `$wp$` (`$wp$2y$...`) | bcrypt do WordPress 6.8+ | 307 |
| outro | plugin próprio ou formato desconhecido (anotar o prefixo) | 0 |

### URLs indexadas

Necessárias para o mapa de redirecionamentos 301 (não perder posições no Google). Fontes, em ordem de preferência:

1. Exportação do Google Search Console (Páginas / Desempenho), se a casa tiver a propriedade verificada.
2. `sitemap.xml` gerado pelo WordPress (ex.: `/wp-sitemap.xml` ou o do plugin de SEO).
3. Busca `site:swingbrasilia.com.br` no Google, registrando os principais caminhos.

Resultado (do banco, 2026-10-19): ~125 caminhos públicos candidatos; lista por padrão na seção "Análise do backup". Confirmar com o Search Console/sitemap do Rank Math.

## Fallback se não houver acesso ao banco

Se só houver acesso ao wp-admin (ou nenhum acesso), os hashes de senha não podem ser migrados. Nesse caso a migração usa **re-cadastro por convite**: cada assinante recebe um e-mail/WhatsApp com link para definir a nova senha no site novo; a validade da assinatura é reconstruída a partir do relatório do plugin (exportação pelo painel) ou da planilha da casa. Esta decisão é registrada aqui com data quando o acesso for confirmado ou negado.

## Análise do backup (2026-10-19)

Fonte: dump MariaDB 11.8 do banco `u991454117_GmENl` (só banco, sem arquivos), analisado localmente por script que imprime apenas agregados. O dump e os extratos **não** estão neste repositório e foram apagados da máquina de trabalho após a análise.

### Instalação

- Prefixo vivo: `wp26_` (~230 tabelas). O conjunto `wp_` é resto da migração da Hostinger ("Website migrated by Hostinger", tema Twenty Twenty-Five, 1 usuário, 3 posts padrão) e pode ser ignorado.
- WordPress 6.9.10, `pt_BR`, URL `https://swingbrasilia.com.br` (siteurl = home), permalinks `/%postname%/`, página inicial estática (`/home/`, ID 42).
- Tema Hello Elementor; Elementor 3.29.1 / Pro 3.28.0. Conteúdo editável da casa em páginas de opções ACF: Página Inicial (slider, programação), Ambientes (galerias), Galeria, Murais, Agenda (terça/sexta/sábado/domingo).
- Plugins ativos (33): Simply Gallery Block, Admin Site Enhancements Pro, ACF Pro, Age Gate, Akismet, BuddyPress, Contact Form 7, Elementor + Pro, Essential Addons (Lite + Pro), **Expire Users**, Flamingo, FluentSMTP, Fluent Forms + Pro, Site Kit, Happy Addons (+ Pro), Header Footer Elementor, **ImagePress**, Integrate Google Drive, LiteSpeed Cache, **Members**, Meow Lightbox, Royal Elementor Addons, Rank Math, SiteSEO, User Menus, Visibility Logic for Elementor, Wordfence, **wpDiscuz**, Youzify.
- Inativos com tabelas/dados restantes: MemberPress, Paid Member Subscriptions, WP User Frontend, WooCommerce, Ultimate Member, FluentCommunity, rtMedia, NextGEN, MediaPress, Smart Slider, WPForms, Gravity Forms.

### Usuários e assinatura

- 402 usuários (cadastro de 2024-06 a 2026-10; 71 em 2024, 172 em 2025, 159 em 2026).
- Papéis: `no_assinante` ("Não Assinante") 228, `subscriber` 166 (+2 com papel duplo), administradores 7.
- Hash: 307 `$wp$2y$` (bcrypt do WP 6.8+), 95 `$P$` (phpass). Nenhum outro formato.
- **Sistema real de assinatura**: manual. A pessoa paga (Pix, cartão, boleto etc.), envia comprovante por e-mail/WhatsApp e o admin troca o papel para `subscriber` e define a validade no **Expire Users**. Conteúdo restrito por papel via Members (`_members_access_role` = subscriber em 10 contos, 1 página e 2 galerias) e por blocos "somente para membros" no Elementor.
- Validade: `wp26_usermeta._expire_user_date` (timestamp Unix) — 338 usuários com data, 41 sem. `_expire_user_expired`: 306 `Y`, 32 `N`.
  - **32 ativos** (papel `subscriber`, data futura entre 2026-10-19 e 2027-08-25; 29 vencem até 2026-12).
  - 108 com papel `subscriber` mas data vencida (103 deles sem papel de rebaixamento configurado) — tratar como expirados (o Expire Users marca `_expire_user_expired=Y` e, pelo que se sabe do plugin, bloqueia o login; confirmar no site).
  - 26 `subscriber` sem data de validade (provável acesso sem prazo; confirmar com a casa).
  - Datas vencidas de 2024-07 a 2026-10.
- Planos (preços nas páginas e cadastrados em PMS/Woo, sem uso real): A R$ 21/1 mês, B R$ 35/2 meses, C R$ 51/3 meses, D R$ 80/6 meses, E R$ 145/1 ano.
- Plugins de assinatura testados e abandonados: MemberPress (14 membros, 0 transações, última atividade 2025-03); PMS (6 assinaturas `pending`/`abandoned`, 7 pagamentos pendentes/falhos, abril/2025); WooCommerce (4 produtos "Plano A–D", 0 pedidos reais); WPUF (só 1 formulário); Ultimate Member (só formulários padrão). `wp26_signups` tem 278 cadastros BuddyPress de mar–abr/2025 (271 nunca ativados).
- Atividade: `imagepress_last_login` registra último login de 362 usuários (2024-09 a 2026-10; 61 nos últimos 90 dias).

### ClassiSex e Mural

- Não há CPT nem perfis do BuddyPress/Youzify em uso (xprofile só tem o campo `Name`; Youzify 19 mídias de teste; rtMedia/NextGEN vazios).
- **ClassiSex** = comentários wpDiscuz no post `/classisex1/` (ID 2894): 205 aprovados (2025-04 a 2026-10), 70 autores, todos logados. Campos extras do formulário wpDiscuz: `Eu Sou` (Casal 64 / Solteiro 130 / Solteira 10) e `Cidade` (texto livre). Contatos ficam no texto do recado e são exibidos só a assinantes.
- **Mural** = comentários wpDiscuz no post `/mural/` (ID 749): 503 aprovados (2025-04 a 2026-10), 414 de visitantes não logados.
- Fotos dos recados: meta `wmu_attachments` (IDs de anexos) — 10 no ClassiSex, 33 no Mural.
- **Galeria Amadora** (`/galeria/`): CPT `image` do ImagePress (envio pelo público), 30 publicados + 11 pendentes, 37 com imagem destacada; meta guarda nome/e-mail de quem enviou (dado pessoal).

### Conteúdo

- Páginas: 20 publicadas, 1 privada, 1 rascunho. Posts: 100 publicados (2024-03 a 2026-07), 5 rascunhos.
- Categorias: Contos 50 (média ~1.280 palavras, de 292 a 4.056; 10 restritos a assinantes), Dicas Hot 30 (média ~480 palavras), `postdev` 36 (posts técnicos/estruturais, como mural, classisex1, programação e avisos; 16 também em Contos/Dicas).
- Outros: 718 contatos Flamingo (CF7) + 59 mensagens (35 "Envie seu conto", 24 "Entre em contato"); Fluent Forms "FAQ" com 79 envios (lista VIP/contato); 25 e-mails BuddyPress; 3 menus (Padrão 20 itens, HOME 21, Hot Vídeo1 15).
- Textos institucionais extraídos em `.planning/phases/02-site-aberto-completo-e-m-dia/02-WP-TEXTS.md`.

### Mídia

- 335 anexos: 269 JPEG, 24 PNG, 8 WebP, 5 GIF, 26 MP4, 3 WebM. Originais somam ~256 MB (pelo metadata).
- Caminhos `wp-content/uploads/AAAA/MM/` de 2024/03 a 2026/10 (+19 em `youzify/`, 8 em `elementor/`).
- Vínculo: 176 sem pai, 81 em posts (capas de contos/dicas), 35 em posts ImagePress, 21 em galerias Simply Gallery, 10 em páginas, 9 em templates Elementor.
- Galerias ACF (IDs de anexo nas opções): Ambientes — exterior 16, salão 3, ambientes de lazer 4, festas temáticas 4, tiradas por clientes 6, FOTOS_DO_CLASSISEX 9, mais 2 galerias de casais (2 e 4); Galeria — usuários 21, strippers e modelos 11; slider da home 6. Página `/quemsomos/` ("Fotos"): carrossel com 9 imagens.

### URLs candidatas a redirecionamento (públicas, sem perfis)

- Páginas: `/` (home), `/sobreacasa/`, `/quemsomos/`, `/regras-da-casa/`, `/faq/`, `/assine-ja/`, `/contos/`, `/envie-seu-conto/`, `/dicas-hot/`, `/galeria/`, `/galeria-hot/`, `/rede-social/`, `/ia-hot-previa/`, `/hot-ia-videos-members/`, `/politica-de-privacidade/`, `/login-ou-cadastro/`, `/checkout/`, `/minha-conta/`, `/esqueci-minha-senha/`, `/obrigado/`.
- Posts: `/{slug}/` na raiz (100 posts; 50 contos, 30 dicas, `/mural/`, `/classisex1/`).
- Categorias: `/category/contos/`, `/category/dicas-hot/`, `/category/postdev/`.
- Outros arquivos: `/image/{slug}/` (ImagePress, 30), `/assinatura/plano-a..d/` (Woo, no sitemap do Rank Math), BuddyPress `/atividades/`, `/grupos/`, `/membros/` (não redirecionar perfis individuais), feeds `/feed/`.
- Rank Math: sitemap com posts, páginas, produtos e categorias; nenhuma regra de redirecionamento cadastrada.

### Abordagem recomendada para a migração

1. **Ler só usuários + Expire Users**: `wp26_users` + `wp26_usermeta` (`wp26_capabilities`, `_expire_user_date`, `_expire_user_expired`). Ignorar MemberPress/PMS/Woo/WPUF.
2. **Validade**: importar `_expire_user_date` como data de fim da assinatura (UTC → America/Sao_Paulo). Ativos = data futura (32). Vencidos entram como ex-assinantes (sem acesso). Os 26 `subscriber` sem data: validar a lista com a casa antes de dar acesso.
3. **Senhas**: manter o hash. Verificar `$wp$2y$` com bcrypt sobre HMAC-SHA384 da senha (formato do WP 6.8+) e `$P$` com phpass; regravar no formato novo no primeiro login. Para quem nunca entrar, fluxo de "definir nova senha".
4. **ClassiSex/Mural**: exportar comentários aprovados dos posts 2894 e 749 com `Eu Sou`, `Cidade`, data e anexos (`wmu_attachments`); decidir com a casa se migra o histórico ou começa vazio (são dados sensíveis, avaliar base legal LGPD).
5. **Mídia**: o dump não traz arquivos; baixar `wp-content/uploads` na Hostinger (~0,3 GB+) e casar pelos `_wp_attached_file`.
