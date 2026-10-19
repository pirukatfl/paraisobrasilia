// Prove independence from the server zone: the container runs in UTC.
process.env.TZ = 'UTC'

import { describe, expect, it } from 'vitest'

import {
  accessUntilOf,
  addDaysToDate,
  daysLeft,
  isPeriodActive,
  renewalWindow,
  spDate,
  spMidnight,
  validUntilLabel,
} from '../../src/lib/assinantes/periods'
import { formatShortDate } from '../../src/lib/format/date'

const d = (iso: string) => new Date(iso)

describe('São Paulo calendar helpers (Pitfall 4)', () => {
  it('spDate uses the Brasília date at 23:30 BRT (02:30 UTC next day)', () => {
    expect(spDate(d('2026-10-20T02:30:00Z'))).toBe('2026-10-19')
    expect(spDate(d('2026-10-20T03:00:00Z'))).toBe('2026-10-20')
  })
  it('spMidnight is 03:00 UTC', () => {
    expect(spMidnight('2026-11-18').toISOString()).toBe('2026-11-18T03:00:00.000Z')
  })
  it('addDaysToDate crosses months and years', () => {
    expect(addDaysToDate('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDaysToDate('2026-02-27', 2)).toBe('2026-03-01')
  })
})

describe('renewalWindow (D-05)', () => {
  it('first grant: 30 days counting today, ends at the São Paulo midnight', () => {
    const now = d('2026-10-19T18:00:00Z')
    const w = renewalWindow({ now, currentAccessUntil: null, durationDays: 30 })
    expect(w.startsAt.toISOString()).toBe(now.toISOString())
    expect(w.endsAt.toISOString()).toBe('2026-11-18T03:00:00.000Z')
    expect(w.renewing).toBe(false)
  })
  it('renewal while active starts at the current end', () => {
    const w = renewalWindow({
      now: d('2026-11-10T15:00:00Z'),
      currentAccessUntil: d('2026-11-18T03:00:00Z'),
      durationDays: 30,
    })
    expect(w.startsAt.toISOString()).toBe('2026-11-18T03:00:00.000Z')
    expect(w.endsAt.toISOString()).toBe('2026-12-18T03:00:00.000Z')
    expect(w.renewing).toBe(true)
  })
  it('an end in the past behaves as no access', () => {
    const now = d('2026-12-01T15:00:00Z')
    const w = renewalWindow({ now, currentAccessUntil: d('2026-11-18T03:00:00Z'), durationDays: 30 })
    expect(w.startsAt.toISOString()).toBe(now.toISOString())
    expect(w.endsAt.toISOString()).toBe('2026-12-31T03:00:00.000Z')
    expect(w.renewing).toBe(false)
  })
  it('a non-midnight imported end floors to its São Paulo date (never shortens access)', () => {
    const w = renewalWindow({
      now: d('2026-11-10T15:00:00Z'),
      currentAccessUntil: d('2026-11-18T18:00:00Z'),
      durationDays: 30,
    })
    expect(w.endsAt.toISOString()).toBe('2026-12-18T03:00:00.000Z')
  })
})

describe('isPeriodActive / accessUntilOf (ASS-04)', () => {
  const p = { startsAt: '2026-10-19T18:00:00Z', endsAt: '2026-11-18T03:00:00Z', status: 'ativa' as const }
  it('is active from start until just before the end', () => {
    expect(isPeriodActive(p, d('2026-10-19T18:00:00Z'))).toBe(true)
    expect(isPeriodActive(p, d('2026-11-18T02:59:59.999Z'))).toBe(true)
    expect(isPeriodActive(p, d('2026-11-18T03:00:00Z'))).toBe(false)
    expect(isPeriodActive(p, d('2026-10-19T17:59:59Z'))).toBe(false)
    expect(isPeriodActive({ ...p, status: 'encerrada' }, d('2026-10-20T12:00:00Z'))).toBe(false)
  })
  it('accessUntilOf ignores ended periods and picks the latest end', () => {
    expect(accessUntilOf([])).toBeNull()
    expect(
      accessUntilOf([
        p,
        { startsAt: '2026-11-18T03:00:00Z', endsAt: '2026-12-18T03:00:00Z', status: 'ativa' },
        { startsAt: '2026-12-18T03:00:00Z', endsAt: '2027-12-18T03:00:00Z', status: 'encerrada' },
      ])?.toISOString(),
    ).toBe('2026-12-18T03:00:00.000Z')
    expect(accessUntilOf([{ ...p, status: 'encerrada' }])).toBeNull()
  })
})

describe('labels', () => {
  it('validUntilLabel is the last valid day (end − 1 ms)', () => {
    expect(validUntilLabel('2026-11-18T03:00:00Z')).toBe('17 de novembro de 2026')
  })
  it('formatShortDate is dd/MM/yyyy in Brasília', () => {
    expect(formatShortDate(new Date(Date.parse('2026-11-18T03:00:00Z') - 1).toISOString())).toBe('17/11/2026')
  })
  it('daysLeft counts the last day as 1', () => {
    expect(daysLeft('2026-11-18T03:00:00Z', d('2026-11-17T12:00:00Z'))).toBe(1)
    expect(daysLeft('2026-11-18T03:00:00Z', d('2026-11-10T12:00:00Z'))).toBe(8)
  })
})
