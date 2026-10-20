# Quick task: conta gratuita — Summary

Executado A1→F2 (F3 = conferência do cliente, junto com 05-12). HEAD 9905781.

- A1: menu de 10 itens cabe em 1 linha (1024/1280 px); modelos.spec atualizado; bookkeeping da Fase 5 (05-01..05-11).
- B1/B2: `src/lib/assinantes/tier.ts` (tierOf, TIER_LIMITS, coverOf, linhas do comparativo); anúncio de autor gratuito/vencido fica no ar só com a capa; rotas de mídia/prévia servem só a capa; sem "Enviar mensagem" em anúncio gratuito; corrigido limite `ids.length*6` nas consultas de mídia.
- C1: limites por plano (grátis 1 foto/0 vídeo; assinante 10/2; 3 anúncios ativos) no hook, rota de upload, actions e pickers.
- D1/D2: cadastro aberto com `auth.verify`, campos origem/declaracao18Em/termosAceitosEm, rate limit em memória (5/h IP, 3/h e-mail), honeypot, limpeza de não confirmados após 7 dias; /cadastro, /cadastro/confirmar, reenvio; cadastro fechado sem SMTP.
- E1/E2: páginas da área por plano, mídias "Guardada", comparativo Grátis × Assinante (inclui "Contos completos"); /assine-ja com comparativo e 4 passos; colunas Conta/Origem/E-mail confirmado no painel; endpoint staff "email-confirmado" auditado; Moderação mostra o plano do anunciante.
- F1: leak matrix `conta-gratuita-seguranca.spec.ts` (13 testes); specs da regra antiga reescritos para G-05.
- F2: guia "Contas gratuitas" (com rascunho [VALIDAR] para Termos/Política), STAGING 7.5, CONTA-01..04, CONTEXT/PROJECT/STATE.

Migração: `20261020_172550_conta_gratuita` (marca contas existentes como verificadas).
Gate: typecheck/lint ok; Vitest 539; Playwright 391 passed / 63 skipped / 0 failed; build sem env ok.
Desvios: limite de consulta de mídia, menu nowrap, resendVerification com Date.now, de-flake de 2 checks de salvar no admin, endpoint email-confirmado.
