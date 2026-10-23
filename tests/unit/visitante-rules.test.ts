import { describe, expect, it } from 'vitest'

import { VISITANTE_LIMITS, TIER_LIMITS } from '../../src/lib/assinantes/tier'
import {
  ACTIVE_LIMIT,
  EMAIL_MAX,
  VISITOR_MESSAGES,
  normaliseVisitorEmail,
  validateVisitorExtras,
} from '../../src/lib/classisex/rules'

describe('ad sent without an account: extras (S-02, S-05)', () => {
  const ok = { email: 'Pessoa@Exemplo.com', termos: true }

  it('accepts a valid e-mail and terms', () => {
    expect(validateVisitorExtras(ok)).toEqual({})
  })

  it('lower-cases and strips spaces when normalising', () => {
    expect(normaliseVisitorEmail('  Pessoa@Exemplo.COM ')).toBe('pessoa@exemplo.com')
    expect(normaliseVisitorEmail(undefined)).toBe('')
  })

  it('the e-mail is optional', () => {
    expect(validateVisitorExtras({ ...ok, email: '' })).toEqual({})
    expect(validateVisitorExtras({ ...ok, email: '   ' })).toEqual({})
  })

  it.each(['sem-arroba', 'a@b', '@x.com', `${'a'.repeat(EMAIL_MAX)}@b.co`])(
    'refuses the e-mail %j',
    (email) => {
      expect(validateVisitorExtras({ ...ok, email }).email).toBe(VISITOR_MESSAGES.email)
    },
  )

  it('requires the terms', () => {
    expect(validateVisitorExtras({ ...ok, termos: false })).toEqual({ termos: VISITOR_MESSAGES.termos })
  })

  it('limits: one photo, no video, 3 active ads (same as a free account)', () => {
    expect(VISITANTE_LIMITS).toEqual({ fotos: 1, videos: 0, anunciosAtivos: ACTIVE_LIMIT })
    expect(VISITANTE_LIMITS).toEqual(TIER_LIMITS.gratis)
  })
})
