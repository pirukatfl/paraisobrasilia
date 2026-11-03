---
type: quick
slug: classisex-comentarios-sem-conta
date: 2026-11-03
executor: claude
status: S1 a S4 completos
---

# Resumo: comentar no ClassiSex sem conta

Pedido do cliente: comentar e conversar num item não exige login nem cadastro; quem não está logado se identifica como quiser.

## O que mudou

- **S1. Modelo**: `ad-comments.author` deixa de ser obrigatório; novo `semConta` (checkbox só leitura, indexado, gravado só pelo serviço). Painel: coluna "Sem conta" (dá para filtrar) e descrição explicando a moderação. Migração `20261103_210621_classisex_comentarios_sem_conta` (autora opcional, `sem_conta`, cinco textos novos, remove três textos aposentados). Nenhum IP vai para o banco.
- **S2. Serviço e ação**: `createComment` aceita visitante (sem `assinanteId`, com `ip` e `website`). Honeypot preenchido devolve `{ id: null }` e a ação responde como sucesso, sem gravar. Limite por IP em memória (`allowAttempt`): 10 por hora e 30 por dia (`VISITANTE_LIMITE_HORA/DIA` em `rules.ts`); o limite de 30 por dia por conta continua para logados. `doAnunciante` só é verdadeiro para conta logada dona do anúncio; o DTO ainda força `false` se `semConta`. `QUEM_COMENTA` ganhou `'todos'` e é o padrão; `'conta'` e `'assinante'` seguem funcionando (visitante recebe 401 com esses valores). A ação lê o IP como `src/lib/assinantes/actions.ts`. Visitante não apaga (comentário sem autora nunca casa com `deleteOwnComment`).
- **S3. Interface**: visitante vê o formulário direto com "Seu nome ou apelido" (vazio), aviso "Não escreva telefone, e-mail ou links: só assinantes veriam.", honeypot escondido e, sob o botão, "Tem conta? Entre para comentar com seu apelido" (`/entrar?next=…`). Responder funciona sem conta no mesmo formulário inline (sem a linha "Tem conta?"). Comentários sem conta mostram o marcador "visitante" (pílula neutra, sem a cor do selo dourado). Textos novos na seção "Comentários" do painel; aposentados `comentarioEntrarTexto`, `comentarioEntrarBotao`, `comentarioCadastroBotao`.
- **S4. Testes e docs**: unit (regras, limites, DTO com `semConta`), int (13 casos novos de visitante), e2e (visitante comenta, é recusado com nome com contato, responde, vê "visitante"; assinante ativo vê o contato do visitante na área do assinante; página aberta sem o contato no HTML). E2E antigo ajustado. Guia da equipe atualizado.

## Desvios

- Só foi acrescentado `semConta: boolean` ao DTO (marca, nunca quem); o resto da proteção de contatos não mudou.
- A migração foi verificada rodando `down` e depois `up` num esquema criado por `push` (banco totalmente novo continua falhando no passo `contact_global`, problema anterior). O histórico de migrações do banco de teste foi marcado como aplicado à mão.
- Sem captura visual do formulário; verificado pelos e2e em desktop e mobile.

## Resultados do gate

- typecheck limpo; lint 0 erros (1 aviso antigo em `recados-privados.spec.ts`).
- unit 57 arquivos / 609 testes ok; int 47 arquivos / 495 testes ok (sem `EMAIL_CAPTURE_DIR`).
- Build de produção com webpack ok.
- e2e dos comentários: 18 ok (9 em mobile, 9 em desktop). Demais specs `classisex-*`: 90 ok, 2 ignorados (já ignorados), 0 falhas, em `next start` com `PRIVATE_MEDIA_DIR`.
- Não rodados: demais e2e fora de ClassiSex (conta gratuita, mensagens, login).

## Para a equipe do cliente

- Painel: ClassiSex → Comentários, coluna "Sem conta"; ocultar/apagar como os demais. Não há "bloquear" para visitante.
- Para voltar ao modelo anterior, trocar `QUEM_COMENTA` em `src/lib/classisex/comentarios/rules.ts`.
- Deploy: rodar `migrate`.
- Fora do escopo: fila de aprovação para comentários sem conta.
