/**
 * Party dates for visitors: always pt-BR in Brasília time, whatever the server zone
 * (containers run in UTC — RESEARCH Pitfall 2).
 */
const TZ = 'America/Sao_Paulo'

const longFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})
const shortFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})
const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type Parts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>

function parts(fmt: Intl.DateTimeFormat, iso: string): Parts {
  const out: Parts = {}
  for (const p of fmt.formatToParts(new Date(iso))) out[p.type] = p.value
  return out
}

const clean = (s = '') => s.replace(/\.$/, '')
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Sábado, 24 de outubro" */
export function formatPartyDate(iso: string): string {
  const p = parts(longFmt, iso)
  return `${capitalize(clean(p.weekday))}, ${p.day} de ${clean(p.month)}`
}

/** "23h", or "23h30" when minutes are not zero */
export function formatPartyTime(iso: string): string {
  const p = parts(timeFmt, iso)
  return p.minute === '00' ? `${p.hour}h` : `${p.hour}h${p.minute}`
}

/** "Sáb, 24 out · 23h" */
export function formatCardDate(iso: string): string {
  const p = parts(shortFmt, iso)
  return `${capitalize(clean(p.weekday))}, ${p.day} ${clean(p.month)} · ${formatPartyTime(iso)}`
}

const updatedFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "19 de outubro de 2026" — "Atualizado em …" on legal pages (Brasília time). */
export function formatUpdatedDate(iso: string): string {
  const p = parts(updatedFmt, iso)
  return `${p.day} de ${clean(p.month)} de ${p.year}`
}
