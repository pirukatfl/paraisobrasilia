---
phase: 06-migra-o-do-wordpress
plan: 01
subsystem: auth
tags: [wordpress, bcrypt, phpass, password]
requires: []
provides:
  - "src/lib/assinantes/wp-password.ts: wpHashKind, verifyWpPassword, WP_PASSWORD_MAX"
affects: [06-05, 06-07]
tech-stack:
  added: [bcryptjs@3.0.3]
key-files:
  created: [src/lib/assinantes/wp-password.ts, tests/unit/wp-password.test.ts]
  modified: [package.json, pnpm-lock.yaml]
metrics:
  completed: 2026-10-21
---

# Phase 6 Plan 01: WordPress password verifier Summary

Pure verifier for `$wp$2y$` (bcrypt over base64 HMAC-SHA384) and `$P$` (phpass port) hashes, checked against the PHP-generated vectors of 06-RESEARCH.

## Commits
- 5310b87 test(06-01): failing tests (RED) + bcryptjs@3.0.3
- 790ffb8 feat(06-01): implementation (GREEN)

## Results
- 8 Vitest tests (all vectors, negatives, trim asymmetry, `$2b$` rewrite, malformed hashes, 4096-byte cap, wpHashKind). typecheck and lint clean.
- Module imports only node:crypto and bcryptjs; no logging (T-06-01..03).

## Deviations from Plan
None - plan executed exactly as written.

## Self-Check: PASSED
