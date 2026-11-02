/** Time-based party visibility (FEST-04). Pure functions: no Payload, no Next imports. */
export const PARTY_DEFAULT_DURATION_H = 10

const HOUR_MS = 3_600_000

/** End used when staff leave "Data e hora de término" empty. */
export function defaultEndsAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() + PARTY_DEFAULT_DURATION_H * HOUR_MS)
}

/** A party is upcoming (shown on the home page) until the instant it ends. */
export function isUpcoming(p: { endsAt: string }, now: Date = new Date()): boolean {
  return new Date(p.endsAt).getTime() > now.getTime()
}

/**
 * The end time is shown on the party page only when staff filled it in. An end equal to the
 * automatic one (`defaultEndsAt`) means the field was left empty, so only the start is shown.
 */
export function hasCustomEnd(p: { startsAt: string; endsAt: string }): boolean {
  const start = new Date(p.startsAt).getTime()
  const end = new Date(p.endsAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  return end !== defaultEndsAt(new Date(start)).getTime()
}
