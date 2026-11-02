---
type: quick
slug: promocao-participar
date: 2026-11-02
executor: sonnet
status: P1 e P2 completos, mais correção do slide do espaço
---

# Resumo: promoção como modal com "Participar" (pedido do cliente 2026-11-02)

## O que mudou

- **P1. Modal: ler, fechar ou participar**: o pop-up tem só **Participar** e **Fechar** (além do X). Saem "Enviar contos" / "Enviar fotos e vídeos" e os links automáticos dentro do modal (continuam no quadro "Quem somos" da home). Global `promocao` ganhou `participarAtivo` (padrão ligado) e `botaoParticipar`. Participar leva a `/enviar-fotos-e-videos?promocao=1`. Migração `promocao_participar`.
- **P2. Formulário da promoção**: com `?promocao=1` e promoção no ar, a página mostra "Participando da promoção: {título}", o campo "Festa / data que pretende ir" (opcional, até 80) e recebido próprio. Sem promoção ativa, o parâmetro é ignorado. `envios-midia` ganhou `promocao` (título lido do global no servidor, só leitura, indexado) e `dataFesta`; coluna e filtro "Promoção" no painel. Migração `promocao_formulario`.
- **Slide do espaço** (pedido do cliente: "às vezes ficam duas fotos piscando juntas"): o `ResizeObserver` do `SpaceCarousel` era recriado a cada troca de foto e seu scroll instantâneo cortava a rolagem suave no meio. Agora é criado uma vez e só realinha quando a largura muda.

## Desvios

- `promocao_participar` junta dois passos gerados (coluna nova e remoção de `promocao_botao_contos`/`promocao_botao_midia`). Esses dois textos saíram; edições neles se perdem.
- `?promocao=1` segue para o recebido só para escolher o texto (a página confere o global de novo).

## Resultados do gate

- typecheck limpo; lint 0 erros (1 aviso antigo); unit 566 ok; int 45 / 452 ok; build ok; `migrate:create` de conferência sem mudanças.
- e2e (mobile e desktop) de promocao, enviar-midia, home, home-sem-festas, home-quadros, home-espaco-carrossel, age-gate e textos: todos passaram. Suíte completa não repetida.

## Para a equipe do cliente

- Configurações → Promoção: mostrar ou não o botão Participar e editar o texto dele.
- Envios do público → Fotos e vídeos enviados: coluna e filtro "Promoção".
- Deploy: rodar `migrate`.
