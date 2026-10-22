import { describe, expect, it } from 'vitest'

import { AUTO_ADVANCE_MS, indexFromScroll, shouldAutoplay, slideLabel, stepIndex } from '@/lib/parties/carousel'

describe('party carousel helpers', () => {
  it('advances every ~6 seconds', () => {
    expect(AUTO_ADVANCE_MS).toBe(6000)
  })
  it('steps and wraps around both ends', () => {
    expect(stepIndex(0, 3, 1)).toBe(1)
    expect(stepIndex(2, 3, 1)).toBe(0)
    expect(stepIndex(0, 3, -1)).toBe(2)
    expect(stepIndex(0, 0, 1)).toBe(0)
  })
  it('maps the scroll position to the nearest slide, clamped', () => {
    expect(indexFromScroll(0, 800, 3)).toBe(0)
    expect(indexFromScroll(390, 800, 3)).toBe(0)
    expect(indexFromScroll(410, 800, 3)).toBe(1)
    expect(indexFromScroll(5000, 800, 3)).toBe(2)
    expect(indexFromScroll(-20, 800, 3)).toBe(0)
    expect(indexFromScroll(100, 0, 3)).toBe(0)
  })
  it('labels slides in Portuguese order "n de total: título"', () => {
    expect(slideLabel(2, 5, 'Festa X')).toBe('2 de 5: Festa X')
  })
  it('autoplays only with several slides and nothing pausing it', () => {
    const base = { total: 3, reducedMotion: false, paused: false, userStopped: false }
    expect(shouldAutoplay(base)).toBe(true)
    expect(shouldAutoplay({ ...base, total: 1 })).toBe(false)
    expect(shouldAutoplay({ ...base, reducedMotion: true })).toBe(false)
    expect(shouldAutoplay({ ...base, paused: true })).toBe(false)
    expect(shouldAutoplay({ ...base, userStopped: true })).toBe(false)
  })
})
