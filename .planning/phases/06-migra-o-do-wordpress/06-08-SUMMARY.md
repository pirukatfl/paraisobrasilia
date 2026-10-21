---
phase: 06-migra-o-do-wordpress
plan: 08
subsystem: migration
tags: [cli, import]
requires: [06-07]
provides:
  - "pnpm import:wordpress -- --inspect | --dry-run | (write) with --uploads, --chave-eu-sou, --chave-cidade, --excluir-ids, --post"
affects: [06-09, 06-10]
key-files:
  created: [scripts/import/wordpress.ts, tests/int/migracao-cli.int.test.ts]
  modified: [package.json, .env.example, src/lib/migracao/wp-classisex.ts, tests/unit/migracao-extract.test.ts]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 08: Operator CLI Summary

Inspect and dry-run need no database. Write mode loads Payload lazily and prints the aggregate report plus loader counts. Only plain `Error`s from our modules print their message; anything else prints a generic line (no stacks). Spawn tests assert no sentinel, no `@`, no full hash and no dump IDs on every mode, including a truncated gzip.

## Commits
- cf2b5e5 CLI, script, env note, tests

## Results
- 9 CLI int tests pass; migracao-extract 15 pass.

## Deviations from Plan
- [Rule 1] `resolveFieldKeys` accepted any `--chave-eu-sou` silently (zero ads). It now throws a Portuguese error when the key is not an ad meta key; the 06-02 unit test that used a made-up key was updated to use the real key and to assert the new error.
- The LEAK check strips the pnpm banner line (it contains the package name with `@`) and allows the 4-char hash prefixes that `--inspect` prints with counts.

## Self-Check: PASSED
