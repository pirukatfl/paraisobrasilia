# Quick: anuncios antigos da equipe como rascunhos so para a equipe

## Problema
Na importacao real em staging: "Anuncios: rascunhos criados 108 · autor nao importado 96". 94 anuncios do ClassiSex antigo
foram escritos por contas administradoras do WordPress (equipe postando pelo cliente, 4 contas) e 2 por usuarios apagados;
o importador os descartava. Decisao da cliente (2026-10-21): traze-los como rascunhos visiveis SO para a equipe, que decide um a um.

## Decisoes
- Dona unica: conta tecnica Assinante "Equipe (anuncios do site antigo)", e-mail fixo `equipe-legado@invalid.paraiso.local`
  (dominio reservado, nao roteavel; e o marcador estavel, sem campo novo em `assinantes`), origem `site-antigo`.
  Sem login: senha aleatoria desconhecida e e-mail NAO confirmado (`_verified: false`, que barra login e sessao JWT).
  Sem periodo/assinatura, sem aviso "revisar" (ninguem entra). Criada de forma idempotente na primeira vez que faz falta.
- Marcador no anuncio: novo campo `ads.origemLegado` (select, unico valor `equipe`), somente servidor (importador), filtravel
  no admin. Migracao `anuncios_equipe` gerada com `payload migrate:create`.
- Trocar o dono: `ads.author` deixa de ser somente leitura; hook `beforeValidate` so permite a troca quando o anuncio e
  `origemLegado = equipe`; ao trocar, o marcador sai (vira rascunho comum do membro, que o ve em Meus anuncios e envia).
- Publicar: `aprovar` passa a valer tambem para rascunho com `origemLegado = equipe` (ninguem mais poderia enviar);
  regras normais de contato/texto continuam valendo. Rascunho de autor real continua intocavel pela equipe.
- Visitantes (`user_id 0`) continuam fora (contados em "visitantes" do relatorio): nao tem autor, e o numero esperado
  na staging (96 = 94 admins + 2 apagados) nao os inclui.
- Relatorio: "autor nao importado N" vira "da equipe (rascunho para revisar) N" = rascunhos da equipe CRIADOS na rodada;
  os ja existentes entram em "ja existiam". Saida continua so com numeros.

## Tarefas
1. `Ads.ts`: campo `origemLegado`, guarda de troca de dono; migracao; tipos.
2. `load.ts`: `ensureEquipeLegadoAccount`, `importLegacyAds` (autor ausente -> conta tecnica; `daEquipe`; fotos como nos demais),
   `formatLoadLines`.
3. `service.ts` + `ModeracaoPanel.tsx`: aprovar rascunho da equipe; `FilaClassisex.tsx`: link "N anuncios antigos da equipe para revisar".
4. Docs: GUIA-DA-EQUIPE (paragrafo), STAGING 7.6 (nota e resultado esperado da nova rodada).
5. Testes: `tests/int/anuncios-equipe.int.test.ts` (rascunho da conta tecnica, sem login, invisivel, idempotencia, aprovar,
   reatribuir, apagar, REST nao forja a marca); ajuste de migracao-load e migracao-cli.

## Verificacao
typecheck, lint, Vitest completo, Playwright (anuncios-site-antigo, moderacao, meus-anuncios, classisex-*).
