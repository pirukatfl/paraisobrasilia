# Confirmação de idade (18+) — briefing para o advogado

Documento para a casa encaminhar ao advogado. Registra os fatos legais conhecidos, o que o site faz hoje e as perguntas que precisam de parecer por escrito antes do lançamento em produção (Fase 7). Requisito: INST-04.

> Este documento **não é parecer jurídico**. Os fatos abaixo vêm de imprensa e artigos e servem só para orientar as perguntas.

## Fatos atuais

- **Lei 15.211/2025 (ECA Digital)** — em vigor desde março de 2026 (17/03/2026, segundo a imprensa). Trata da proteção de crianças e adolescentes em ambientes digitais, incluindo a vedação de acesso a conteúdo impróprio ou proibido para menores e a exigência de mecanismos de aferição de idade.
- **Decreto 12.880/2026** — regulamenta o ECA Digital.
- **ANPD (orientação preliminar)** — segundo o artigo citado abaixo, a autodeclaração isolada (o simples "sou maior de 18") **não basta** para o acesso a conteúdo impróprio ou proibido para menores.
- **SEDIGI** — a Secretaria de Direitos Digitais orientou o setor de conteúdo adulto sobre o ECA Digital e a verificação de idade.

Fontes (acessadas em 2026-10-17; **fonte: imprensa/artigo, não é parecer**):

- Chambers and Partners — "ECA Digital é regulamentado e ANPD publica orientações sobre verificação etária" (2026-06-23): https://chambers.com/articles/eca-digital-é-regulamentado-e-anpd-publica-orientações-sobre-verificação-etária
- Jornal de Brasília — "SEDIGI orienta setor de conteúdo adulto sobre ECA Digital e verificação de idade" (2026-01-07): https://jornaldebrasilia.com.br/noticias/politica-e-poder/sedigi-orienta-setor-de-conteudo-adulto-sobre-eca-digital-e-verificacao-de-idade/

## O que o site faz hoje (staging)

- **Overlay de confirmação 18+ por autodeclaração**: ao entrar, o visitante vê "Tenho 18 anos ou mais — Entrar" ou "Sair" (que leva para fora do site). Não há cadastro.
- **Cookie de 30 dias** lembra a confirmação no mesmo navegador.
- **Área aberta sem nudez e sem contatos**: só flyers e informações das festas; nada de perfis, fotos explícitas ou telefones de membros.
- **Marcação de conteúdo adulto** nas páginas: meta `rating adult` e o selo **RTA** (Restricted To Adults), que permite a filtros parentais bloquearem o site.
- **Módulo trocável**: toda a lógica de idade fica em um único módulo, escolhido pela variável `AGE_GATE_PROVIDER`. Hoje o provedor é `self-declaration` (autodeclaração); outro mecanismo (verificação por terceiro, Gov.br etc.) pode ser plugado sem refazer as páginas.
- O ambiente de staging não é indexado pelo Google e não é divulgado ao público.

## Perguntas ao advogado

1. A área aberta sem nudez, com flyers e divulgação de casa de festas liberais, é "conteúdo impróprio/proibido" para menores sob o ECA Digital e o Decreto 12.880/2026?
2. Se sim, qual mecanismo de aferição etária é aceitável e proporcional (ex.: verificação por terceiro, Gov.br)?
3. Para a área de assinantes (Fase 3+), a conferência presencial de documento pela casa, registrada no cadastro, é suficiente?
4. Quais textos mínimos de Termos de Uso e Política de Privacidade (LGPD, dado sensível sobre vida sexual) são exigidos antes do lançamento?
5. Qual o prazo de guarda de registros de acesso (Marco Civil da Internet, art. 15) e quais dados ele abrange no nosso caso?

## Status

Status: Pendente — ainda não enviado (2026-10-17)

> Atualizar para `Status: Pendente — enviado em {data}` quando a casa encaminhar ao advogado, e depois para `Status: Respondido em {data}: {resumo}`. Guardar o parecer (ou referência a ele) fora do repositório se contiver dados da casa.

## Ação técnica conforme resposta

- **Se a autodeclaração for considerada suficiente para a área aberta:** manter `AGE_GATE_PROVIDER=self-declaration` em produção e registrar aqui o resumo do parecer.
- **Se o parecer exigir verificação mais forte:** implementar um novo provedor atrás de `AGE_GATE_PROVIDER` (ex.: verificação por terceiro ou Gov.br) **antes do lançamento da Fase 7**. As páginas não mudam; só o módulo de idade.
- **Área de assinantes:** seguir a resposta da pergunta 3 (ex.: campos "idade verificada por" e "data" no cadastro, sem guardar foto de documento no site).
- **Termos e Privacidade:** publicar os textos indicados na pergunta 4 antes do lançamento.
