import { describe, expect, it } from 'vitest'

import { FIM_ANTES_DO_INICIO, validateEndsAt } from '../../src/lib/parties/visibility'

describe('validateEndsAt (término depois do início)', () => {
  const start = '2026-11-07T01:00:00.000Z'

  it('accepts an empty end (the automatic end is used)', () => {
    expect(validateEndsAt(undefined, start)).toBe(true)
    expect(validateEndsAt(null, start)).toBe(true)
    expect(validateEndsAt('', start)).toBe(true)
  })

  it('accepts an end after the start', () => {
    expect(validateEndsAt('2026-11-07T08:00:00.000Z', start)).toBe(true)
  })

  it('rejects an end before the start', () => {
    expect(validateEndsAt('2026-11-06T08:00:00.000Z', start)).toBe(FIM_ANTES_DO_INICIO)
  })

  it('rejects an end equal to the start', () => {
    expect(validateEndsAt(start, start)).toBe(FIM_ANTES_DO_INICIO)
  })

  it('leaves invalid or missing dates to the fields own checks', () => {
    expect(validateEndsAt('2026-11-06T08:00:00.000Z', undefined)).toBe(true)
    expect(validateEndsAt('not a date', start)).toBe(true)
  })
})
