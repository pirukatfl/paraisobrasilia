---
type: quick
slug: amadoras-juntas
date: 2026-11-11
status: completo
---

# Resumo: fotos aprovadas junto das Amadoras, vídeos só "amadores", play só para assinante

## O que foi feito
- **Fotos**: a seção "Fotos dos frequentadores" saiu. Cada envio aprovado com ao menos uma foto publicada vira um cartão na mesma grade das amadoras (capa = primeira foto, nome = apelido, "N fotos"), depois das modelos, do mais novo para o mais antigo. Aparece em Amadoras e na Galeria inteira; Profissionais não.
- **Página `/amadoras/{id}`**: apelido, contagem e as fotos no mesmo Gallery/Lightbox ("Fotos de {apelido}"). 404 se o envio não existe, não está aprovado ou não tem foto publicada. Entra no sitemap. Nunca mostra contato, mensagem ou observação.
- **Vídeos**: o cartão diz só "Vídeo amador" e a duração; o diálogo se chama "Vídeo amador". Sem apelido e sem a palavra "frequentador" em nenhum texto novo.
- **Play só para assinante ativo**: a equipe logada no painel também recebe 403 na rota do vídeo e vê o convite (com "Entrar"). A equipe continua vendo e baixando os arquivos em Fotos e vídeos enviados.
- **Migração** `20261111_120000_amadoras_juntas`, escrita à mão: novos textos padrão de `videos_intro` e `videos_vazio_texto` (só trocam o valor que ainda é o padrão antigo, nunca um texto editado pela equipe) e remoção das três colunas `fotos_frequentadores_*`. O down reverte.

## Testes
- Up e down rodados num banco no schema anterior (linha com padrão antigo trocada, linha editada preservada, down restaura); schema final idêntico ao gerado pelo código.
- Unit: sitemap com `/amadoras/{id}`. Int: agrupamento por envio, envio sem foto publicada não vira cartão, contato nunca no DTO. E2E: `amadores-aprovados.spec.ts` (cartão na grade, página, 404, oculto, recusado, 403 para visitante, conta gratuita e sessão só de equipe, 200/206 para assinante).

## O que a equipe precisa saber
- As fotos aprovadas aparecem como um cartão por envio, no meio das amadoras.
- Quem está logado só no painel não assiste aos vídeos; para testar, use uma conta de assinante ativo.
- Se a equipe já tinha editado o texto de abertura ou o texto vazio de Vídeos amadores, o texto dela fica; só o padrão antigo foi trocado.
