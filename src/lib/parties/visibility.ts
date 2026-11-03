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

export const FIM_ANTES_DO_INICIO =
  'A data e hora de término precisa ser depois do início. Confira as duas datas (ou deixe o término vazio para usar início + 10 horas).'

/**
 * Validation for "Data e hora de término": empty is fine (the automatic end is filled in), otherwise
 * it must be strictly after the start. A party whose end is before its start never shows on the home
 * page, which is how staff lost parties from the agenda (client report 2026-11-03).
 */
export function validateEndsAt(endsAt: unknown, startsAt: unknown): true | string {
  if (endsAt === null || endsAt === undefined || endsAt === '') return true
  const end = new Date(endsAt as string | Date).getTime()
  const start = new Date(startsAt as string | Date).getTime()
  if (Number.isNaN(end) || Number.isNaN(start)) return true // the date fields' own checks handle bad input
  return end > start ? true : FIM_ANTES_DO_INICIO
}
