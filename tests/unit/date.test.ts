// Prove independence from the server zone: the container runs in UTC.
process.env.TZ = 'UTC'

import { describe, expect, it } from 'vitest'

import { formatCardDate, formatPartyDate, formatPartyTime, formatUpdatedDate } from '../../src/lib/format/date'

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

describe('legal pages updated date (INST-06)', () => {
  it('formats "19 de outubro de 2026" in Brasília time', () => {
    expect(formatUpdatedDate('2026-10-19T15:00:00Z')).toBe('19 de outubro de 2026')
    // 02:00Z on the 20th is still the 19th in Brasília
    expect(formatUpdatedDate('2026-10-20T02:00:00Z')).toBe('19 de outubro de 2026')
  })
})
