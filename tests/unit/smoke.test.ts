import { describe, expect, it } from 'vitest'

describe('test harness', () => {
  it('runs with Intl time zone support', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBeDefined()
  })
})
