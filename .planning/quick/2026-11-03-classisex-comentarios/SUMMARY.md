---
type: quick
slug: classisex-comentarios
date: 2026-11-03
executor: claude
status: C1 a C4 completos
---

# Resumo: comentários nos anúncios do ClassiSex

## O que mudou

- **C1. Dados e regras**: coleção `ad-comments` (só equipe lê e escreve pela API; assinantes escrevem apenas pelo serviço). Campos: anúncio, autora (nunca sai para o navegador), resposta, apelido, texto (até 1000), "do anunciante", situação (publicado ou oculto), quem ocultou e motivo. Uma resposta a uma resposta fica sob o comentário principal (um nível). Limite de 30 comentários por conta por dia (meia-noite de São Paulo). Conta nova pode ser bloqueada pela equipe (`comentariosBloqueados` em Assinantes). Apagar anúncio ou conta apaga os comentários. Migração `classisex_comentarios` (inclui as ações novas do registro de auditoria).
- **C2. Contatos protegidos no servidor**: `redactContacts` roda no servidor para quem não é assinante ativo; o texto e o apelido chegam já com `[contato só para assinantes]`. Assinante ativo lê sem edição, sem cache. Ids e e-mail da autora não entram em nenhum DTO.
- **C3. Telas**: seção `#comentarios` no anúncio da área do assinante e nova página aberta `/classisex/anuncio/[id]` (noindex, 404 para anúncio em análise ou inexistente). Cards mostram "Comentários (N)". Visitante vê o convite para entrar e volta ao anúncio depois do login (`safeNext`). Textos editáveis no painel (Textos → ClassiSex → Comentários).
- **C4. Painel e guia**: equipe oculta, reexibe e apaga em Comentários, com registro de auditoria. Seção "Comentários" no guia da equipe.

## Desvios

- Botão de responder só aparece em comentários principais; respostas a respostas são aceitas pelo serviço e recolocadas sob o principal.
- Quem pode comentar fica numa chave no código (`QUEM_COMENTA`, padrão: qualquer conta logada, inclusive gratuita) e a conversa na área aberta em `CONVERSA_NA_AREA_ABERTA`.
- A migração falha em banco totalmente novo no passo `contact_global`, problema que já existia. Para verificar usei o esquema atual do banco de teste.
- Os commits iniciais citam outro nome de modelo no trailer; os seguintes seguem a orientação de atribuição da sessão.

## Resultados do gate

- typecheck limpo; lint 0 erros (1 aviso antigo em `recados-privados.spec.ts`).
- unit 606 ok; int 47 arquivos / 482 testes ok (rodado sem `EMAIL_CAPTURE_DIR`).
- Build de produção com webpack ok. O build padrão (Turbopack) não baixa as fontes do Google no sandbox.
- e2e dos comentários (7, desktop e mobile) ok. E2E já existentes de ClassiSex, conta gratuita, mensagens e login ok em desktop e mobile, com uma exceção: `assinante-login.spec.ts:88` ("Sair") no mobile falha por não achar o botão no menu; não toca em arquivos alterados aqui e não foi comparado com a base.
- Rodar e2e no servidor `dev` (webpack) travou várias vezes (`__webpack_modules__[moduleId] is not a function`) e derrubou testes sem relação; todos passaram em `next start` com `PRIVATE_MEDIA_DIR` definido.

## Para a equipe do cliente

- Comentários no painel (grupo ClassiSex): ocultar, reexibir, apagar.
- Assinantes → ficha da conta: marcar "Comentários bloqueados".
- Textos → ClassiSex → Comentários: todas as frases da seção.
- Deploy: rodar `migrate`.
