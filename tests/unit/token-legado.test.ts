import { describe, expect, it } from 'vitest'

import { tokenLegadoDeAssinante } from '../../src/lib/assinantes/legacy-token'

const jwt = (claims: object) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`

describe('tokenLegadoDeAssinante', () => {
  it('detects a subscriber JWT in the staff cookie', () => {
    expect(tokenLegadoDeAssinante(`a=1; payload-token=${jwt({ collection: 'assinantes', id: 3 })}`)).toBe(true)
  })
  it('leaves a staff token alone', () => {
    expect(tokenLegadoDeAssinante(`payload-token=${jwt({ collection: 'users', id: 1 })}`)).toBe(false)
  })
  it('ignores missing or malformed cookies', () => {
    expect(tokenLegadoDeAssinante(null)).toBe(false)
    expect(tokenLegadoDeAssinante('payload-token=lixo')).toBe(false)
    expect(tokenLegadoDeAssinante('paraiso-assinante=' + jwt({ collection: 'assinantes' }))).toBe(false)
  })
})
