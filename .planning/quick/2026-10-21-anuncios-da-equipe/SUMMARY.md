# Anúncios antigos da equipe: SUMMARY

Commit c5f7787. Client chose option b (2026-10-21): the 94 old ads posted from WordPress admin accounts (plus 2 from deleted users) come in as drafts visible only to staff.

- Placeholder Assinante "Equipe (anúncios do site antigo)" (`equipe-legado@invalid.paraiso.local`, unverified, random password: cannot log in), created idempotently by the importer.
- `ads.origemLegado = equipe` (importer-only, filterable); migration `20261021_203534_anuncios_equipe`. Staff can reassign the owner only for these drafts (flag clears), edit, delete, or "Aprovar e publicar".
- Dashboard ClassiSex box: "N anúncios antigos da equipe para revisar" linking to the filtered list.
- Report: `Anúncios: rascunhos criados N · já existiam N · da equipe (rascunho para revisar) N`. Visitor ads (user_id 0) still skipped.
- Tests: tests/int/anuncios-equipe.int.test.ts (9), tests/e2e/anuncios-equipe.spec.ts; Vitest 655/656 (contos CLI flake, passes alone); Playwright 434 passed, 0 failed.
- Staging re-run expected: `rascunhos criados 96 · já existiam 108 · da equipe 96`.
