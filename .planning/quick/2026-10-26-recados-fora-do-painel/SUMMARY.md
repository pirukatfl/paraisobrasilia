# Resumo: Recados sai do painel administrativo

Pedido do cliente (2026-10-26): como Recados saiu do menu do site, a área também sai do painel.

- `AreaTextos` ganha `ocultaNoPainel`; `criarGlobalDeTextos` vira `admin.hidden`. A área `mensagens` ("Recados" em Textos do site) fica oculta. Sem migração: os textos guardados continuam valendo e a caixa em `/area-do-assinante/mensagens` segue igual.
- As coleções de recados (mural antigo, conversas, mensagens, denúncias) já estavam ocultas desde 24/10.
- Guia da equipe: linha Recados tirada da tabela de Textos do site, com nota; item "Número de novos" (desatualizado) trocado por "Menu".
- Teste: `tests/unit/textos.test.ts` confere que a área Recados está oculta e as demais não.

Resultados: typecheck limpo; lint sem erros; vitest textos + deploy-files 58 ok.
