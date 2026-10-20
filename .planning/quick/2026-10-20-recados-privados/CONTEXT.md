# Quick task: recados privados — Context

**Pedido do cliente (2026-10-20, texto original):** "na area dos recados, só posso ver recados que eu mandei para alguem ou que
alguem mandou para mim, não pode ficar tudo aberto só por eu ser assinante, pode ter um link para mandar recado no anuncio de
alguem que tem um anuncio e é um pagante também".

**Status das decisões:** a recomendação "UNIFICAR" foi enviada ao cliente e está sendo aplicada, salvo objeção. Se ele objetar,
use a alternativa "Manter separados" (fim deste arquivo) e replaneje.

## Decisions (locked unless the client objects)

- **R-01 Unificar:** o mural de recados (05-CONTEXT D-01) **acaba**. "Recados" passa a ser o nome, para o usuário, das
  conversas privadas que hoje se chamam "Mensagens" (05-CONTEXT D-02). Substitui D-01 inteiro, a parte de recados de D-05
  (prévia pública), REC-04 (moderação prévia de recados) e os padrões 3 ("máx. 3 recados ativos") e 7 (/recados no sitemap) do
  orquestrador da Fase 5. D-02 continua valendo, só muda o rótulo; D-04 (contador de não lidas) passa a ficar no item "Recados".
- **R-02 Quem pode mandar:** o botão **"Enviar recado"** aparece no anúncio do ClassiSex só quando (a) o dono do anúncio é
  assinante ativo (pagante), (b) quem está vendo é assinante ativo e (c) quem está vendo não é o dono. O servidor garante a
  mesma regra (`canSend`: remetente e destinatário ativos, bloqueios, suspensão) seja qual for a tela, inclusive em URL digitada
  e em reenvio de server action.
- **R-03 Só os próprios recados:** a página Recados da área do assinante lista **somente** as conversas que a pessoa começou ou
  recebeu (participante A ou B). Conversa em fio com respostas, Bloquear/Desbloquear, Denunciar, suspensão automática por
  denúncia de "Pessoa menor de idade", limites diários (20 conversas novas, 200 recados por dia) e contador de não lidos ficam
  como estão hoje nas mensagens. Sem moderação prévia (como D-02). Ninguém, nem a equipe, lê conversas de terceiros: a equipe
  só vê o recorte guardado numa denúncia (05-10).
- **R-04 Conta gratuita:** vê "Enviar recado" **trancado** (chamada para assinar, link para /assine-ja) e, na página Recados, o
  painel "Disponível para assinantes" com o comparativo Grátis × Assinante. Não manda nem recebe (G-02 mantido).
- **R-05 URLs (menos mudança):** as rotas atuais `/area-do-assinante/mensagens`, `/mensagens/nova?anuncio=`, `/mensagens/[id]` e
  `/mensagens/nao-lidas` continuam sendo as rotas reais; só os rótulos mudam para "Recados". Redirecionamentos permanentes (308):
  `/recados` → `/assine-ja`; `/area-do-assinante/recados` → `/area-do-assinante/mensagens`. Link antigo de recado
  (`/area-do-assinante/mensagens/nova?recado=N`) leva à lista de Recados (sem criar nada).
- **R-06 Dados antigos dos recados (mural):** a tabela `recados` **fica** (nenhuma migração destrutiva, nenhuma mudança de
  schema). A coleção fica escondida do painel (`admin.hidden`), sem tela de moderação, sem endpoints de moderação, sem página
  pública ou de assinante; a REST continua só para a equipe (como hoje) e a exclusão de conta continua apagando os recados da
  pessoa (LGPD). As ações de auditoria `recado-*` continuam existindo no enum (tirar exigiria migração) e os registros antigos
  continuam no Registro de ações. Observação: a Fase 5 ainda não foi para o staging (05-12 em andamento), então na prática só há
  dados de teste nessa tabela.
- **R-07 Painel da equipe:** some a linha "Recados: N para aprovar" do painel inicial e a coleção "Recados" do menu do painel.
  As denúncias continuam: o grupo do menu passa a se chamar "Recados" e a linha do painel inicial vira
  "Recados: N denúncias abertas · M urgentes" (mesmo link de hoje para as denúncias).
- **R-08 Menu, rodapé, sitemap:** "Recados" sai do menu principal, do rodapé e do sitemap (não há mais página pública de
  recados). No menu da área do assinante fica **um** item "Recados" (com o número de não lidos) no lugar de "Recados" +
  "Mensagens".

## Interpretations chosen (planner discretion, flagged to the client)

- **I-1 Botão trancado sem revelar quem paga:** visitantes e contas gratuitas não veem anúncios completos de outras pessoas (G-02),
  então o "Enviar recado" trancado aparece na prévia aberta do ClassiSex (`PublicAdCard`) em **todos** os cartões, sem indicar
  se o anunciante paga. Motivo: mostrar o botão só nos cartões de pagantes publicaria na área aberta quem é assinante (dado
  pessoal, LGPD; "nada exposto na área aberta"). Se o cliente preferir o botão só nos cartões de pagantes, é uma troca de uma
  condição + um campo booleano no DTO público, a decidir com ele.
- **I-2 Anúncio de conta gratuita visto por pagante:** sem botão; fica a nota "Este anúncio é de uma conta gratuita e não recebe
  recados. Use os contatos do anúncio." Se alguém digitar a URL de envio para esse anúncio, a página mostra a mesma nota e
  **nenhum formulário** (hoje mostra o formulário e só falha ao enviar).
- **I-3 Textos:** "mensagem" vira "recado" em tudo que o assinante vê (títulos, botões, avisos de erro, contador, painel de
  bloqueio). Identificadores de código, coleções (`conversations`, `messages`, `message-reports`), rotas e nomes de arquivo não
  mudam (menos risco, sem migração).
- **I-4 Conversas antigas:** conversas que já tinham assunto "Recado: …" (iniciadas pelo mural em teste) continuam abertas e
  com o mesmo assunto.

## Interaction with 05-12 (running now in another session)

05-12 (deploy da Fase 5 + conferência do cliente) está sendo executado em paralelo (commit 4bf9737 já marcou "Recados: em
revisão" no guia e no runbook). Esta tarefa deve rodar **depois** dos commits de documentação/smoke do 05-12 e **antes** da
conferência do cliente do 05-12, para que o cliente confira o comportamento novo. O roteiro de conferência do 05-12 que fala
em "recado publicado → aprovado → visível" e "/recados público" deve ser trocado pelo roteiro do Plan D desta tarefa.

## Fallback (only if the client objects to R-01)

"Manter separados": recado = bilhete curto de mão única (até 500 caracteres) de um assinante para o dono de um anúncio pagante,
moderado pela equipe e visível só para remetente e destinatário; mensagens privadas continuam à parte — exige replanejar.
