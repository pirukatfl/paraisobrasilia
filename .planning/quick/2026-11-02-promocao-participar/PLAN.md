---
type: quick
slug: promocao-participar
date: 2026-11-02
planner: opus
executor: sonnet
---

# Plano: promoção como modal com "Participar" (pedido do cliente 2026-11-02)

Pedido: "a promoção deve aparecer como um modal para quem entrar ler e fechar, e quem quiser participar da promoção, deve clicar em participar e ir para um formulário para informar os dados relevantes, fotos e vídeos".

Base: o pop-up `promocao` (item G de `2026-11-01-novo-planejamento`) e a página `/enviar-fotos-e-videos` (item I). Branch `claude/project-thread-gbqc9y`, a partir de `main` depois do merge do PR #29.

## P1. Modal: ler, fechar ou participar
- `PromocaoDialog`: título, imagem opcional e texto; no rodapé só dois botões: **Participar** (principal) e **Fechar** (secundário), além do X. Sai a dupla "Enviar contos / Enviar fotos e vídeos" e saem os links automáticos dentro do texto do modal (continuam no quadro "Quem somos" da home).
- Global `promocao`: novo `participarAtivo` (checkbox, padrão true; desmarcado = modal só informativo, só com Fechar) e `botaoParticipar` (texto, padrão "Participar"). Resto igual: só na home, depois do 18+, uma vez por sessão, Esc/fundo/X fecham, foco preso e devolvido.
- Participar leva a `/enviar-fotos-e-videos?promocao=1`.

## P2. Formulário da promoção (reaproveita Enviar fotos e vídeos)
- Com `?promocao=1` e promoção ativa e no período: a página mostra no topo "Participando da promoção: {título}" e o formulário ganha `dataFesta` (opcional, "Festa / data que pretende ir"). Mantém apelido, contato, mensagem, fotos e vídeos, 18+ e autorização de imagem. Sem promoção ativa, `?promocao=1` é ignorado.
- `envios-midia` ganha `promocao` (título da promoção no momento do envio, lido do global NO SERVIDOR, nunca do formulário; só leitura no painel) e `dataFesta`; coluna e filtro "Promoção" na lista do painel.
- Recebido com mensagem própria para participação (texto editável). Textos novos na área `enviarMidia`.
- Migração; testes unit/int (promoção inativa ignora `promocao=1`; título vem do servidor; anônimo continua sem ler nada) e e2e (modal com Participar/Fechar → formulário com quadro → envio → marcado no painel; Participar some quando desligado). Guia da equipe atualizado.
