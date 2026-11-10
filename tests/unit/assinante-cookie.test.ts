import { describe, expect, it } from 'vitest'

import { headersDoAssinante } from '../../src/lib/assinantes/cookie'

describe('headersDoAssinante', () => {
  it('returns null without the subscriber cookie, even with a staff token', () => {
    expect(headersDoAssinante(new Headers({ cookie: 'payload-token=staff' }), 'payload')).toBeNull()
  })

  it('puts the subscriber token where Payload looks and drops the staff token', () => {
    const h = headersDoAssinante(new Headers({ cookie: 'a=1; payload-token=staff; paraiso-assinante=sub' }), 'payload')
    expect(h?.get('cookie')).toBe('a=1; payload-token=sub')
    expect(h?.get('DisableAutologin')).toBe('true')
  })
})
