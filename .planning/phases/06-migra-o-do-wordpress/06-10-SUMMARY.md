---
phase: 06-migra-o-do-wordpress
plan: 10
status: complete
completed: 2026-10-23
---

# 06-10 SUMMARY — Importação real, ensaio no staging e conferência da cliente

## Task 1 — Dump real, local (agregados apenas)
- Contas lidas 402; importadas 393 (7 administradores e 2 de teste ignoradas).
- Senhas: 298 formato novo (`$wp$`), 95 phpass (`$P$`).
- Assinaturas: 31 pagantes mantidas; 25 marcadas "assinante antigo sem data de vencimento" (M-02 ajustado); 306 vencidas; 31 sem data.
- Anúncios antigos: 696 (ClassiSex 204, Mural 492, dos quais 414 de visitantes). Referências de foto: 43.
- Segunda execução: tudo em "já importadas/já existiam", zero criados.

## Task 2 — Staging (VPS, rodado pela cliente)
- Correção de runbook: `chown -R 1000:1000 /opt/paraiso-site/importacao` (EACCES; commit 76d5644).
- Contas: já importadas 393 · conflito 0 · erros 0. Assinaturas: mantidos 31.
- Anúncios: publicados 492 (Mural) · promovidos de rascunho 204 (ClassiSex) · da equipe 530.
- Fotos: gravadas 40 · ausentes 0 · recusadas 3 (GIF) · fora da pasta 0.
- Dicas Hot (quick 2026-10-22): 30 dicas via migração `dicas_wp_bundle`; capas: gravadas 15 · ausentes 0 · recusadas 0.
- Pendente de confirmação: `shred -u` do dump no VPS (pedido à cliente).

## Task 3 — Conferência da cliente
- Login com conta e senha antigas: ok (problema anterior era relógio do PC da cliente).
- ClassiSex com anúncios antigos, rolagem contínua, Dicas Hot no menu e com paywall: aprovados ("ok, prossiga", 23/10).
- Perguntas abertas:
  - (a) Dicas Hot → seção nova (M-08), entregue, só assinantes leem tudo.
  - (b)(c)(d) M-09: sem exclusões extras; conta nova confirmada com o mesmo e-mail é unida, não confirmada não.
  - (e) M-04 substituído: anúncios antigos publicados, isentos dos limites novos.

## Decisões fora do plano original
- Anúncios antigos publicados (não rascunhos); autores removidos e visitantes → conta "Equipe (anúncios do site antigo)".
- Mural e ClassiSex unidos no ClassiSex.
