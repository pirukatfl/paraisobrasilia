# Quick: qualquer pessoa envia conto (com imagem opcional), lista mostra a imagem

Pedido do cliente (2026-10-24): em /contos qualquer pessoa pode cadastrar um conto, o conto pode ter
uma imagem, a imagem aparece na lista de /contos, e o conto completo só é visível para assinantes.

## Decisões

- **Moderação.** O envio aberto cria o conto como **rascunho** (`_status: 'draft'`). Só aparece no site
  quando a equipe publica no painel. A área aberta não pode ter nudez explícita nem contatos (CLAUDE.md),
  e o envio é anônimo: publicar sem olhar não é opção. Mesmo padrão do anúncio sem conta (sempre 'pendente').
- **Paywall inalterado.** `/contos` e `/contos/[slug]` seguem mostrando só o trecho aberto (`splitConto`);
  o texto completo continua só em `/area-do-assinante/contos/[slug]` com `requireActiveSubscription`.
  Não mexer nessa regra; apenas cobrir com teste que um conto enviado e publicado obedece a ela.
- **Imagem.** Novo campo `imagem` (upload → `media`, opcional) em Contos, igual à `capa` de Dicas.
  Card da lista (`ContoCard`, usado em /contos e na área do assinante) mostra a imagem (tamanho `card`,
  fallback original) no topo, mesmo visual do `DicaCard`. A página do conto (aberta e de assinante)
  também mostra a imagem acima do texto. DTOs ganham `imagem: { url, width, height, alt } | null`;
  reads passam a popular `imagem` (depth 1 ou populate só desse campo). Imagem só vai para o DTO se o
  doc de mídia tiver url.
- **Mídia pendente não vaza.** `media` é leitura pública. Um envio aberto grava a foto com um novo
  campo `pendente: true` em Media (checkbox, sidebar, readOnly para a equipe, descrição em pt).
  `Media.access.read` passa a ser: equipe vê tudo; demais `{ pendente: { not_equals: true } }`
  (vale também para o arquivo em /api/media/file/… — conferir com teste anônimo). Quando o conto é
  publicado (afterChange com `_status === 'published'`), um hook limpa `pendente` da imagem.
  Se a equipe trocar a imagem no painel, a nova já nasce sem `pendente` (default false).
  Texto alternativo: o `alt` obrigatório da mídia recebe "Imagem do conto <título>".
- **Formulário aberto.** Página `/contos/enviar` (link "Enviar um conto" em /contos, perto do topo),
  rota `POST /contos/enviar/route.ts` (multipart, sem server action, sem sessão), página
  `/contos/enviado`. Copiar o padrão de `/classisex/anunciar` (`route.ts`, `VisitorAdForm`,
  `visitante.ts`): JSON com JS / 303 sem JS, honeypot `website`, limite de Content-Length,
  rate limit `allowAttempt` 5/h por IP (e por e-mail se houver), CSRF já coberto pelo proxy,
  nunca logar e-mail nem texto.
  Campos: título (obrigatório, até 160), "Assinado como" apelido (opcional, até 60), texto
  (textarea obrigatório, 300 a 30.000 caracteres; parágrafos separados por linha em branco viram
  parágrafos Lexical; sem HTML), imagem (opcional, 1 foto JPG/PNG/WebP até 15 MB), e-mail
  (opcional, só a equipe vê), caixa obrigatória "Tenho 18 anos ou mais, o conto é de minha autoria,
  e a imagem (se houver) é minha ou tenho autorização, sem nudez explícita e sem contatos",
  caixa obrigatória de Termos/Privacidade. Recusar texto com contatos óbvios (telefone/WhatsApp,
  e-mail, @) reaproveitando a regra existente de contato do ClassiSex se houver; se não houver, só
  avisar no formulário que contatos são removidos e deixar para a moderação.
  Mensagem de sucesso: "Recebemos seu conto. Ele aparece no site depois que a equipe aprovar."
- **Campos novos em Contos (sidebar, readOnly):** `enviadoPorVisitante` (checkbox),
  `assinadoComo` (texto, aparece no card e na página como "por <apelido>" quando publicado),
  `emailVisitante` (field access: só equipe lê; nunca em DTO/log), `enviadoEm` (data).
  Coluna/descrição no painel: "Enviado pelo formulário aberto: confira texto e imagem antes de publicar."
  O `prepare` atual já gera slug; envio usa `slugify(title)` + sufixo curto aleatório se colidir.
  `publishedAt` = data do envio; `paragrafosAbertos` = default.
- **Migração.** Nova migration em `src/migrations` (contos + `_contos_v` + media), registrada em
  `index.ts`; `payload-types.ts` regenerado.

## Passos

1. Collections (Contos, Media) + migration + types.
2. DTO/reads/ContoCard/páginas com imagem.
3. Serviço `src/lib/contos/envio.ts` + rota + página/form + página de recebido + link em /contos.
4. Hook de publicação limpa `pendente`; acesso de leitura de Media.
5. Testes: unit (DTO com imagem; texto → Lexical; validação), int (envio cria rascunho, honeypot,
   rate limit, mídia pendente invisível anônima e visível após publicar), e2e `contos-envio.spec.ts`
   (envio com e sem imagem, aparece só após publicar, imagem na lista, visitante vê só trecho,
   assinante vê completo). Rodar typecheck, lint, unit, int e e2e de contos/dicas/classisex-sem-conta.
