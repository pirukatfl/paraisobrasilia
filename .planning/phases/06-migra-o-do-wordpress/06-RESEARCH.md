# Phase 6: Migração do WordPress — Research (decisions only)

**Researched:** 2026-10-21
**Inputs:** 06-CONTEXT.md (M-01..M-07, approved by the client on 2026-10-21 with the M-02 adjustment), 06-OLD-URLS.md, docs/discovery/WORDPRESS.md (aggregates of the 2026-10-19 dump), 03/04 CONTEXT, quick tasks conta-gratuita and recados-privados, Phase 5 contos importer (src/lib/contos/wp-dump.ts, src/lib/contos/import.ts, scripts/import/contos.ts).
**HARD RULE (planner, executors):** nobody but the orchestrator reads `/mnt/project-files/private` (the real dump). Executors build and test on synthetic fixtures only. Every importer output is aggregate (counts and flags): never e-mails, names, logins, hashes, texts, cities or WordPress IDs.

## Phase Goal (MVP user story)

ROADMAP Phase 6 goal is not written as a user story (same as Phase 5; the plans use this story, derived from the goal and M-01..M-07):

**As a** assinante ou anunciante do site antigo, **I want to** entrar no site novo com a minha conta e a senha de antes, com o tempo que já paguei preservado e os meus anúncios antigos guardados para revisar, **so that** eu não perca o que paguei nem precise começar do zero, e quem chega por um link antigo cai na página certa.

## 1. WordPress password hashes (verified against WordPress core source)

Source read: `wp-includes/pluggable.php` at tags 6.8 and 6.9 and `wp-includes/class-phpass.php` (6.9), raw from github.com/WordPress/WordPress. The live site runs 6.9.10; the functions are identical in 6.8 and 6.9.

**`$wp$2y$…` (WP ≥ 6.8, 307 accounts)**
- Hashing: `'$wp' . password_hash( base64_encode( hash_hmac( 'sha384', trim( $password ), 'wp-sha384', true ) ), PASSWORD_BCRYPT )`.
- Checking (`wp_check_password`): `password_verify( base64_encode( hash_hmac( 'sha384', $password, 'wp-sha384', true ) ), substr( $hash, 3 ) )` — note: NO `trim` on check, `trim` on hash. Passwords > 4096 bytes are rejected.
- In Node: `pre = createHmac('sha384', 'wp-sha384').update(password, 'utf8').digest('base64')` (64 ASCII chars, under bcrypt's 72-byte limit), then bcrypt-compare `pre` against `hash.slice(3)` (a `$2y$10$…` string). HMAC key = the literal string `wp-sha384`; message = the password.
- `$2y$` is PHP's marker for the fixed bcrypt; algorithmically identical to `$2b$`. `bcryptjs@3.0.3` compares `$2y$` hashes directly (tested here against PHP-generated vectors, also with the `$2b$` rewrite).

**`$P$…` (phpass portable, 95 accounts)** — `PasswordHash(8, true)->CheckPassword`:
- `itoa64 = './0-9A-Za-z'` (`./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`); `count = 1 << itoa64.indexOf(hash[3])` (valid log2 7..30); `salt = hash.slice(4, 12)` (8 chars);
- `h = md5(salt + password)` (raw bytes), then `count` times `h = md5(h + password)`; result = `hash.slice(0, 12) + encode64(h, 16)` with phpass's own `encode64` (little-endian 6-bit groups over itoa64). Compare the full 34-char string (use `crypto.timingSafeEqual`).
- A Node port of exactly this was checked here against PHP output for 4 vectors (below). Old WP hashed `trim($password)` here too.

**Trim asymmetry:** WP hashes `trim(password)` and checks the untrimmed input. Our verifier checks the exact input first and, only if it differs from `password.trim()`, also the trimmed input (accepts what WP stored; never accepts a different password).

**Other formats:** 0 accounts (WORDPRESS.md). Anything that is not `$wp$2[aby]$` or `$P$` + 31 chars is "desconhecido": the account is imported without a legacy hash and can only enter through "Esqueci minha senha" or a staff link.

**Independent test vectors** (generated with PHP 8 `password_hash` + WordPress's own `class-phpass.php`, synthetic passwords; copy verbatim into tests):

| Password | `$wp$` hash | `$P$` hash |
|----------|-------------|------------|
| `senha-sintetica-1` | `$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica` | `$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.` |
| `Ação ç 😀 longa ` + 80 × `x` | `$wp$2y$10$kFK8hxQIhZzEba6HXi2jeul9n9ot04di7ZMD/Xw9OyjXzA5vanuF2` | `$P$Bj7XTxrpJpFseMjpZLXtVjcy25.QRz0` |
| `curta7` (6 chars, below our 8 minimum) | `$wp$2y$10$ZCyjg8Ai1fHJVHo4vpmju.MqB6nw24/NjZ9IiOXRF6VjB6zBH8Y..` | `$P$BVN0C2LM5LrTtvTcnn9JecXDy8nUzK0` |
| `test12345` (phpass project's own test vector) | — | `$P$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0` |

Negative: `senha-sintetica-1!` must fail against both hashes of row 1.

## 2. Lazy legacy verification in Payload 3.91 login (no weakening)

Facts from `node_modules/payload/dist/auth/operations/login.js` and `strategies/local/*`:
- `payload.login` finds the user, throws `LockedAuth` if `lockUntil` is in the future, runs PBKDF2 (`pbkdf2-sha256-v1`, 600 000 iterations), on failure calls `incrementLoginAttempts` (locks at `maxLoginAttempts` = 5 for `lockTime` = 10 min) and throws `AuthenticationError` (or `LockedAuth` after the increment that locks). It throws `UnverifiedEmail` only after the password matched.
- `create` on an auth collection REQUIRES a password (`generatePasswordSaltHash` validates it).
- Login on the site is only the server action `entrar` (src/lib/assinantes/actions.ts), which already carries the note "Phase 6: … legacyPasswordHash". REST `/api/assinantes/login` stays as is (no legacy path there).

**Decision (legacy-first, inside the existing action; no custom auth strategy):**
1. Imported accounts get a random 32-byte password (unknown to anyone) plus `legacyPasswordHash` (hidden field). Payload's own login can never succeed for them until the rehash.
2. `entrar` calls `loginWithLegacy(payload, email, password)` (new, `src/lib/assinantes/legacy-login.ts`, no Next imports): it looks up the account by e-mail (Local API, `showHiddenFields`), and only when it has a legacy hash: (a) `lockUntil` in the future → same "bloqueado" answer as today, no hash check; (b) legacy hash matches → if the password has ≥ 8 characters, `update { password, legacyPasswordHash: null }` then the normal `payload.login` (resets the attempt counter, creates the session, checks `_verified`); if it has < 8 characters, mint a single-use reset token (forgotPassword, e-mail disabled, new server-only context flag `legacyPasswordUpgrade`) and send the person to `/nova-senha?token=…&aviso=senha-curta`; the hash stays until the new password is saved; (c) no match → fall through to `payload.login`, which fails and counts the attempt exactly as for any wrong password.
3. Every password write (staff, self change, rehash, reset link) clears `legacyPasswordHash` (guardOperations for create/update; `definirNovaSenha` for `resetPassword`, which bypasses hooks).
4. Unchanged: cookie, session, `maxLoginAttempts`/`lockTime`, neutral error texts, `safeNext`, Origin guard in `src/proxy.ts` (the action is a same-origin POST; nothing new is exempted), REST endpoints and their guards.
- Cost: bcrypt (cost 10, pure JS ≈ 100 ms) runs only for accounts that still hold a legacy hash, at most 5 times per account per 10 minutes (the lock applies before the check). Accepted.
- Timing: an existing legacy account answers slower than an unknown e-mail — the same class of difference Payload already has (unknown e-mail skips PBKDF2). Accepted, recorded in the threat model.

## 3. Subscription time (M-02)

- Source: `usermeta._expire_user_date` (Unix seconds, absolute instant), `_expire_user_expired` Y/N, role from `{prefix}capabilities` (PHP-serialized array, e.g. `a:1:{s:10:"subscriber";b:1;}`).
- **Pagante** = not administrator AND `_expire_user_date` > now (regardless of the Y/N flag and of the role; flags count "expirado=Y com data futura" and "no_assinante com data futura" for review). WORDPRESS.md: 32.
- **Revisar** = role `subscriber`, no date (28 per CONTEXT; 26 in WORDPRESS.md): free account + `revisarAssinaturaAntiga = true`.
  Client adjustment (2026-10-21, M-02): the flag is shown as the marker **"Assinante antigo sem data de vencimento"** in the Assinantes list (Conta column), on the record (warning box with "Dispensar aviso"), in a list filter and a dashboard panel; it clears automatically when staff create a subscription period for the account, or when staff dismiss it (both audited).
- Everything else: free account, no period.
- Period: `startsAt` = import time; `endsAt` = the smallest São Paulo midnight ≥ the WP instant (`spMidnight(addDaysToDate(spDate(new Date(ts*1000 - 1)), 1))` from src/lib/assinantes/periods.ts). Rounds up in the member's favour; the site's rule "o acesso termina às 00h deste dia" keeps the whole last day.
- Plan: find-or-create by exact name **"Migrado do site antigo"** (`active: false` so /assine-ja never lists it, price 0, durationDays 30 — irrelevant because `endsAt` is explicit); payment `method: 'outro'`, note "Importado do site antigo". Re-run (Phase 7 cutover): one migration period per account; extend `endsAt` if the new dump has a later date, never shorten.

## 4. Accounts (M-01)

- Read only `users` and `usermeta` keys `{prefix}capabilities`, `_expire_user_date`, `_expire_user_expired`. Nothing else from usermeta (phones, addresses, BuddyPress, ImagePress metadata) is read.
- Skip: administrators; test accounts (domain in example.com/.org/.net, test.com, teste.com, mailinator.com, yopmail.com, or local part with a `teste`/`test`/`dev` token); invalid e-mail; duplicate e-mail (case-insensitive; first by lowest WP ID wins); WP IDs listed in an optional `--excluir-ids <arquivo>`.
- E-mail lower-cased and trimmed. `name` = `display_name` (trim) or `user_nicename` or "Assinante". `apelido` = `display_name`, else `user_nicename`, if it passes `recadoApelidoError` (no contact) and is ≤ 40 chars and is not the e-mail local part; otherwise empty.
- New accounts: `origem: 'site-antigo'` (new option), `_verified: true` (trustedCreate), `importadoEm`, `wpUserId` (unique), `legacyPasswordHash` when the format is known.
- E-mail already on the new site: if that account is confirmed → link it (`wpUserId`, `importadoEm`; keep its password; no legacy hash; the period still applies); if it is an unconfirmed self sign-up → skip with flag `conflito-email` (someone who cannot read that inbox must never inherit paid time).
- Re-run: matched by `wpUserId`; never overwrites name, apelido, e-mail or a converted password; refreshes `legacyPasswordHash` only while it is still pending and the WP hash changed.

## 5. Old ClassiSex ads (M-04)

- Source: `comments` with `comment_post_ID = 2894`, `comment_approved = '1'`, `user_id > 0`, `comment_parent = 0`, `comment_type IN ('', 'comment')`; `commentmeta`; attachment rows of `posts` + `postmeta._wp_attached_file`.
- 04 research recorded only the form labels ("Eu Sou", "Cidade") and `wmu_attachments` (WORDPRESS.md), not the wpDiscuz meta keys. wpDiscuz stores custom form fields as comment meta under generated keys (`custom_field_<hex>`), with the form layout serialized in the postmeta of a `wpdiscuz_form` post. Therefore the importer:
  - `--inspect` prints only: table row counts, hash-prefix counts (4 chars), role counts, and for comment meta on the target post: each meta key, rows, distinct-value count, "todos em Casal/Solteiro/Solteira: sim/não"; plus `custom_field_* → rótulo` pairs read from the wpDiscuz form layout (labels are form configuration, not personal data).
  - Auto-detects the "Eu Sou" key (the only key whose values are all in {Casal, Solteiro, Solteira}) and the "Cidade" key (form label "Cidade", accents/case ignored); `--chave-eu-sou` / `--chave-cidade` override; if not resolvable it stops with a pt message telling the operator to run `--inspect`.
- Mapping: Casal→Casal, Solteiro→Homem, Solteira→Mulher (04 revision rename; categories looked up by name). Unknown value → skipped, counted.
- Ad: `status: 'rascunho'` (new), `apelido` = account apelido or "Anônimo", `cidade` only if `cidadeError` is null (else empty, counted), `texto` = comment text with tags stripped and entities decoded (contacts stay in the author's own draft; nothing extracted, per M-04), `wpCommentId` (unique), `importadoEm`, `criadoNoSiteAntigoEm`. Draft rules: no contact required and texto may exceed 600 while `rascunho`; the owner's submit goes through the existing `validateAdInput` + `updateAd` (→ `pendente`, moderation queue). Staff cannot approve a draft directly (no transition from `rascunho`).
- Photos: `wmu_attachments` (PHP-serialized attachment IDs) → `_wp_attached_file` → file under `--uploads <dir>` (path must stay inside the dir after `realpath`); jpeg/png/webp only, ≤ 10 per ad, uploaded through the `ad-media` Local API (EXIF stripped by the existing re-encode, blurred twin). A server-only context flag `legacyImport` skips only the tier photo limit (free authors keep their stored photos, G-05 already shows only the cover). Without `--uploads` the ads come without photos (M-04); a later re-run with `--uploads` adds photos to drafts that have none yet.

## 6. Old links (M-05)

- Map generated from 06-OLD-URLS.md + src/migrations/seed/contos-wp.json (wpSlug→slug; 5 contos had their slug changed) by `src/lib/redirects/build.ts`, written to `src/lib/redirects/legacy-redirects.ts` (committed, reviewable) and loaded by `next.config.ts` `redirects()` with `statusCode: 301`.
- Next's own trailing-slash redirect (`/x/` → `/x`, 308) happens first, so an old URL may take two permanent hops (308 then 301). Google follows both; accepted (no global `skipTrailingSlashRedirect`).
- Rules (destinations only to existing routes): contos posts → `/contos/<slug>` (not in bundle → `/contos`); postdev-only story posts → `/contos`; structural posts (`/classisex1/` → `/classisex`, `/mural/` → `/assine-ja`, `/programacao/` and `/avisos/` → `/`, `/3753-2/` → `/`); pages per the table in 06-03-PLAN; BuddyPress/UM/Youzify profiles and members → `/classisex`; activity/groups/forum/account → `/entrar`; `/register` → `/cadastro`; feeds, `/wp-admin/*`, `/wp-login.php` → `/entrar`; `/category/contos` → `/contos`, other categories/tags/authors → `/`; `/image/*` → `/espaco`; `/assinatura/*` and `/checkout` → `/assine-ja`; WP/Rank Math sitemaps → `/sitemap.xml`.
- Dicas Hot posts (30) and the `o-que-e-dogging` post have no new page: 404 (M-05 allows "410/404 normal"); open client question.

## 7. Package Legitimacy Audit

| Package | Version | Registry facts (npm view, 2026-10-21) | Verdict |
|---------|---------|----------------------------------------|---------|
| `bcryptjs` | 3.0.3 | maintainer `dcode` (original author), repo github.com/dcodeIO/bcrypt.js, zero runtime dependencies, no install scripts (pure JS, nothing for `onlyBuiltDependencies`), ships its own TypeScript types; verified locally to compare `$2y$` hashes produced by PHP 8 | [VERIFIED] |

No other new package. phpass is ported (≈ 40 lines, test vectors above) rather than pulled from a small unmaintained npm package. Rejected: `@node-rs/bcrypt` (native build step, not needed for ≤ 5 checks per account per 10 min).

## 8. Where the real import runs

- Our environment has no SSH to the VPS and cannot reach staging (STATE.md). Executors never touch the real dump.
- Local (orchestrator): `--inspect`, `--dry-run` (pure, no DB), then a write into the local DEV database (not `paraiso_test`) with aggregate SQL checks.
- Staging (client terminal, runbook 7.6): the `migrate` image already contains `scripts/` and full `node_modules`; the client copies the dump (and later the uploads folder) to `/opt/paraiso-site/importacao/`, takes a `pg_dump` first, then runs `docker compose --env-file .env.staging run --rm -v /opt/paraiso-site/importacao:/importacao:ro -v paraiso-staging_private_media:/app/private-media -e PRIVATE_MEDIA_DIR=/app/private-media -e WP_DUMP_PATH=/importacao/<arquivo>.sql.gz migrate node_modules/.bin/payload run scripts/import/wordpress.ts -- <opções>`, and deletes the dump afterwards. No compose change, no bootstrap re-run.

## Validation Architecture

| Area | Test type | Command |
|------|-----------|---------|
| WP hash verify (vectors) | unit | `pnpm exec vitest run tests/unit/wp-password.test.ts` |
| Dump extraction, classification, inspect, report has no personal data | unit (synthetic fixture tests/fixtures/wp-migracao-mini.sql) | `pnpm exec vitest run tests/unit/migracao-extract.test.ts` |
| Redirect map (every old URL → existing route; no source shadows a route; up to date) | unit + e2e | `pnpm exec vitest run tests/unit/legacy-redirects.test.ts`, `pnpm exec playwright test tests/e2e/redirects-site-antigo.spec.ts` |
| Account fields never readable (REST, where-queries, audit) | int | `pnpm exec vitest run tests/int/migracao-contas.int.test.ts` |
| Legacy login, lockout, rehash, short password, hash cleared | int + e2e | `tests/int/login-site-antigo.int.test.ts`, `tests/e2e/login-site-antigo.spec.ts` |
| Draft ads invisible to others; owner submits to queue | int + e2e | `tests/int/anuncios-rascunho.int.test.ts`, `tests/e2e/anuncios-site-antigo.spec.ts` |
| Loader idempotency, cutover re-run, conflicts, photos | int | `tests/int/migracao-load.int.test.ts` |
| CLI modes and aggregate-only output | int (spawn) | `tests/int/migracao-cli.int.test.ts` |
| Real dump, staging rehearsal, client login with old password | manual (orchestrator + client) | 06-10 |

Sampling: each task runs its own files; each plan ends with `pnpm typecheck && pnpm lint`; plans that touch shared flows run the full `pnpm exec vitest run` (int files share `paraiso_test`, run serially).

## Open questions for the client (not covered by 06-CONTEXT)

1. Dicas Hot (30 posts) and 14 `postdev`-only posts that look like stories were not imported in Phase 5: let the Dicas Hot links 404 and send the story-like ones to /contos (planned default), or import them?
2. Old passwords shorter than 8 characters: planned default = after the old password is confirmed, the person creates a new one (8+) on the spot. OK?
3. Test accounts: besides the automatic rule (example/test domains), does the house have a list of accounts to leave out? (optional file of WP IDs)
4. A WP e-mail that already has a confirmed account on the new site: planned default = link (keeps the new password, adds the paid time). OK?
5. The roadmap success criterion "perfis… aparecem com suas fotos" vs M-04 (old ads come as private drafts until the author republishes): confirm M-04 wins; photos depend on the uploads backup.
