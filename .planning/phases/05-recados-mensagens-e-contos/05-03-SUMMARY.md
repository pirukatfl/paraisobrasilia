---
phase: 05-recados-mensagens-e-contos
plan: 03
subsystem: contos-reading
tags: [public-preview, members, dto, cache, nav, sitemap, assine-ja]
requires: [05-02]
provides:
  - src/lib/contos/dto.ts (toContoCardDTO, toPublicContoDTO open blocks only, toMemberContoDTO)
  - src/lib/contos/reads.ts (findPublishedContos, findPublishedConto, findPublishedContoSlugs; take a payload)
  - src/lib/contos/public.ts (cached, tags contos / conto:{slug}) and queries.ts (members, never cached)
  - src/components/contos/AssineJaCta.tsx (shared by every preview, reused in 05-07)
  - pages /contos, /contos/[slug], /area-do-assinante/contos, /area-do-assinante/contos/[slug]
  - Contos in menu, footer, members sub-nav and sitemap
affects: [05-04, 05-07, 05-11]
tech-stack:
  added: []
  patterns: ["two read models: public DTO has no texto key; members route is force-dynamic and noindex"]
key-files:
  created:
    - src/lib/contos/dto.ts
    - src/lib/contos/reads.ts
    - src/lib/contos/public.ts
    - src/lib/contos/queries.ts
    - src/components/contos/AssineJaCta.tsx
    - src/components/contos/ContoCard.tsx
    - tests/unit/conto-dto.test.ts
    - tests/int/contos-reads.int.test.ts
    - tests/e2e/contos.spec.ts
  modified:
    - src/lib/site/nav.ts
    - src/components/Footer.tsx
    - src/lib/seo/sitemap.ts
    - src/app/sitemap.ts
    - tests/e2e/helpers/api.ts
    - tests/e2e/shell.spec.ts
    - tests/unit/sitemap.test.ts
key-decisions:
  - "sitemap input `contos` is optional so existing callers and tests keep working"
requirements-completed: [PREV-03, PREV-04]
duration: 25min
completed: 2026-10-20
---

# Phase 5 Plan 03: Reading contos Summary

Visitors read the open paragraphs of each conto with a clear "Assine Já"; active subscribers read the whole text. The sentinel sentence from a restricted paragraph is absent from public HTML, the RSC payload, metadata and the list (e2e, both projects); drafts are 404; an ended subscriber sees only the inactive panel.

## Tasks
1. DTOs and reads - commit ad477e2
2. Pages, menu, footer, sitemap, sub-nav - commit 93ac3cd

## Deviations from Plan
None - plan executed as written. (The leak check on the RSC payload uses `RSC: 1` on the public URL.)

## Known Stubs
None.

## Self-Check: PASSED
