# Mural antigo importado e anúncios antigos publicados: SUMMARY

Commit b6314c5. Client decision 2026-10-22: "traz todas e ficam aparecendo, só as novas que vão ter os limites".
- Importer reads posts 2894 (ClassiSex) and 749 (Mural) (`--post a,b`), records `ads.fonteLegado` (classisex|mural), imports every old ad published (migration 20261022_022156_mural_publicado).
- Old ads (importer-only `wpCommentId`) exempt from the 3-active count, 600-char cap, contact requirement and tier photo count (absolute 10 stays; 5000-char abuse ceiling on edits). New ads keep all limits. Redaction for non-payers unchanged.
- Re-run promotes untouched drafts (no submittedAt/moderatedAt, expected owner); never overrides staff/author decisions; deleted legacy ads leave audit `anuncio-legado-apagado` and aren't recreated. Known limitation: staff text-only edit of a draft isn't detected.
- "Revise e publique" notice removed; Meus anúncios shows a short note. `/mural` → `/classisex`. GIF photos counted as recusadas (pipeline: JPEG/PNG/WebP).
- Tests: Vitest 684/684; Playwright 457 passed, 5 environmental (seo port, party/age-gate flakes pass alone); build ok.

## Addendum: visitor comments (follow-up, 2026-10-22)
- Real dry-run showed 414 approved top-level Mural comments posted by visitors (user_id 0), skipped by the importer; client wants ALL old posts published.
- Approved top-level visitor comments of both sources now import as published ads owned by the team placeholder (`origemLegado: 'equipe'`, reused; no enum value, no migration). Apelido = typed `comment_author`, contacts/links/@ removed, max 40, fallback "Anônimo". Visitor e-mail/IP columns are never read. Photos via `wmu_attachments`; idempotent by `wpCommentId`.
- Report: "visitantes N" replaced by "de visitantes (publicados pela equipe) N" (total and per source); `visitante` removed from the skip reasons.
- Tests: synthetic fixture gained visitor comments 107 (ClassiSex) and 116 (Mural: phone and handle in the name, e-mail and IP present, photo); sentinels extended.
