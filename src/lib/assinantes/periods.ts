/**
 * Subscription period rules (D-05, ASS-03, ASS-04). Pure: no Payload or Next imports, so the
 * same code runs on the server and in the admin panel preview (03-04).
 *
 * A period gives access while `startsAt <= now < endsAt`. `endsAt` is the São Paulo midnight
 * after the last valid day, so "válida até 17/11/2026" stops at 18/11/2026 00:00 (Brasília)
 * without any scheduled job. Containers run in UTC: every calendar decision goes through Intl
 * with the America/Sao_Paulo zone (Pitfall 4).
 */
import { formatUpdatedDate } from '../format/date'

const TZ = 'America/Sao_Paulo'
const DAY_MS = 86_400_000

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
// Brazil has had no DST since 2019; the offset is still read from Intl so a future change needs no code edit.
const offsetFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))

/** 'YYYY-MM-DD' of an instant in São Paulo. */
export function spDate(instant: Date): string {
  return dateFmt.format(instant)
}

/** Offset of São Paulo at an instant, in minutes (e.g. −180). */
function offsetMinutes(instant: Date): number {
  const name = offsetFmt.formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name)
  if (!m) return 0
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0)
  return m[1] === '-' ? -minutes : minutes
}

const parseDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Instant of 00:00 in São Paulo on that calendar date. */
export function spMidnight(date: string): Date {
  const utcMidnight = parseDate(date)
  let instant = utcMidnight - offsetMinutes(new Date(utcMidnight)) * 60_000
  // Re-check with the offset at the computed instant (only matters around an offset change)
  instant = utcMidnight - offsetMinutes(new Date(instant)) * 60_000
  return new Date(instant)
}

export function addDaysToDate(date: string, days: number): string {
  return new Date(parseDate(date) + days * DAY_MS).toISOString().slice(0, 10)
}

/**
 * Window of a grant or renewal: starts now, or at the current end while access is still valid;
 * ends at the São Paulo midnight `durationDays` calendar days after the start date
 * (30 days counting today). The server always recomputes this with its own clock (T-03-15).
 */
export function renewalWindow({
  now,
  currentAccessUntil,
  durationDays,
}: {
  now: Date
  currentAccessUntil: Date | null
  durationDays: number
}): { startsAt: Date; endsAt: Date; renewing: boolean } {
  const renewing = Boolean(currentAccessUntil && currentAccessUntil.getTime() > now.getTime())
  const startsAt = renewing ? (currentAccessUntil as Date) : now
  // A non-midnight end (e.g. imported) floors to its São Paulo date: never shortens access
  const endsAt = spMidnight(addDaysToDate(spDate(startsAt), durationDays))
  return { startsAt, endsAt, renewing }
}

export type PeriodLike = {
  startsAt: string | Date
  endsAt: string | Date
  status?: 'ativa' | 'encerrada' | null
}

export function isPeriodActive(p: PeriodLike, now: Date): boolean {
  if (p.status === 'encerrada') return false
  const t = now.getTime()
  return toDate(p.startsAt).getTime() <= t && t < toDate(p.endsAt).getTime()
}

/** Latest end among periods not ended by staff (null when none). */
export function accessUntilOf(periods: PeriodLike[]): Date | null {
  let max: number | null = null
  for (const p of periods) {
    if (p.status === 'encerrada') continue
    const end = toDate(p.endsAt).getTime()
    if (max === null || end > max) max = end
  }
  return max === null ? null : new Date(max)
}

/** Last valid day in words: endsAt 18/11 00:00 → '17 de novembro de 2026'. */
export function validUntilLabel(endsAt: Date | string): string {
  return formatUpdatedDate(new Date(toDate(endsAt).getTime() - 1).toISOString())
}

/** São Paulo calendar days from today through the last valid day (1 on the last day, never negative). */
export function daysLeft(endsAt: Date | string, now: Date): number {
  const lastDay = spDate(new Date(toDate(endsAt).getTime() - 1))
  const diff = Math.round((parseDate(lastDay) - parseDate(spDate(now))) / DAY_MS) + 1
  return Math.max(0, diff)
}
