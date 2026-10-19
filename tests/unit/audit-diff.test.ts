import { describe, expect, it } from 'vitest'

import { diffForAudit } from '../../src/lib/assinantes/audit'

describe('diffForAudit (T-03-10: no secrets in the log)', () => {
  it('keeps changed fields only and drops secrets', () => {
    expect(
      diffForAudit(
        { name: 'A', password: 'x', hash: 'h', salt: 's', email: 'a@x', updatedAt: '1' },
        { name: 'B', password: 'y', hash: 'h2', salt: 's2', email: 'a@x', updatedAt: '2' },
      ),
    ).toEqual({ name: { de: 'A', para: 'B' } })
  })

  it('lists every non-secret field when there is no previous version', () => {
    expect(
      diffForAudit(null, {
        name: 'A',
        email: 'a@x',
        password: 'x',
        sessions: [{ id: '1' }],
        resetPasswordToken: 't',
        loginAttempts: 0,
        id: 3,
      }),
    ).toEqual({ name: { de: null, para: 'A' }, email: { de: null, para: 'a@x' } })
  })

  it('skips joins and reports staff notes without their content', () => {
    expect(
      diffForAudit(
        { name: 'A', staffNotes: 'antiga', periodos: { docs: [] }, historico: { docs: [] } },
        { name: 'A', staffNotes: 'nova com dados', periodos: { docs: [1] }, historico: { docs: [2] } },
      ),
    ).toEqual({ staffNotes: 'alterada' })
  })

  it('treats null, undefined and empty string as the same empty value', () => {
    expect(diffForAudit({ whatsapp: null }, { whatsapp: '' })).toEqual({})
  })
})
