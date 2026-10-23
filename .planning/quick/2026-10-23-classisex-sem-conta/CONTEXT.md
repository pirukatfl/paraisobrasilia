# Quick 2026-10-23: ClassiSex sem conta + fotos sem desfoque — CONTEXT

## Pedidos do cliente (2026-10-23)

1. "No classisex todo mundo pode fazer sua postagem, logado ou não, assinante ou não … para quem não é assinante deve
   aparecer só o texto e a imagem mas os contatos não … segue os limites de uma imagem apenas para quem não é pagante".
   Escolhendo "Sem conta": "formulário em aberto como se fosse uma pagante, porem só pode colocar uma imagem".
2. Mensagem seguinte, no mesmo dia: "as fotos aparecem sempre, não precisa desfocar mais".

## Decisões (travadas; os IDs são citados no PLAN)

### A. Fotos sem desfoque (pedido 2)

- **Q-01** A área aberta (`/classisex`), o mural da conta gratuita (o mesmo `PublicBoard`) e os cartões param de mostrar
  foto desfocada. A rota `/classisex/previa/{mediaId}` passa a servir a **miniatura nítida** (`sizes.card`, webp 480 px,
  já reencodada pelo Payload, sem EXIF/GPS). Se a foto não tiver `card` (foto pequena: `withoutEnlargement`), a rota serve
  o original (também webp reencodado, no máximo 2000 px). A URL fica igual (menos mudança nos testes e no cache).
- **Q-02** O que pode ser visto **não muda**: a área aberta e a conta gratuita veem só a **capa** (`coverOf`), nunca outras
  fotos nem vídeo; anúncio pendente/recusado/despublicado → 404; contatos continuam escondidos (texto redigido no servidor).
  O assinante continua vendo tudo pela rota protegida `/area-do-assinante/midia/…`.
- **Q-03** O desfoque deixa de ser gerado: o hook `writePreview` do `AdMedia` sai e `src/lib/classisex/blur.ts` é apagado
  (e `tests/unit/blur.test.ts`). O campo `previa` **fica** (sem migração) e o `removePreview` continua apagando os
  arquivos `-previa.webp` antigos quando a mídia é excluída. Sem script para apagar os antigos (são minúsculos).
- **Q-04** Cabeçalhos da rota de prévia: continua `Cache-Control: public, max-age=600` (mesma janela de antes para um
  anúncio despublicado sumir) e passa a mandar `X-Robots-Tag: noindex, noimageindex`. O age gate fica como está.
- **Q-05** Textos: "desfocada(s)" sai do site, do painel e do guia (`TIER_COMPARISON`: "todos, sem contato" ; alt do cartão:
  "Foto do anúncio"; chamadas "Assine para ver o contato e as fotos" → "Assine para ver o contato, todas as fotos e os
  vídeos"). Busca obrigatória: `grep -rni "desfoc\|blur" src docs` sem resultado de texto de produto no fim.
- **Q-06 (CONFIRMAR COM O CLIENTE)** O PROJECT.md diz "área aberta sem nudez explícita". Com a foto nítida, a capa de cada
  anúncio aparece para qualquer visitante que passou pelo age gate. Mitigações neste plano: `noimageindex` na rota, e o guia
  da equipe manda conferir a **capa** antes de aprovar como "foto que todo mundo vê". Avisar o cliente do risco de
  indexação/SafeSearch e perguntar se a capa pública deve ser "sem nudez explícita" (regra de moderação).

### B. Anúncio sem conta (pedido 1)

- **S-01 Formulário aberto** em `/classisex/anunciar`, com **os mesmos campos** do anúncio de assinante (apelido, Eu sou,
  cidade, texto, WhatsApp/Telegram, declaração) — os campos saem de um componente compartilhado `AdFormFields` usado pelo
  `AdForm` atual e pelo novo `VisitorAdForm`, para não divergir. Extras do visitante: e-mail (obrigatório), "tenho 18 anos
  ou mais", "aceito Termos de Uso e Política de Privacidade" (mesmo texto/links do `/cadastro`), honeypot `website`, e
  **um** campo de foto (opcional; sem `multiple`; JPEG/PNG/WebP; 15 MB como hoje). Sem vídeo.
- **S-02 Mesmas regras de quem paga, menos a mídia**: `validateAdInput` sem `legacy` (600 caracteres, contato obrigatório,
  apelido sem contato, cidade só letras, Eu sou ativo). Anúncios do site antigo eram isentos; **o do visitante não é**.
- **S-03 Limite de mídia no servidor**: o serviço recusa mais de 1 foto e qualquer vídeo antes de criar qualquer coisa; o
  hook do `AdMedia` é a última linha (o dono técnico é conta gratuita → `TIER_LIMITS.gratis` = 1 foto, 0 vídeo). Nada
  vindo do cliente decide limite, dono ou situação. Constante nova `VISITANTE_LIMITS` em `tier.ts` = `{ fotos: 1, videos: 0,
  anunciosAtivos: ACTIVE_LIMIT }`.
- **S-04 Dono técnico** (padrão da Fase 6, `ensureEquipeLegadoAccount`): conta `assinantes` única
  `visitantes@invalid.paraiso.local`, nome "Visitantes (sem conta)", senha aleatória, `_verified: false` (ninguém entra),
  sem período, `origem: 'equipe'`, `staffNotes` explicando. Criada sob demanda por `ensureVisitantesAccount` (com proteção
  contra corrida, igual à do legado). Não reaproveita a conta do legado (as regras de `origemLegado: 'equipe'` — aprovar
  rascunho, trocar dono — não valem aqui).
- **S-05 Marcação e e-mail** no `ads`: `enviadoSemConta` (checkbox, indexado) e `emailVisitante` (texto, máx. 254,
  minúsculo/sem espaços, indexado). Os dois: `access: { create: () => false, update: () => false, read: isStaff }` (só o
  serviço grava via Local API com `overrideAccess`), barra lateral, somente leitura. O e-mail **nunca** entra em DTO
  (público, membro, dono, `ModerationView`), em auditoria nem em log; só a tela do anúncio no painel o mostra à equipe.
  Migração nova gerada com `payload migrate:create`.
- **S-06 Moderação**: todo anúncio sem conta nasce `pendente` e só aparece depois de aprovado (botão Aprovar, aprovar na
  lista e "Aprovar selecionados" já servem). Coluna "Sem conta" na lista (`defaultColumns`), filtro pelo campo, e na caixa
  ClassiSex do painel inicial um link "N sem conta em análise". Na Moderação, "Conta do anunciante" mostra
  "Sem conta (visitante)" com a explicação "1 foto, sem vídeo, não recebe recados; a pessoa não consegue editar nem apagar".
- **S-07 Aviso por e-mail** (o envio existe: `payload.sendEmail` + `emailEnabled()`): ao aprovar, recusar ou despublicar um
  anúncio sem conta, manda um aviso curto para `emailVisitante` (apelido, situação, motivo quando houver, link para
  `/classisex` e para `/cadastro`). Nunca lança erro (falha de e-mail não desfaz a moderação); loga só o id do anúncio.
  **Sem e-mail de recebimento** no envio (evita usar o formulário para mandar e-mail a terceiros).
- **S-08 Anti-abuso**: honeypot preenchido → resposta neutra de sucesso, nada criado; limite em memória
  (`src/lib/email/rate-limit.ts` `allowAttempt`, o mesmo do cadastro) **5 envios/hora por IP** e **5/hora por e-mail**,
  contados quando a validação passa, antes de gravar; IP como em `src/lib/assinantes/actions.ts` (`x-forwarded-for` 1º
  item, senão `x-real-ip`). `Content-Length` acima de `MAX_AD_PHOTO_BYTES + 1 MB` → recusa antes de ler o corpo. A checagem
  de Origin do `src/proxy.ts` já cobre o POST. Limitação conhecida (igual ao cadastro): um container, reinício zera, e o
  `x-forwarded-for` depende do Caddy sobrescrever o cabeçalho.
- **S-09 Limite de 3 ativos por e-mail**: no máximo `ACTIVE_LIMIT` (3) anúncios sem conta `pendente`/`aprovado` com o mesmo
  `emailVisitante` (comparação sem diferença de maiúsculas: gravado sempre minúsculo). Mensagem própria.
- **S-10 Sem editar/apagar**: o visitante não tem sessão; o formulário avisa e oferece "Crie uma conta gratuita para editar e
  apagar seus anúncios" (`/cadastro`). A equipe apaga pelo painel. A troca de anunciante (passar o anúncio para uma conta
  real) continua bloqueada pelo `guardAuthorChange`.
- **S-11 Entradas**: botão "Anunciar" em `/classisex` → `/classisex/anunciar`. Quem já está logado (conta de assinante,
  qualquer plano) e abre `/classisex/anunciar` é redirecionado para `/area-do-assinante/meus-anuncios/novo` (fluxo atual;
  a página pública continua sem ler sessão). Sucesso → `/classisex/anunciar/recebido`: "Recebemos seu anúncio. Ele aparece
  no ClassiSex depois da análise da equipe." As duas páginas: `noindex`.
- **S-12 Quem vê o quê** (sem mudança além de Q-01): anúncio sem conta aprovado aparece no mural aberto e no da conta
  gratuita com texto sem contatos e a capa (agora nítida); assinante ativo vê texto, contatos e a foto. Recados para o
  anúncio: bloqueados pelo servidor (o dono técnico nunca está ativo → mensagem `RECADO_ANUNCIO_GRATUITO`).
- **S-13 Envio único**: o formulário manda **uma** requisição multipart para o route handler
  `POST /classisex/anunciar/enviar` (campos + 0 ou 1 foto). Não é server action (o limite de corpo de server action fica
  como está). Com JavaScript, o `VisitorAdForm` envia por `fetch` com `Accept: application/json` e recebe
  `{ ok: true, redirect }` ou `{ ok: false, errors }` (os valores digitados ficam no formulário). Sem JavaScript, o
  `<form method="post" encType="multipart/form-data">` recebe 303 para a página de sucesso ou para
  `/classisex/anunciar?erro=<codigo>`. Se a foto falhar depois do anúncio criado, o anúncio é apagado e o erro volta.

## A critério do executor

- Textos de ajuda do formulário (curtos, pt-BR, no tom do `AdForm`).
- Nome exato dos códigos de erro, desde que mapeados para mensagens em `rules.ts`/`media-messages.ts`.

## Para confirmar com o cliente (não bloqueia a execução)

- Q-06 (capa nítida na área aberta x "sem nudez explícita").
- S-07: e-mail de aviso na aprovação/recusa — ok? (o e-mail não é confirmado; pode ter erro de digitação).
- Política de Privacidade/Termos: hoje não falam do e-mail de quem anuncia sem conta (uso: avisar moderação, limite de 3,
  apurar abuso; apagado junto com o anúncio). **Só sinalizar** — este plano não mexe nessas páginas.

## Fora deste plano (adiado)

- Link único por e-mail para o visitante editar/apagar o anúncio.
- Passar um anúncio sem conta para uma conta real criada depois.
- Captcha; limite persistente (banco/Redis).
- Apagar os arquivos `-previa.webp` antigos em lote.
