import { describe, expect, it } from 'vitest'

import { CARD_MIN_RATIO, flyerBoxRatio, flyerRatio } from '@/lib/parties/flyer-frame'

describe('flyer frame ratio', () => {
  it('uses the real proportion of the uploaded flyer', () => {
    expect(flyerRatio({ width: 1600, height: 900 })).toBeCloseTo(16 / 9)
    expect(flyerBoxRatio({ width: 1600, height: 900 })).toBeCloseTo(16 / 9) // landscape: not cropped to 4:5
    expect(flyerBoxRatio({ width: 1080, height: 1080 })).toBe(1)
    expect(flyerBoxRatio({ width: 1080, height: 1350 })).toBeCloseTo(0.8)
  })
  it('caps very tall flyers in cards (stories 9:16 are letterboxed)', () => {
    expect(flyerBoxRatio({ width: 1080, height: 1920 })).toBe(CARD_MIN_RATIO)
    expect(flyerBoxRatio({ width: 1080, height: 1920 }, 0)).toBeCloseTo(9 / 16)
  })
  it('falls back to 4:5 on unusable dimensions', () => {
    expect(flyerRatio({ width: 0, height: 0 })).toBeCloseTo(0.8)
  })
})
