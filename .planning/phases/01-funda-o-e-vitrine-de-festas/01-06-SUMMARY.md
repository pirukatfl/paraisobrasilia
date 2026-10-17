---
phase: 01-funda-o-e-vitrine-de-festas
plan: 06
subsystem: ui
tags: [age-gate, eca-digital, accessibility, client-island, cookie]

# Dependency graph
requires:
  - phase: 01-03
    provides: Playwright harness
  - phase: 01-04
    provides: root layout, tokens, logo assets
provides:
  - src/lib/age-gate/cookie.ts (AGE_COOKIE, AGE_COOKIE_MAX_AGE, isAgeCookieValid, buildAgeCookie, readAgeCookie)
  - src/lib/age-gate/index.ts (AgeVerifier, getActiveVerifier — registry keyed by NEXT_PUBLIC_AGE_GATE_PROVIDER)
  - src/lib/age-gate/self-declaration.tsx (click-through Prompt with UI-SPEC copy)
  - src/lib/age-gate/AgeGate.tsx (overlay, focus trap, scroll lock, 150 ms fade, reduced-motion aware)
  - src/lib/age-gate/head-script.ts (AGE_HEAD_SCRIPT, 113 bytes)
  - Layout wiring (<AgeGate /> first in body, head script, suppressHydrationWarning on <html>)
affects: [01-07, 01-08, 01-09, 01-10, phase-7 launch (legal opinion)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Overlay always in SSR HTML; `html[data-age-ok] [data-age-gate]{display:none}` style owned by the component"
    - "Cookie read client-side only so public pages stay static"

key-files:
  created:
    - src/lib/age-gate/cookie.ts
    - src/lib/age-gate/index.ts
    - src/lib/age-gate/self-declaration.tsx
    - src/lib/age-gate/AgeGate.tsx
    - src/lib/age-gate/head-script.ts
    - tests/unit/age-gate.test.ts
    - tests/e2e/age-gate.spec.ts
  modified:
    - src/app/(frontend)/layout.tsx
    - .env.example

key-decisions:
  - "Returning visitors: the effect only sets data-age-ok (no setState) — CSS hides the overlay; avoids the react-hooks/set-state-in-effect lint error"
  - "<html suppressHydrationWarning> because the head script adds data-age-ok before hydration"
  - "Gate logo uses mix-blend-lighten so its #0B0908 box disappears on the #17120F dialog panel"
  - "Escape is swallowed while the gate is open (UI-SPEC: decision must be explicit)"

patterns-established:
  - "New verifier = new file exporting an AgeVerifier + one registry line + env var; pages untouched"

requirements-completed: [INST-04]

# Metrics
duration: 3min
completed: 2026-10-17
---

# Phase 1 Plan 06: Swappable 18+ age gate Summary

**Self-declaration 18+ overlay as a swappable module: always present in the SSR HTML over the complete page, hidden before paint for returning visitors by a 113-byte head script, remembered for 30 days in a `pb_age_ok=1` cookie, with focus trap, scroll lock and no redirect or browser sniffing.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-17T20:32:11Z
- **Completed:** 2026-10-17T20:34:37Z
- **Tasks:** 2
- **Files modified:** 9

## Task Commits

1. **Task 1: Age-gate e2e + unit tests, cookie helpers and provider interface** - `613cf30` (test)
2. **Task 2: Self-declaration overlay, head script and layout wiring** - `2f42067` (feat), `1c8aa66` (fix: comment reworded for the grep criterion)

## Verification

| Check | Result |
|---|---|
| `vitest run tests/unit/age-gate.test.ts` | 4 passed |
| `playwright test tests/e2e/age-gate.spec.ts` | 6 passed (mobile + desktop) |
| `playwright test tests/e2e/home.spec.ts tests/e2e/shell.spec.ts` | 8 passed |
| `curl -s localhost:3000/` contains gate heading / og:site_name | 1 / 1 |
| cookie.ts contains pb_age_ok and 2592000 | PASS |
| `grep -rn "redirect(" src/lib/age-gate`, `grep -rni "user-agent" src/lib/age-gate` | empty PASS |
| layout.tsx has `<AgeGate` and `AGE_HEAD_SCRIPT` | PASS |
| self-declaration.tsx exact copy strings | PASS |
| `pnpm typecheck`, `pnpm lint` | exit 0 |
| Visual (390px screenshot, scratchpad) | dark blurred backdrop, logo, Josefin heading, full-width orange button, muted "Sair do site" |

## Deviations from Plan

**1. [Rule 1] Lint error `set-state-in-effect`** — returning-visitor branch no longer calls setState; CSS keeps the overlay hidden.

**2. [Rule 1] Acceptance grep matched a doc comment ("no user-agent checks")** — reworded (`1c8aa66`).

**3. [Rule 2] `readAgeCookie` helper** added to cookie.ts (parses `document.cookie`); `.env` (local, untracked) also got NEXT_PUBLIC_AGE_GATE_PROVIDER.

## Issues Encountered

- Legal status unchanged: self-declaration is a staging-only answer until the ECA Digital opinion (docs/discovery/AGE-GATE-LEGAL.md); production launch stays gated (Phase 7).

## Next Phase Readiness

- Every non-gate e2e must keep setting `pb_age_ok=1` before navigation.

## Self-Check: PASSED

---
*Phase: 01-funda-o-e-vitrine-de-festas*
*Completed: 2026-10-17*
