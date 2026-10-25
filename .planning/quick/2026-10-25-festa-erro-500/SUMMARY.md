# Quick: página da festa dava Internal Server Error

**Causa:** `/festas/[slug]` era a única página pública em ISR (`revalidate = 600`). Desde o menu
logado e a tarja de renovação, o layout raiz lê a sessão (cookies/headers) em toda página. No
build de produção isso gera `Page changed from static to dynamic at runtime ... reason: headers`
e a página responde 500. No `next dev` (usado pelos e2e) o erro não aparece.

**Correção:** a página passa a `dynamic = 'force-dynamic'`, como todas as outras. Os dados da
festa continuam no cache de dados do Next (tag `party:{slug}`).

**Verificação:** build de produção + `next start` com uma festa semeada: antes 500, depois 200;
slug inexistente segue em 404.
