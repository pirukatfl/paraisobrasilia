import { describe, expect, it } from 'vitest'

import { hiddenCount, visibleCount } from '../../src/lib/gallery/limit'

describe('gallery limit', () => {
  it('shows everything without a limit', () => {
    expect(visibleCount(12)).toBe(12)
    expect(hiddenCount(12)).toBe(0)
  })
  it('caps at the limit', () => {
    expect(visibleCount(12, 4)).toBe(4)
    expect(hiddenCount(12, 4)).toBe(8)
  })
  it('hides nothing when items fit', () => {
    expect(visibleCount(3, 4)).toBe(3)
    expect(hiddenCount(4, 4)).toBe(0)
  })
  it('ignores invalid limits', () => {
    expect(visibleCount(5, 0)).toBe(5)
    expect(visibleCount(5, Number.NaN)).toBe(5)
  })
})
