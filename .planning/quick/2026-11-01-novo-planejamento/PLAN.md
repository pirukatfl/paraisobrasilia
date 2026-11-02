---
type: quick
slug: novo-planejamento
date: 2026-11-01
planner: opus
executor: sonnet
---

# Plano: ajustes do "novo planejamento" do cliente (2026-11-01)

Branch única: `claude/project-thread-gbqc9y` (um commit por item). Migração do site NÃO faz parte deste trabalho.
Textos novos visíveis no site entram nas áreas de `src/lib/textos/areas/*` (editáveis no painel, padrão = texto original), como o resto do site.
Cada mudança de schema Payload gera migração em `src/migrations` com `pnpm payload migrate:create <nome>` (Postgres 16 local: `service postgresql start`; ver `.env.test.example`, banco `paraiso_test`). Depois `pnpm generate:types` e `pnpm generate:importmap` se houver componente de admin novo.
Gate por lote: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:int`, `pnpm build`, e as specs e2e tocadas (as 9 falhas pré-existentes listadas em `2026-10-28-todos-textos-formatados/SUMMARY.md` não contam).

## Lote 1 — menu, rodapé, festa, contos

### A. Horário de término na página da festa
`src/app/(frontend)/festas/[slug]/page.tsx`: mostrar "Das 22h às 5h" (início e término) no lugar de só o início. Novo texto em `festas` (ex.: `horarioComTermino`, padrão `Das {inicio} às {fim}`). Mostrar o término quando `endsAt` existe e NÃO é o término automático (`defaultEndsAt(startsAt)` de `src/lib/parties/visibility.ts`, ou seja a equipe não preencheu); nesse caso fica só o início como hoje. Teste unitário da regra.

### B. Rodapé em colunas
`src/components/Footer.tsx`: a lista "Navegue" (13 links empilhados) vira 2 colunas no celular e 3 no desktop (grid), com o bloco Navegue ocupando mais largura que Contato/Legal no desktop. Respeita os itens ocultos (item D).

### C. Galeria com submenus Profissional / Amadora
- `Models`: novo campo `categoria` (select obrigatório: `profissional` "Profissional", `amadora` "Amadora"; padrão `profissional`; coluna na lista do painel e filtro). Migração define `profissional` para os existentes.
- `/modelos?tipo=profissionais|amadoras` filtra (sem `tipo` = todas). Título da página muda conforme o filtro (textos novos em `modelos`). Revalidação/cache: incluir a categoria na chave.
- Menu: item "Galeria" (novo texto `menuGaleria`, padrão "Galeria"; o texto antigo `menuModelos` continua para não quebrar) com filhos "Profissionais" e "Amadoras" (textos novos). Igual no menu de assinante.
- Desktop `Nav.tsx` hoje ignora `children`: criar dropdown acessível (abre em hover e foco/teclado, `aria-expanded` no botão de abrir, Esc fecha), sem quebrar o item pai como link. Vale para Quem somos (Normas, Regras, Dicas) também. Mobile já mostra filhos.
- Atualizar `tests/e2e/modelos.spec.ts` / `menu-logado.spec.ts` que fixam a ordem do menu.

### D. Ocultar itens de menu pelo painel + link externo só para assinantes
- Novo global `menu-do-site` ("Menu do site", grupo do painel junto de Contato), acesso de leitura pública, edição só equipe, `afterChange` expira tag `menu`.
  - `itensOcultos`: select `hasMany` com as chaves de todos os itens e subitens (festas/início, quem-somos, normas, regras, dicas, espaco, galeria, galeria-profissionais, galeria-amadoras, classisex, contos, dicas-hot, contato, assine-ja, area-do-assinante, e os do menu de assinante: meus-anuncios, minha-assinatura, trocar-senha, link-externo). Rótulos em pt-BR claros. Descrição: "Itens marcados somem do menu do topo, do menu do celular e do rodapé. A página continua existindo."
  - `linkExterno` (grupo): `ativo` (checkbox, padrão true), `rotulo` (text, padrão "Vídeos pornô grátis"), `url` (text, padrão `https://www.redtube.com.br/`, validar http/https).
- `NavItem` ganha `key` e `external?: boolean`. `getNavItems/getMemberNavItems` recebem a config e filtram ocultos (pai oculto some com filhos). Link externo SÓ em `getMemberNavItems` (logado), por último antes de Sair, abre em nova aba com `rel="noopener noreferrer nofollow"` e `target="_blank"`; nunca no menu público nem no rodapé público, nem no sitemap.
- Leitura com `cached` + tag `menu`, falha suave (sem banco → nada oculto, sem link externo).
- Testes: unit para o filtro; int para o global (anônimo lê, anônimo não grava); e2e: link externo aparece logado e não aparece deslogado.

### H. Contos sem foto
Remover a imagem do card da lista (`ContoCard.tsx`) e da página do conto (aberta e de assinante). Não apagar o campo nem as imagens no banco (reversível). Ajustar specs que esperam a imagem.

## Lote 2 — página inicial

### E. "Conheça o espaço" em slide
`SpaceTeaser`: trocar a grade de 6 fotos por um carrossel leve (componente cliente): uma foto grande por vez (2 no desktop se ficar melhor), troca automática a cada ~5 s, setas anterior/próxima e pontinhos, para em hover/foco/aba oculta, respeita `prefers-reduced-motion` (sem autoplay), swipe via scroll-snap. Sem biblioteca nova. Só a primeira imagem sem lazy. Até 8 fotos.

### F. Linha com 3 quadros: ClassiSex · Contos · Dicas Hot
Substituir `DicasTeaser` por uma seção de 3 cartões lado a lado no desktop (empilhados no celular): ClassiSex (chamada + botão para `/classisex`), Contos (2-3 títulos mais recentes + botão `/contos`) e Dicas Hot (2-3 títulos + botão `/dicas-hot`). Cada cartão falha suave e some se o item estiver oculto no menu (D). Textos novos em `inicio`. ClassiSex é o primeiro quadro (cliente acha mais importante).

### G. Promoção em pop-up, editável e ocultável
- Novo global `promocao` ("Promoção", mesmo grupo do D): `ativa` (checkbox), `titulo`, `texto` (editor bloco de `src/lib/textos/editor.ts`), `inicio`/`fim` opcionais (some sozinha fora do período), `imagem` opcional (upload media). Tag `promocao`.
- Pop-up na página inicial: aparece depois que a confirmação 18+ foi dada (nunca em cima do aviso de idade), uma vez por sessão (sessionStorage com id+updatedAt, em try/catch), fecha no X, no fundo e no Esc, foco preso e devolvido. Sem JS: não aparece.
- No texto da promoção as palavras "contos" viram link para `/contos/enviar` e "fotos e vídeos" (também "fotos e videos") para a página de envio de fotos e vídeos (URL única numa constante; até a decisão do cliente, `/contato`), com destaque (cor de destaque, negrito, sublinhado). Também dois botões no fim: "Enviar contos" e "Enviar fotos e vídeos". Mesma regra de links no texto de abertura do teaser "Quem somos / Conheça a casa" da home.
- Guia do painel (`docs/`) atualizado: como ligar/desligar a promoção e ocultar menus.

## Lote 3 — Enviar fotos e vídeos (decisão do cliente 2026-11-01: envio de arquivos pelo site)

### I. Página `/enviar-fotos-e-videos`
- Formulário aberto (sem cadastro), no mesmo padrão de `/contos/enviar` (`src/app/(frontend)/contos/enviar/*`, `src/lib/contos/envio*.ts`, `ContoEnvioForm`) e do envio de fotos do anúncio de visitante (`VisitorPhotoPicker`, `src/lib/classisex/visitante.ts`, `storage.ts`, `mp4.ts`, `media-messages.ts`): apelido, contato (e-mail ou WhatsApp, só a equipe vê), mensagem opcional, até 10 fotos (JPG/PNG/WebP) e até 2 vídeos (MP4/MOV) com os mesmos limites de tamanho já usados no site, checkbox obrigatório de 18+ e autorização de uso de imagem (texto editável, registra `consentAt`), honeypot e limite por IP como nos outros envios.
- Nova coleção privada `envios-midia` ("Fotos e vídeos enviados"): nada é público; leitura e edição só equipe; arquivos em armazenamento privado (mesma estratégia de mídia privada do ClassiSex, nunca pasta pública); status `novo` / `aprovado` / `recusado` e observação da equipe. Aprovar NÃO publica nada sozinho: a equipe usa os arquivos para montar a galeria (o painel mostra prévias pela rota autenticada e botão de baixar). Aviso por e-mail à equipe como no conto enviado, se esse padrão existir.
- Página de "recebido" depois do envio. Textos novos em área própria (`enviarMidia`). Página `noindex`? Não: é página aberta sem nudez; indexável, entra no sitemap.
- Constante única do link (usada pela promoção e pelo teaser "Conheça a casa") passa a apontar para `/enviar-fotos-e-videos`.
- Testes: int (anônimo não lê a coleção nem os arquivos; validação de tipos/tamanho), e2e (envio feliz com 1 foto, recusa sem autorização).

## Lote 4 — formatação das páginas institucionais e filtros do ClassiSex (cliente disse "prossiga" sem detalhar; leitura mais provável)

### J. Formatação igual em Quem somos, Normas, Regras e Dicas
Leitura: no painel a formatação dessas páginas não aparece no site como nos outros textos.
- `Pages.body`: mesmo conjunto de marcas dos Textos do site (somar `UnderlineFeature`, `StrikethroughFeature`) mantendo H2/H3, listas e links. Conferir que `.rich-text` no `globals.css` estiliza `u`, `s`, `em`, `strong`, quebras de linha (`linebreak`) e parágrafos vazios iguais ao `.texto-rico`, e que o `RichText` renderiza todos os nós que o editor cria (incluindo formato de alinhamento/indent se vier de texto colado: ignorar com segurança, sem quebrar).
- `Pages.intro`: vira richText com `editorLinha` (negrito, itálico, sublinhado, riscado), renderizado com `<TextoRico linha>` no topo da página e no teaser da home (mantendo a regra de links de `src/lib/site/links.ts` do item G), e `textoPuro(...)` em meta description/OG/JSON-LD. Migração varchar→jsonb no mesmo padrão de `20261028_224917_todos_textos_formatados` (coluna temporária, cópia congelada de `textoParaRico`, vazio → NULL, `down` simétrico), incluindo a tabela de versões se existir. Manter limite de ~200 caracteres validando o texto puro.
- Teste e2e: negrito/sublinhado na intro e no corpo de Regras e Quem somos aparecem no site; unit/int da conversão.

### K. Filtros do ClassiSex
- Novo campo opcional `idade` (number, 18–99) no anúncio: no formulário do assinante (novo e editar), no anúncio de visitante sem conta e no painel. Anúncios antigos ficam sem idade.
- Área do assinante: filtro "Idade" por faixa (18–29, 30–39, 40–49, 50+; "Todas") junto de "Eu sou" e "Cidade"; anúncio sem idade só aparece em "Todas". Idade mostrada no card e na página do anúncio para assinante.
- Área aberta continua só com "Eu sou" (decisão D-04: a área aberta não mostra cidade, idade, texto nem contato). Não mudar.
- Textos novos nas áreas de textos; migração; testes unit (faixas), int (filtro) e e2e (filtro no assinante; área aberta sem filtro de idade/cidade e sem idade no HTML).
