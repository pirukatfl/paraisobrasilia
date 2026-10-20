# 04-10 Summary — Guia, deploy e conferência do cliente

- Task 1: guia da equipe (seção ClassiSex), runbook 7.3, smoke de staging, bootstrap idempotente com reload do Caddy (eede467).
- Deploy: 80cd211 (run 39334762443 success); correção de login sem depender de Sec-Fetch-Site 1ad4546 (success).
- Cliente rodou o bootstrap-vps.sh na VPS (volume private_media) em 2026-10-20.
- Bug "painel desloga sozinho": causa real era o relógio do computador do cliente adiantado (Payload admin expira a sessão pelo relógio do navegador → /admin/logout-inactivity). Também havia senha divergente; senha regravada via SQL. Anotado em GUIA-DA-EQUIPE "Problemas comuns".
- Conferência: cliente confirmou que o ClassiSex abre corretamente no celular (2026-10-20). Fluxo completo de envio de foto + moderação ainda não confirmado explicitamente pelo cliente.
