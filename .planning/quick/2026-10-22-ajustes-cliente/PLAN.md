# Quick: ajustes do retorno da cliente (2026-10-22)

## Pedidos (retorno da cliente)
1. Home: efeito slide nas festas, como no site antigo.
2. Fotos das outras festas (grade) pequenas: aumentar.
3. ClassiSex: mostrar o recado na integra, restringindo so os meios de contato; fotos desfocadas continuam.
4. Admin dos anuncios: aprovar cada um logo na lista, ou em massa.

## Tarefas (um commit por item)
1. `PartyCarousel` (client, CSS scroll-snap, sem dependencia): todas as festas futuras, flyer inteiro (`FlyerFrame`, minRatio 0,
   max 80vh), auto-avanco 6 s, setas, pontos, swipe, pausa em hover/foco/toque e por botao, sem autoplay com
   `prefers-reduced-motion`, `aria-roledescription` carousel/slide, rotulos em portugues; sem controles com 1 festa.
   Helpers puros em `lib/parties/carousel.ts`. `PartyFeatured` sai. Testes: unit + `home-carrossel.spec.ts`.
2. Grade das demais festas: 2 por linha (tablet e desktop), 1 no mobile, `sizes` maior, minimo 3:4 mantido (`PartyCard`).
   `/festas` nao tem listagem propria (so `[slug]`), entao so a home usa o card.
3. ClassiSex sem assinatura: `PublicAdDTO` ganha cidade e texto, ambos passando por `redactContacts` no servidor
   (telefone, e-mail, link, @, WhatsApp/Telegram nunca saem); foto so desfocada, sem video; CTA "Assine para ver o contato e as
   fotos". Conta gratuita logada passa a ver o mesmo quadro publico dos anuncios dos outros em
   `/area-do-assinante/classisex` (continua sem contatos, midia original, recados, detalhe). `tier.ts` (TIER_COMPARISON e
   textos "o que voce ganha assinando") ajustado. Testes de vazamento (fase5-seguranca, previas, conta-gratuita-seguranca,
   classisex-publico) estendidos: texto redigido aparece; telefone/e-mail/@/link/WhatsApp plantados nunca aparecem em HTML,
   RSC nem REST.
4. Admin: botao "Aprovar" por linha (pendentes e rascunhos `origemLegado=equipe`) e "Aprovar selecionados" na lista de
   Anuncios (componentes custom do Payload) sobre endpoint so da equipe que reusa a logica de `aprovar` do `service.ts`
   (regras de moderacao, auditoria, validacao de contato/600 caracteres). Falhas voltam com contagem e motivo e o anuncio
   continua pendente. Origin guard e autenticacao inalterados.
5. Docs: GUIA-DA-EQUIPE (aprovar na lista e em massa), copia do TIER.

## Verificacao
typecheck, lint, Vitest completo, Playwright completo, `pnpm build`.
