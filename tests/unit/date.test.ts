// Prove independence from the server zone: the container runs in UTC.
process.env.TZ = 'UTC'

import { describe, expect, it } from 'vitest'

import { formatCardDate, formatPartyDate, formatPartyTime } from '../../src/lib/format/date'

// 2026-10-25T02:00Z = sábado 24/10 às 23:00 em Brasília
describe('party dates in Brasília time (pt-BR)', () => {
  it('formats the long date in Brasília even when the UTC date is the next day', () => {
    expect(formatPartyDate('2026-10-25T02:00:00.000Z')).toBe('Sábado, 24 de outubro')
  })

  it('formats the start time as 23h / 23h30', () => {
    expect(formatPartyTime('2026-10-25T02:00:00.000Z')).toBe('23h')
    expect(formatPartyTime('2026-10-25T02:30:00.000Z')).toBe('23h30')
  })

  it('formats the card line', () => {
    expect(formatCardDate('2026-10-25T02:00:00.000Z')).toBe('Sáb, 24 out · 23h')
  })
})
