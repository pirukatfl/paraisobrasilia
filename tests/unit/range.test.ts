import { describe, expect, it } from 'vitest'

import { parseRange } from '../../src/lib/classisex/range'

describe('parseRange (iPhone video needs 206)', () => {
  it.each([
    [null, { type: 'full' }],
    ['bytes=0-9', { type: 'partial', start: 0, end: 9 }],
    ['bytes=90-', { type: 'partial', start: 90, end: 99 }],
    ['bytes=-10', { type: 'partial', start: 90, end: 99 }],
    ['bytes=0-999', { type: 'partial', start: 0, end: 99 }],
    ['bytes=100-', { type: 'invalid' }],
    ['bytes=5-2', { type: 'invalid' }],
    ['bytes=-0', { type: 'invalid' }],
    ['items=0-1', { type: 'full' }],
    ['bytes=0-1,5-6', { type: 'full' }],
    ['bytes=abc', { type: 'full' }],
  ] as const)('%s', (header, expected) => {
    expect(parseRange(header, 100)).toEqual(expected)
  })

  it('handles empty files', () => {
    expect(parseRange('bytes=0-', 0)).toEqual({ type: 'invalid' })
    expect(parseRange(null, 0)).toEqual({ type: 'full' })
  })
})
