---
type: quick
slug: classisex-comentarios-sem-conta
date: 2026-11-03
planner: opus
executor: sonnet
---

# Plano: comentar no ClassiSex sem conta (ajuste do cliente 2026-11-03)

Pedido: "a parte de comentar um classisex e ter uma conversa referente a um item, não precisa estar logado ou cadastrado, se a pessoa não está logada, ela se identifica como quiser".

Base: `2026-11-03-classisex-comentarios` (PR #48, já na `main`). Branch `claude/project-thread-il3gw4` recriada a partir de `main` (8300cee).

## S1. Modelo
- `ad-comments.author` deixa de ser obrigatório. Novo `semConta` (checkbox, só a equipe lê; gravado só pelo serviço). Comentário sem conta: `author` vazio, `semConta: true`, `apelido` = nome que a pessoa digitou (mesma regra de apelido sem contato).
- Migração (`classisex_comentarios_sem_conta`), `payload-types.ts` regenerado. Painel: coluna/filtro "Sem conta"; descrição explica que a equipe oculta ou apaga como os demais.
- Não guardar IP em banco (LGPD). O limite usa a memória do processo, como o anúncio sem conta (`allowAttempt` em `src/lib/classisex/visitante.ts` / helpers de limite existentes).

## S2. Serviço e ação
- `createComment` aceita `viewer` visitante: sem `assinanteId`, com `apelido` livre, `ip`. Regras: anúncio visível; parent do mesmo anúncio e publicado; honeypot (campo escondido preenchido → sucesso neutro, nada gravado, igual ao anúncio sem conta); limite por IP: 10 comentários por hora e 30 por dia (constantes em `rules.ts`); o limite diário por conta continua para quem está logado. `doAnunciante` só pode ser true para conta logada (visitante nunca ganha o selo, mesmo usando o apelido do anúncio).
- `QUEM_COMENTA` ganha o valor `'todos'` e passa a ser o padrão (`'conta'` e `'assinante'` continuam funcionando se a equipe/cliente quiser voltar atrás).
- Ação `comentar`: sem sessão → caminho de visitante (IP do mesmo jeito que `src/lib/assinantes/actions.ts`); com sessão → igual hoje. Continua lendo só adId, parentId, apelido, texto (+ honeypot).
- Visitante não apaga comentário (não há identidade); só autor logado e equipe.
- Contatos: nada muda. Texto guardado como escrito; quem não é assinante ativo recebe o texto e o apelido com `redactContacts` no servidor.

## S3. Interface (skill Impeccable: `.claude/skills/impeccable/SKILL.md`)
- Página aberta `/classisex/anuncio/[id]`: visitante vê o formulário direto, com campo "Seu nome ou apelido" (vazio, obrigatório) + comentário + honeypot escondido; sob o botão, linha discreta "Tem conta? Entre para comentar com seu apelido" (link `/entrar?next=…`). Logado: igual hoje (apelido preenchido).
- Responder também funciona sem conta (mesmo formulário inline com o campo de nome).
- Comentários sem conta mostram um marcador discreto "visitante" ao lado do nome (evita alguém se passar por anunciante ou assinante). O selo "Anunciante" fica só para a conta dona do anúncio.
- Aviso curto no formulário de visitante: "Não escreva telefone, e-mail ou links: só assinantes veriam." (contatos ficam escondidos para não-assinantes de todo jeito).
- Textos novos/ajustados na área `classisex`, seção "Comentários" (campo nome, marcador visitante, linha "tem conta?", aviso); remover/aposentar o texto "Entre ou crie sua conta para comentar" se não for mais usado.
- Cartões: o link "Comentar" já leva à página aberta; nada muda.

## S4. Testes e docs
- Unit: novas regras (QUEM_COMENTA 'todos', limites).
- Int: visitante comenta com nome livre (author vazio, semConta true); nome com contato → recusa; honeypot → nada gravado; limite por IP; visitante nunca é `doAnunciante`; visitante responde; DTO público sem contato e sem dado de autor; visitante não apaga; REST anônimo segue negado. Ajustar os testes antigos que esperavam login obrigatório.
- E2E: visitante sem login comenta e responde na página aberta e vê "visitante"; contato escrito por visitante aparece para assinante na área do assinante e fica escondido na área aberta. Ajustar o e2e antigo que esperava "Entre para comentar".
- Guia da equipe (`docs/painel/GUIA-DA-EQUIPE.md`): comentários sem conta e como moderar.
- `pnpm typecheck`, `pnpm lint`, unit + int, e2e dos comentários. `SUMMARY.md` nesta pasta.

## Fora do escopo
- Fila de aprovação para comentários sem conta (hoje publicam na hora; a equipe oculta/apaga). Fácil de ligar depois se aparecer spam.
