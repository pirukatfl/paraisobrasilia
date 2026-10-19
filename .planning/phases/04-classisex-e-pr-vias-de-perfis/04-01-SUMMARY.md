---
phase: 04-classisex-e-pr-vias-de-perfis
plan: 01
subsystem: classisex
tags: [redaction, mp4, privacy, pure-modules, tdd]

requires: []
provides:
  - redactContacts(text) → { text, removed } and REDACTED_LABEL in src/lib/classisex/redact.ts
  - readMp4Info(buf), scrubMp4Metadata(buf), Mp4Error, MAX_VIDEO_SECONDS in src/lib/classisex/mp4.ts
  - buildMp4/box/largeBox/openBox fixture builders in tests/helpers/mp4-fixtures.ts
affects: [04-03 (moderation panel shows redacted text), 04-05 (ad-media hooks), 04-07 (public DTO)]

tech-stack:
  added: []
  patterns:
    - "Contact redaction order: e-mails → URLs (scheme, www, bare TLD domains) → keyword handles → @handles → 8+ digit phone runs; labels collapse; untouched text is returned byte-identical"
    - "MP4 metadata scrub rewrites udta/meta to zero-filled 'free' boxes of the same size (offsets in stco/co64 stay valid)"

key-files:
  created:
    - src/lib/classisex/redact.ts
    - src/lib/classisex/mp4.ts
    - tests/unit/redact-contacts.test.ts
    - tests/unit/mp4.test.ts
    - tests/helpers/mp4-fixtures.ts
  modified: []

key-decisions:
  - "Keyword handles (insta/tg/zap/whats…) skip common Portuguese stopwords as the following token, so 'no zap e no insta' is not redacted"
  - "Whitespace normalisation only runs when something was removed, so clean text is never altered"
  - "majorBrand is trimmed ('qt  ' → 'qt')"

patterns-established:
  - "Pure classisex modules live in src/lib/classisex with no Payload/Next imports and table-driven tests"

requirements-completed: []

duration: 12min
completed: 2026-10-19
---

# Phase 4 Plan 01: Redaction and MP4 rules Summary

**Two pure, tested modules: `redactContacts` removes phones, e-mails (also "arroba … ponto com"), links and handles from ad text for the public preview, and `mp4.ts` reads MP4/MOV duration and zero-fills location metadata without ffmpeg.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 (TDD, 4 commits)
- **Files:** 5 created

## Accomplishments
- 39 redaction cases (phones in 7 formats, 5 e-mail forms, 7 link forms, 7 handle forms, kept short numbers, collapse, idempotence, < 50 ms on 600 chars)
- 13 MP4 cases: v0/v1 mvhd, MOV brand, real `espaco.mp4`, largesize/size-0 boxes, garbage/JPEG/overrun/no-moov refused with the pt message, location scrub keeps length, duration and mdat bytes

## Task Commits
1. Task 1 RED `1f9dbcb` test(04-01): failing table test for contact redaction
2. Task 1 GREEN `d6b39ad` feat(04-01): server-side contact redaction
3. Task 2 RED `afc092f` test(04-01): failing MP4 duration and scrub tests
4. Task 2 GREEN `ce7e7c0` feat(04-01): MP4/MOV duration and location scrub

## Deviations from Plan
None - plan executed exactly as written. (`requirements-completed` left empty: PREV-01/CLAS-03/CLAS-06 are only satisfied once later plans wire these modules in.)

## TDD Gate Compliance
RED and GREEN commits exist for both tasks.

## Self-Check: PASSED
