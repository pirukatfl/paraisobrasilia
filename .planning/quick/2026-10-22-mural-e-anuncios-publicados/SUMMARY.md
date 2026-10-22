# Mural antigo importado e anúncios antigos publicados: SUMMARY

Commit b6314c5. Client decision 2026-10-22: "traz todas e ficam aparecendo, só as novas que vão ter os limites".
- Importer reads posts 2894 (ClassiSex) and 749 (Mural) (`--post a,b`), records `ads.fonteLegado` (classisex|mural), imports every old ad published (migration 20261022_022156_mural_publicado).
- Old ads (importer-only `wpCommentId`) exempt from the 3-active count, 600-char cap, contact requirement and tier photo count (absolute 10 stays; 5000-char abuse ceiling on edits). New ads keep all limits. Redaction for non-payers unchanged.
- Re-run promotes untouched drafts (no submittedAt/moderatedAt, expected owner); never overrides staff/author decisions; deleted legacy ads leave audit `anuncio-legado-apagado` and aren't recreated. Known limitation: staff text-only edit of a draft isn't detected.
- "Revise e publique" notice removed; Meus anúncios shows a short note. `/mural` → `/classisex`. GIF photos counted as recusadas (pipeline: JPEG/PNG/WebP).
- Tests: Vitest 684/684; Playwright 457 passed, 5 environmental (seo port, party/age-gate flakes pass alone); build ok.
