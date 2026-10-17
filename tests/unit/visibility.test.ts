import { describe, expect, it } from 'vitest'

import { defaultEndsAt, isUpcoming, PARTY_DEFAULT_DURATION_H } from '../../src/lib/parties/visibility'

describe('party visibility (FEST-04)', () => {
  it('is upcoming one second before it ends', () => {
    expect(isUpcoming({ endsAt: '2026-10-25T12:00:00.000Z' }, new Date('2026-10-25T11:59:59.000Z'))).toBe(true)
  })

  it('is hidden exactly when it ends', () => {
    expect(isUpcoming({ endsAt: '2026-10-25T12:00:00.000Z' }, new Date('2026-10-25T12:00:00.000Z'))).toBe(false)
  })

  it('defaults the end to 10 hours after the start (24/10 23:00 Brasília → 25/10 09:00)', () => {
    expect(PARTY_DEFAULT_DURATION_H).toBe(10)
    expect(defaultEndsAt(new Date('2026-10-25T02:00:00.000Z')).toISOString()).toBe('2026-10-25T12:00:00.000Z')
  })
})
