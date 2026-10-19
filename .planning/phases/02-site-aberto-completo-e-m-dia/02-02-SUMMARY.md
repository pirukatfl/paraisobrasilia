---
phase: 02-site-aberto-completo-e-m-dia
plan: 02
subsystem: content
tags: [payload-collection, drafts, lexical, markdown-seed, legal, lgpd, navigation]

# Dependency graph
requires:
  - phase: 02-01
    provides: cached()/expire(), nav registry, Footer groups, loginAsStaff helper
provides:
  - Collection `pages` ("Páginas", group Site) with six fixed keys, drafts, published-only anonymous read, H2/H3 text editor, SEO fields
  - Migration 20261019_025904_pages: schema + seedPages() (create-only-if-missing)
  - src/migrations/seed/pages-content.ts (PAGES_SEED) and src/migrations/seed/markdown-to-lexical.ts (markdownToLexical, seedPages)
  - src/lib/pages/keys.ts (PAGE_KEYS, pathForKey, keyForSection, SECTION_TABS, isPageKey, PAGE_KEY_LABELS)
  - src/lib/pages/queries.ts getPageByKey() (tags page:{key} + pages), getPageIntro()
  - src/components/RichText.tsx (+ .rich-text typography), SubNav, InstitutionalPage, LegalPage; .btn-secondary class
  - Routes /quem-somos, /quem-somos/[secao], /termos-de-uso, /politica-de-privacidade
  - formatUpdatedDate() in src/lib/format/date.ts
affects: [02-05 (home teaser, sitemap refactor, metadata), 02-06 (staff guide)]

tech-stack:
  added: []
  patterns:
    - "Seed rich text as markdown converted with Payload's convertMarkdownToLexical + editorConfigFactory (A2 confirmed in 3.91)"
    - "Typography for CMS text via a component class (.rich-text) — Tailwind arbitrary variants cannot apply @layer component classes"
    - "RichText link converter emits only http(s)/mailto/tel/relative hrefs; external links open in a new tab with rel noopener noreferrer"

key-files:
  created:
    - src/collections/Pages.ts
    - src/migrations/20261019_025904_pages.ts
    - src/migrations/20261019_025904_pages.json
    - src/migrations/seed/pages-content.ts
    - src/migrations/seed/markdown-to-lexical.ts
    - src/lib/pages/keys.ts
    - src/lib/pages/queries.ts
    - src/lib/pages/revalidate.ts
    - src/components/RichText.tsx
    - src/components/SubNav.tsx
    - src/components/InstitutionalPage.tsx
    - src/components/LegalPage.tsx
    - src/app/(frontend)/quem-somos/page.tsx
    - src/app/(frontend)/quem-somos/[secao]/page.tsx
    - src/app/(frontend)/termos-de-uso/page.tsx
    - src/app/(frontend)/politica-de-privacidade/page.tsx
    - tests/unit/pages-seed.test.ts
    - tests/int/pages.int.test.ts
    - tests/e2e/institucional.spec.ts
  modified:
    - src/payload.config.ts
    - src/payload-types.ts
    - src/migrations/index.ts
    - src/app/(payload)/admin/importMap.js
    - src/app/(frontend)/globals.css
    - src/lib/site/nav.ts
    - src/lib/format/date.ts
    - src/components/Footer.tsx
    - src/components/MobileMenu.tsx
    - src/app/sitemap.ts
    - tests/helpers/seed.ts
    - tests/e2e/global-setup.ts
    - tests/e2e/seo.spec.ts
    - tests/unit/date.test.ts

key-decisions:
  - "02-WP-TEXTS.md existed: original WordPress wording merged into Quem somos, Normas and Regras (revised, non-explicit); Dicas, Termos and Privacidade come from 02-CONTENT.md (no usable original)"
  - "Seed markdown converted with Payload's own convertMarkdownToLexical (no local converter needed)"
  - "Legal pages show 'Atualizado em' from updatedAt; the '*Última atualização*' line of the drafts was dropped"
  - "Privacy policy removal section links WhatsApp (wa.me) and mailto directly"

patterns-established:
  - "Fixed-key pages: routes, nav, sitemap and revalidation all derive from src/lib/pages/keys.ts"

requirements-completed: [INST-01, INST-06, PAINEL-04]

# Metrics
duration: 11min
completed: 2026-10-19
---

# Phase 2 Plan 02: Institutional and legal pages Summary

**A `Páginas` collection with six fixed keys seeded on deploy (Quem somos, Normas, Regras, Dicas, Termos de Uso, Política de Privacidade), published-only public routes with Quem Somos sub-tabs, legal pages linked from every footer, and staff editing with drafts and Publicar.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-10-19T02:57:28Z
- **Completed:** 2026-10-19T03:08:14Z
- **Tasks:** 2
- **Files modified:** 33

## Accomplishments

- `pages` collection: key select (unique, sidebar, pt labels), title, intro (≤ 200, used as meta description), body (Paragraph, H2/H3, bold, italic, lists, links — no uploads/blocks); drafts (20 versions); afterChange/afterDelete expire `pages` + `page:{key}`; SEO plugin extended to pages (description from intro)
- Migration `pages` seeds the six published pages only when the key is missing; verified on a fresh test DB and by an int test that edits a page and re-runs the seed
- /quem-somos and sub-pages with `nav[aria-label="Quem somos"]` tabs, H1 + intro + text, "Próximo: … →" secondary button (Dicas ends with "Ver próximas festas")
- /termos-de-uso and /politica-de-privacidade with "Atualizado em 19 de outubro de 2026"; privacy policy contains the removal section with wa.me and mailto links and the "[VALIDAR" markers for the lawyer
- Header/mobile menu gain "Quem somos" (children Normas/Regras/Dicas); footer Navegue + Legal groups; sitemap lists the published pages

## Texts merged from 02-WP-TEXTS.md (for the client's review)

02-WP-TEXTS.md (original WordPress texts) was present and used as the preferred source for original wording, revised with the 02-CONTENT.md editorial rules:

| Page | Original wording brought in | Left out (open area / tone) |
|------|-----------------------------|-----------------------------|
| Quem somos | "Se você chegou até aqui… curiosidade sobre a vida liberal"; "Mesmo os casais liberais mais experientes já tiveram a sua primeira vez… as dúvidas, a expectativa, o clima de novidade"; "uma boate como outra qualquer: gente dançando, bebendo e se divertindo"; the promoter tour of the rooms and rules, then table or bar; "ninguém é obrigado a nada que não seja de comum acordo"; "Convites podem surgir, mas cabe somente a vocês decidir"; welcome for those who only watch / observe / participate; integration between couples ("nem todas são de conteúdo erótico"); "Quem participa, se diverte. Quem não participa, também."; advertência conforme a gravidade ou saída imediata; "Sinta-se em casa" | Explicit descriptions (couples "passando dos limites", strip shows, sexual invitations), "Deliciosamente inesquecíveis" tone |
| Normas | "Para preservar a privacidade e o respeito…"; "tolerância zero… retribuição financeira… foge ao espírito liberal"; "o fundamental é a liberdade: cada pessoa faz o que quiser, e só o que quiser, desde que não agrida nem obrigue ninguém"; "mal-estar"; the Constitution art. 5º II argument about adults able to decide and consent | The original "Não à pedofilia" wording is expressed as "Somente maiores de 18 anos"; the offensive phrase on prostitution and "Livre-se de sua timidez! E viva o desejo e o prazer!!!" |
| Regras | Original rule wording: "número controlado", "filmadora, máquina fotográfica, celular com câmera ou qualquer aparelho que possa captar imagens", "terminantemente proibidas", "causar mal-estar", "Esporte fino é o traje mais indicado", "Gritos e palavrões não são admitidos" | The days/audiences line still needs the client's confirmation (WP text flags it as old) |
| Dicas | No usable original ("Dicas Hot" is a members-only list of explicit posts) — 02-CONTENT.md text kept | — |
| FAQ | Old page has no Q&A (contact form only) — FAQ kept inside Dicas | Lista VIP / envio de fotos forms (out of scope) |
| Termos / Privacidade | No original (WordPress default policy) — 02-CONTENT.md drafts kept | — |

## Task Commits

1. **Task 1: Pages slice end to end** - `694b56c` (feat)
2. **Task 2: Legal pages, sub-tabs, menu/footer/sitemap, staff edit flow** - `7cf197d` (feat)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/pages-seed.test.ts tests/int/pages.int.test.ts` | 2 files, 11 tests passed (migration `pages` ran on the test DB) |
| `playwright test tests/e2e/institucional.spec.ts` | mobile + desktop passed (incl. staff edit → Publicar → live → revert) |
| `playwright test tests/e2e/institucional.spec.ts tests/e2e/shell.spec.ts tests/e2e/seo.spec.ts` | passed both projects |
| `vitest run tests/unit/date.test.ts` | 4 passed (`formatUpdatedDate`) |
| sitemap (e2e) contains /contato, /quem-somos, /quem-somos/{normas,regras,dicas}, /termos-de-uso, /politica-de-privacidade | PASS |
| Pages.ts has `slug: 'pages'`, `drafts: true`, `unique: true` | PASS |
| migration `*_pages.ts` registered and calls `seedPages` | PASS |
| `grep -c "key:" pages-content.ts` = 7; contains "Pedido de remoção de imagem"; no "Conteúdo redigido"/"RASCUNHO" | PASS |
| Footer contains "Termos de Uso" and "Política de Privacidade" | PASS |
| `pnpm test` | vitest 12 files / 47 tests; playwright 47 passed, 17 skipped (project-specific) |
| `pnpm typecheck`, `pnpm lint` | exit 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tailwind arbitrary variants cannot apply `.type-heading`**
- **Issue:** UI-SPEC typography for H2/H3 inside CMS text uses the Phase 1 component classes (`@layer components`), which Tailwind 4 does not allow inside `[&_h2]:…` variants.
- **Fix:** `.rich-text` component class in globals.css using the same tokens (no new values); also added `.btn-secondary` (UI-SPEC secondary button).
- **Files modified:** src/app/(frontend)/globals.css — **Committed in:** 694b56c

**2. [Rule 1 - Bug] Admin list link clicked before hydration in the staff e2e**
- **Fix:** the spec reads the row link's href and navigates to it.
- **Committed in:** 7cf197d

**3. Sub-tabs styled in Task 1** (plan allowed a plain list until Task 2); SubNav was written once.

**4. FAQ question/answer separated by a blank line** in the Dicas seed so each renders as its own paragraph.

---

**Total deviations:** 4 (1 blocking, 1 test bug, 2 scope notes). **Impact:** none on contracts.

## Issues Encountered

None.

## User Setup Required

None — the `pages` migration seeds staging on deploy. The client reviews the texts in the panel (see table above) and sends Termos/Política to the lawyer.

## Next Phase Readiness

- Ready for 02-03 (space gallery). `getPageByKey('quem-somos')` ready for the 02-05 home teaser.

## Self-Check: PASSED

---
*Phase: 02-site-aberto-completo-e-m-dia*
*Completed: 2026-10-19*
