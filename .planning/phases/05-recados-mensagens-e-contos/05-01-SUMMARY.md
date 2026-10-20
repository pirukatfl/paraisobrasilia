---
phase: 05-recados-mensagens-e-contos
plan: 01
subsystem: contos-import-core
tags: [wordpress, sql-dump, lexical, html, import]
requires: []
provides:
  - src/lib/contos/wp-dump.ts (readWpTables, parseInsertValues, parseCreateTableColumns, extractContos, WpConto, WP_META_KEYS)
  - src/lib/contos/html-to-lexical.ts (htmlToLexical, decodeEntities)
  - tests/fixtures/wp-contos-mini.sql + tests/helpers/wp-dump-fixture.ts (synthetic dump, gzip at test time, chunked stream)
affects: [05-04]
tech-stack:
  added: []
  patterns: ["char-level SQL state machine that buffers only wanted INSERT/CREATE statements", "tolerant tag tokenizer instead of JSDOM"]
key-files:
  created:
    - src/lib/contos/wp-dump.ts
    - src/lib/contos/html-to-lexical.ts
    - tests/fixtures/wp-contos-mini.sql
    - tests/helpers/wp-dump-fixture.ts
    - tests/unit/wp-dump.test.ts
    - tests/unit/html-to-lexical.test.ts
key-decisions:
  - "Single-shortcode removal only for shortcodes with attributes or well-known names, so story text like [risos] survives"
  - "chunkedStream emits raw 7-byte Buffers so multi-byte characters (emoji) are split across chunks on purpose"
  - "Unknown or truncated dump syntax throws a pt error instead of silently dropping rows"
requirements-completed: [PAINEL-03]
duration: 25min
completed: 2026-10-20
---

# Phase 5 Plan 01: Import core (dump reader + HTML to Lexical) Summary

Streaming MariaDB dump reader (gzip, plain or Readable; chunk-safe) with a Contos extractor that never copies author data, plus a JSDOM-free WordPress/Elementor HTML to Lexical converter that emits text-bearing nodes only. Both proven on a synthetic fixture only; the real dump was never opened.

## Tasks
1. Fixture, reader and extractor - commit ac7dd4f (tests: 16 in wp-dump.test.ts)
2. HTML to Lexical - commit 3373c4b (10 tests in html-to-lexical.test.ts)
3. Acceptance-grep cleanup (comments only) - commit after ac7dd4f

## Deviations from Plan
- Tasks were committed as one commit each (tests + implementation together) instead of separate RED/GREEN commits; Task 2 was committed before Task 1 because wp-dump.ts imports decodeEntities from html-to-lexical.ts.
- Added a post_tag term with slug `contos` to the fixture to prove only taxonomy `category` counts.

## Known Stubs
None.

## Self-Check: PASSED
