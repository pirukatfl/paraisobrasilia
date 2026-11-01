---
type: quick
slug: novo-planejamento
date: 2026-11-01
executor: sonnet
status: lote 1 completo (lote 2: E, F, G e lote 3: I pendentes)
---

# Resumo: novo planejamento do cliente, lote 1 (A, B, C, D, H)

Cinco commits na branch `claude/project-thread-gbqc9y`, um por item. Textos novos visíveis estão nas áreas de `src/lib/textos/areas/*` (editáveis no painel, padrão = texto original).

## O que mudou

- **A. Horário de término na festa**: a página da festa mostra "Das 22h às 5h" quando a equipe preencheu "Data e hora de término"; com o término automático (início + 10 h, `defaultEndsAt`) continua só o início. Regra pura `hasCustomEnd` em `src/lib/parties/visibility.ts` (teste unitário). Texto novo `horarioComTermino`. `formatPartyTime` passou a tirar o zero à esquerda (`5h`). Migração `festa_horario_termino`.
- **B. Rodapé em colunas**: "Navegue" é o bloco largo e a lista corre em colunas CSS: 2 no celular, 3 no desktop.
- **C. Galeria com submenus**: `Models.categoria` (`profissional`/`amadora`, padrão `profissional`; existentes ficam `profissional`). `/modelos?tipo=profissionais|amadoras` filtra; título e abertura próprios. Menu "Galeria" (`menuGaleria`) com filhos Profissionais e Amadoras, também no menu de assinante. Dropdown acessível no `Nav.tsx` para Galeria e Quem somos. Migração `galeria_categoria`.
- **D. Menu do site**: global `menu-do-site` (Configurações): `itensOcultos` (19 chaves) e `linkExterno` (`ativo`, `rotulo`, `url` http/https). Menu, menu do celular e rodapé filtram pelas mesmas chaves. Link externo só em `getMemberNavItems`, antes de Sair, `target="_blank"` e `rel="noopener noreferrer nofollow"`. Leitura com cache (tag `menu`) e falha suave. Guia da equipe: seção "Menu do site". Migração `menu_do_site`.
- **H. Contos sem foto**: card e as duas páginas de conto não mostram mais a imagem; campo e arquivos continuam guardados.

## Desvios

- A categoria filtra em memória sobre a lista em cache, em vez de entrar na chave do cache.
- O rodapé mostra só "Galeria" (sem filhos), porque a lista dele é plana.
- O banco de teste foi criado por push do schema e as migrações antigas marcadas como rodadas: a migração do zero falha em `contact_global` (o seed lê o global com o schema atual). Fora do escopo; vale item à parte.
- O formulário público de envio de contos ainda pede imagem opcional.

## Resultados do gate

- typecheck limpo; lint 0 erros (1 aviso antigo); unit 49 arquivos / 541 testes ok; int 44 / 416 ok; build ok.
- Playwright completo: 578 passaram, 13 falharam, 25 não rodaram, 150 ignorados. 10 falhas são as pré-existentes de 2026-10-28; `previas:86` (m/d) e `conta-gratuita:171` (mobile) também falham na base `c2ee3a3`; `textos:113` desktop é instável (passa isolado).

## Para a equipe do cliente

- Em Site → Profissionais e amadoras, marcar "Amadora" nas modelos que forem (todas ficaram como Profissional).
- Em Configurações → Menu do site: esconder itens e editar o link externo (vem ligado, "Vídeos pornô grátis", https://www.redtube.com.br/, só para assinante logado).
