---
phase: 05-recados-mensagens-e-contos
plan: 04
subsystem: contos-import
tags: [wordpress, import, cli, bundle, migration]
requires: [05-01, 05-03]
provides:
  - src/lib/contos/import.ts (buildImportRecords, importContos, formatReport, formatLoad, readBundle, writeBundle, loadBundleIfPresent)
  - scripts/import/contos.ts and `pnpm import:contos`
  - migration 20261020_132231_contos_wp_bundle (no schema change; loads src/migrations/seed/contos-wp.json if present)
affects: [05-12]
tech-stack:
  added: []
  patterns: ["top-level await in `payload run` scripts (the bin exits the process when the import settles)"]
key-files:
  created:
    - src/lib/contos/import.ts
    - scripts/import/contos.ts
    - src/migrations/20261020_132231_contos_wp_bundle.ts
    - tests/unit/contos-import.test.ts
    - tests/int/contos-import.int.test.ts
  modified:
    - package.json
    - .gitignore
    - .env.example
    - src/migrations/index.ts
key-decisions:
  - "Import adds an any-TLD e-mail pass after redactContacts (which only knows common TLDs)"
  - "Task 3 (real dump) is an ORCHESTRATOR step and is PENDING"
requirements-completed: []
requirements-partial: [PAINEL-03, PREV-03]
duration: 35min
completed: PARTIAL (Tasks 1-2 done 2026-10-20; Task 3 pending)
---

# Phase 5 Plan 04: Contos import Summary (PARTIAL: Task 3 pending)

Tasks 1 and 2 are done and tested on the synthetic fixture only. The real WordPress dump was never read by the executor. **Task 3 (orchestrator) is pending**: run the import on the real dump, review the aggregate report, choose carrier A or B.

## Tasks
1. Records, report, idempotent loader - commit 09d0302 (9 unit + 2 int tests)
2. CLI, package script, bundle migration, env/gitignore - commit de4b798 (4 CLI int tests: dry-run, export, missing env, write + idempotent + from-bundle)
3. ORCHESTRATOR STEP - PENDING

## Task 3 commands (orchestrator)
```
# Postgres up (as postgres user): /usr/lib/postgresql/16/bin/pg_ctl -D /home/claude/pgdata start
# NOTE: .env in this clone is a directory; export the dev env yourself, e.g.  set -a; . ./.env/.env; set +a
WP_DUMP_PATH=<.sql.gz under /mnt/project-files/private> pnpm import:contos -- --dry-run
WP_DUMP_PATH=<...> pnpm import:contos                    # writes to DATABASE_URI (use the DEV db, not paraiso_test)
WP_DUMP_PATH=<...> pnpm import:contos -- --export /mnt/project-files/private/contos-export.json
# carrier A: cp that file to src/migrations/seed/contos-wp.json, run `pnpm exec vitest run tests/int/contos-import.int.test.ts`, commit
```
Expected: "Contos encontrados: 50 · restritos no site antigo: 10". Flags to inspect: mojibake, vazio, shortcode-restante, builder, sem-paragrafos, curto, aberto-demais. Orchestrator default (CONTEXT) is carrier A.

## Deviations from Plan
- [Rule 1 - Bug] `payload run` calls `process.exit(0)` as soon as the imported script module settles, which killed an async `main()` before it printed anything. Fixed with top-level await in scripts/import/contos.ts.
- [Rule 2 - Missing critical] `redactContacts` only recognises common TLDs, so an e-mail such as `x@exemplo.test` survived. The import now applies an extra any-TLD e-mail pass (LGPD, T-05-14). Phase 4 module unchanged.

## Known Stubs
None.

## Self-Check: PASSED (Tasks 1-2)
