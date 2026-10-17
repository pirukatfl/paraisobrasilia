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
