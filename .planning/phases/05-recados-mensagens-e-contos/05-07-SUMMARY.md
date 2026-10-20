---
phase: 05-recados-mensagens-e-contos
plan: 07
subsystem: previews
tags: [recados, preview, teaser, assine-ja, nav, sitemap]
requires: [05-06]
provides:
  - toPublicRecadoTeaser, PublicRecadosDTO (src/lib/recados/dto.ts), findPublicRecadosTeaser (board.ts), getPublicRecadosTeaser (public.ts, cached, tag 'recados')
  - public /recados page (weekly count + up to 6 redacted snippets, no apelido/id/exact date)
  - AssineJaCta on /classisex; "Assine Já" on every public preview
  - Recados in menu (between ClassiSex and Contos), footer and sitemap
affects: [05-11]
key-files:
  created:
    - src/lib/recados/public.ts
    - src/app/(frontend)/recados/page.tsx
    - tests/unit/recado-teaser.test.ts
    - tests/e2e/previas.spec.ts
  modified:
    - src/lib/recados/dto.ts
    - src/lib/recados/board.ts
    - src/app/(frontend)/classisex/page.tsx
    - src/lib/site/nav.ts
    - src/components/Footer.tsx
    - src/lib/seo/sitemap.ts
    - tests/unit/sitemap.test.ts
    - tests/int/recados.int.test.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/classisex-publico.spec.ts
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 5 Plan 07: Public recados teaser and Assine Já Summary

/recados shows a weekly count and short redacted snippets without any identifying data, and every preview carries an "Assine Já" link.

## Deviations from Plan

- The ClassiSex empty-state test in classisex-publico.spec.ts now uses `.first()` because the page has the new CTA plus the empty-state button (both to /assine-ja).
- The teaser's e2e menu-order check uses `allTextContents` (CSS uppercase breaks `innerText`).

## Self-Check: PASSED
