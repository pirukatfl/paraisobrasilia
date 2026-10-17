import { describe, expect, it } from 'vitest'

import { AGE_COOKIE, AGE_COOKIE_MAX_AGE, buildAgeCookie, isAgeCookieValid } from '../../src/lib/age-gate/cookie'
import { getActiveVerifier } from '../../src/lib/age-gate/index'

describe('age gate cookie (INST-04)', () => {
  it('accepts only the value "1"', () => {
    expect(isAgeCookieValid('1')).toBe(true)
    expect(isAgeCookieValid(undefined)).toBe(false)
    expect(isAgeCookieValid('0')).toBe(false)
  })

  it('builds a 30-day first-party cookie', () => {
    expect(AGE_COOKIE).toBe('pb_age_ok')
    expect(AGE_COOKIE_MAX_AGE).toBe(2592000)
    const secure = buildAgeCookie({ secure: true })
    for (const part of ['pb_age_ok=1', 'Max-Age=2592000', 'Path=/', 'SameSite=Lax', 'Secure']) {
      expect(secure).toContain(part)
    }
    expect(buildAgeCookie({ secure: false })).not.toContain('Secure')
  })
})

describe('age verifier registry (swappable module)', () => {
  it('returns the self-declaration provider', () => {
    expect(getActiveVerifier('self-declaration').id).toBe('self-declaration')
  })

  it('throws for an unknown provider', () => {
    expect(() => getActiveVerifier('nope')).toThrow()
  })
})
