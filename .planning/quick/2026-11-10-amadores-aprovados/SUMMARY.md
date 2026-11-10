---
type: quick
slug: amadores-aprovados
date: 2026-11-10
status: completo
---

# Resumo: fotos e vídeos aprovados dos envios do público vão para o site

## O que foi feito
- **Regra de publicação**: um arquivo está publicado quando o envio está `aprovado` e o arquivo não está marcado "Não mostrar no site" (`oculto`). Recusar, voltar para Novo ou apagar o envio tira tudo do site na hora.
- **Painel**: `Arquivos enviados` ganhou o campo "Não mostrar no site"; os textos de `Fotos e vídeos enviados` agora dizem que aprovar publica. Os dois lados expiram a tag `amadores` ao salvar/apagar.
- **Fotos**: seção "Fotos dos frequentadores" no fim de `/modelos?tipo=amadoras` (Gallery existente, sem o otimizador do Next: `plainImages`), com link "Envie as suas fotos". O estado vazio da página só aparece sem modelos e sem fotos. A Galeria inteira e Profissionais não mostram a seção.
- **Vídeos**: página `/videos-amadores` (cartões escuros com play, apelido e duração; sem pôster). Assinante ativo ou equipe abre o player; qualquer outra pessoa vê o convite ("Só assinantes dão o play", Assine já e, se não estiver logada, Entrar com `next=/videos-amadores`). Estado vazio com botão para enviar.
- **Menu**: Galeria → Vídeos amadores (menu público, menu do assinante, "Menu do site" → itens escondidos, sitemap).
- **Rotas de arquivo**: `GET /amadores/foto/{id}/{miniatura|foto}` (público, só publicado, senão 404) e `GET /videos-amadores/{id}/video` (404 se não publicado; 403 sem equipe/assinatura ativa; Range/206). A rota do Payload (`/api/envios-midia-arquivos/file/...`) continua só equipe.
- **Migração**: `20261110_120000_amadores_aprovados` (coluna `oculto`, valor do enum do menu, textos novos), escrita à mão: o `migrate:create` pergunta sobre renomeações por causa dos snapshots antigos. O schema resultante foi conferido contra o gerado pelo código (mesmas colunas e enum).

## Testes
- Unit: publicação, duração, `safeNext`, menu, sitemap. Int: `amadores-aprovados.int.test.ts` (só aprovado e não oculto, contato nunca no DTO). E2E: `amadores-aprovados.spec.ts` (404/403/200/206, convite, player, oculto, recusar, menu).

## O que a equipe precisa saber
- Aprovar um envio agora publica todas as fotos e vídeos dele. Para esconder só um arquivo, marque "Não mostrar no site" no arquivo.
- Fotos despublicadas podem ficar até 5 minutos no navegador de quem já abriu a página.
- O texto da página "Enviar fotos e vídeos" ainda diz que nada vai para o site sozinho; continua verdadeiro (depende da aprovação), mas vale revisar.
