---
phase: quick-2026-10-23-classisex-sem-conta
plan: 01
subsystem: classisex
tags: [classisex, anuncio-sem-conta, fotos-nitidas, moderacao, email]
metrics: { completed: 2026-10-23 }
---
# Quick 2026-10-23: ClassiSex sem conta + fotos sem desfoque

## O que mudou
- Fotos nítidas: /classisex/previa/{id} serve a miniatura card da capa (fallback: original reencodado), X-Robots-Tag noindex, noimageindex; writePreview e blur.ts removidos; textos "desfocada/desfoque" removidos.
- Anúncio sem conta: /classisex/anunciar (campos do anunciante + e-mail, 18+, termos, honeypot, 1 foto), /recebido, botão Anunciar; POST /classisex/anunciar/enviar; createVisitorAd com regras de quem paga, 1 foto/sem vídeo, 5 envios/h por IP e por e-mail (memória), 3 ativos por e-mail; dono técnico visitantes@invalid.paraiso.local; campos ads.enviadoSemConta/emailVisitante só da equipe; migração 20261023_034454_classisex_sem_conta; coluna e filtro "Enviado sem conta"; aviso por e-mail ao aprovar/recusar/despublicar.

## Commits
1e14a4f fotos nítidas | 2972abb schema/regras/serviço/migração | d796aff moderação/painel/e-mail | d121bf4 formulário/rota | 2458e01 e2e e guia | (orquestrador) specs de menu com Dicas Hot

## Testes
tsc/eslint limpos; vitest 80 arquivos / 786 testes; Playwright classisex-sem-conta 16/16 e specs classisex*, conta-gratuita*, previas, meus-anuncios, anuncio-midia*, moderacao, admin-aprovar-lista, cadastro, painel*, home* verdes.
mensagens.spec:63 e recados-privados.spec:62 esperavam o menu do assinante sem "Dicas Hot" (quick anterior); atualizados pelo orquestrador.

## Desvios
1. dicas-bundle.test.ts: migração do bundle precisa vir depois da de schema das Dicas (não mais "a última").
2. e2e com a chamada antiga atualizados ao texto novo.
3. Staging tem noindex,nofollow global no next.config; produção usa o cabeçalho da rota.

## Para confirmar com o cliente
1. Capa nítida na área aberta x "área aberta sem nudez explícita" — moderação confere a capa.
2. Aviso por e-mail ao visitante na aprovação/recusa.
3. Privacidade/Termos não citam o e-mail de quem anuncia sem conta.
