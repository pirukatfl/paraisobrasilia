/** Date helpers for tests: Brasília is UTC-3 all year (no DST since 2019). */
const BRT_OFFSET_H = 3

/** ISO instant for `hh:mm` Brasília time, `days` calendar days after today's date in Brasília. */
export function brasiliaAt(days: number, hh: number, mm = 0, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return new Date(
    Date.UTC(get('year'), get('month') - 1, get('day') + days, hh + BRT_OFFSET_H, mm),
  ).toISOString()
}
