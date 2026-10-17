# Descoberta do WordPress atual (swingbrasilia.com.br)

Registro dos fatos sobre o site atual em WordPress, necessários para planejar a migração (Fase 6). Decisão de referência: D-08.

## Status do acesso

Status: aguardando acesso — 2026-10-17

> Atualizar esta linha quando o acesso for liberado (`Status: fatos coletados em {data}`) ou quando o cliente confirmar que não há acesso (`Status: sem acesso em {data}`).

## Canal seguro combinado

Regra (D-08): **senhas e credenciais nunca são enviadas no chat nem gravadas no git.** Este documento registra apenas *qual* canal foi usado, nunca o segredo.

Opções aceitas:

1. **Usuário administrador temporário no WordPress**, criado pelo próprio cliente (wp-admin → Usuários → Adicionar novo, função Administrador), com o e-mail do desenvolvedor. O usuário é **removido logo após a descoberta**.
2. **Compartilhamento por gerenciador de senhas** (ex.: Bitwarden Send, 1Password share), com link que expira.

Para a hospedagem (painel e banco de dados), vale a mesma regra: usuário próprio ou compartilhamento temporário por gerenciador de senhas.

- Canal usado: _(a preencher — ex.: "usuário admin temporário criado em {data}, removido em {data}")_
- Acesso à hospedagem: _(a preencher — ex.: "subconta no painel", "dump enviado pelo cliente")_

## Checklist de descoberta

Preencher com fatos agregados. Não copiar e-mails, nomes de assinantes, dumps ou senhas para este repositório.

| Item | Valor encontrado | Como obter |
|------|------------------|------------|
| Versão do WordPress | _a preencher_ | wp-admin → Painel → Atualizações (ou rodapé do painel) |
| Tema e Elementor | Elementor 3.29 já observado no HTML público; tema: _a preencher_ | wp-admin → Aparência → Temas; Plugins |
| Lista de plugins ativos | _a preencher_ | wp-admin → Plugins (copiar nome + versão de cada ativo) |
| Plugin de assinantes (nome, versão, tabelas próprias) | _a preencher_ | wp-admin → Plugins; no banco, listar tabelas que não sejam padrão do WP (prefixo `wp_` + nome do plugin) |
| Onde fica a validade da assinatura (tabela/meta key) | _a preencher_ | Abrir um assinante de teste no painel do plugin; no banco, procurar a meta key correspondente em `wp_usermeta` ou na tabela própria do plugin |
| Tipo de hash das senhas | _a preencher_ | Ver abaixo |
| Total de usuários e de assinantes ativos | _a preencher_ (apenas números) | Contagem em wp-admin → Usuários e no relatório do plugin de assinantes |
| Perfis do ClassiSex (custom post type e campos) | _a preencher_ | Nome do post type, campos personalizados (meta keys), onde ficam as fotos |
| Tamanho de wp-content/uploads | _a preencher_ (GB) | Gerenciador de arquivos da hospedagem ou `du -sh wp-content/uploads` via SSH |
| URLs indexadas | _a preencher_ | Ver abaixo |
| Hospedagem atual (provedor, plano, acesso a backup/dump) | _a preencher_ | Painel da hospedagem; confirmar se é possível baixar backup completo (arquivos + banco) |

### Tipo de hash

O formato das senhas decide se os assinantes poderão manter a senha atual no site novo ou se precisarão criar uma nova.

Como verificar (somente leitura, sem expor nenhuma senha): rodar no banco, pelo phpMyAdmin ou equivalente, a consulta `SELECT LEFT(user_pass,4) AS prefixo, COUNT(*) FROM wp_users GROUP BY 1` (ajustar o prefixo `wp_` se a instalação usar outro). Ela devolve apenas os 4 primeiros caracteres do hash e a quantidade de usuários em cada formato. Registrar só esse resumo:

| Prefixo | Significado | Quantidade |
|---------|-------------|------------|
| `$P$` ou `$H$` | phpass (WordPress antigo) | _a preencher_ |
| `$wp$` (`$wp$2y$...`) | bcrypt do WordPress 6.8+ | _a preencher_ |
| outro | plugin próprio ou formato desconhecido (anotar o prefixo) | _a preencher_ |

### URLs indexadas

Necessárias para o mapa de redirecionamentos 301 (não perder posições no Google). Fontes, em ordem de preferência:

1. Exportação do Google Search Console (Páginas / Desempenho), se a casa tiver a propriedade verificada.
2. `sitemap.xml` gerado pelo WordPress (ex.: `/wp-sitemap.xml` ou o do plugin de SEO).
3. Busca `site:swingbrasilia.com.br` no Google, registrando os principais caminhos.

Resultado: _(a preencher — número de URLs e arquivo de lista, sem dados pessoais)_

## Fallback se não houver acesso ao banco

Se só houver acesso ao wp-admin (ou nenhum acesso), os hashes de senha não podem ser migrados. Nesse caso a migração usa **re-cadastro por convite**: cada assinante recebe um e-mail/WhatsApp com link para definir a nova senha no site novo; a validade da assinatura é reconstruída a partir do relatório do plugin (exportação pelo painel) ou da planilha da casa. Esta decisão é registrada aqui com data quando o acesso for confirmado ou negado.
