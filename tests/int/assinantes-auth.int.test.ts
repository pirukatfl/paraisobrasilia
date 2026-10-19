import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, seedAssinante, seedStaffUser } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i

function decodeJwt(token: string): { exp: number; iat: number; collection: string } {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
}

describe('assinantes auth collection (ASS-01, D-01, T-03-02/03/04/07)', () => {
  let payload: Payload
  let staff: Record<string, unknown> & { collection: 'users' }

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-auth@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  it('anonymous callers cannot create accounts, even when the collection is empty', async () => {
    await expect(
      payload.create({
        collection: 'assinantes',
        overrideAccess: false,
        data: { email: 'anon@teste.local', password: 'senha-anonima-1', name: 'Anon' },
      }),
    ).rejects.toThrow(DENIED)
    // first-register calls create with overrideAccess: true and no user
    await expect(
      payload.create({
        collection: 'assinantes',
        overrideAccess: true,
        data: { email: 'first@teste.local', password: 'senha-primeira-1', name: 'First' },
      }),
    ).rejects.toThrow(DENIED)
    const { totalDocs } = await payload.count({ collection: 'assinantes' })
    expect(totalDocs).toBe(0)
  })

  it('staff-created accounts carry a temporary password flag (D-04)', async () => {
    const doc = await payload.create({
      collection: 'assinantes',
      overrideAccess: false,
      user: staff as never,
      data: { email: 'novo@teste.local', password: 'senha-provisoria-1', name: 'Novo Assinante' },
    })
    expect(doc.mustChangePassword).toBe(true)
  })

  it('rejects passwords shorter than 8 characters', async () => {
    await expect(
      payload.create({
        collection: 'assinantes',
        overrideAccess: false,
        user: staff as never,
        data: { email: 'curta@teste.local', password: 'abc123', name: 'Curta' },
      }),
    ).rejects.toThrow('A senha precisa ter pelo menos 8 caracteres.')
  })

  it('public forgot-password is blocked', async () => {
    await seedAssinante(payload, { email: 'esqueci@teste.local', password: 'senha-esqueci-1', name: 'Esqueci' })
    await expect(
      payload.forgotPassword({ collection: 'assinantes', data: { email: 'esqueci@teste.local' }, disableEmail: true }),
    ).rejects.toThrow(DENIED)
  })

  it('login issues a 30-day token', async () => {
    await seedAssinante(payload, { email: 'login@teste.local', password: 'senha-login-123', name: 'Login' })
    const result = await payload.login({
      collection: 'assinantes',
      data: { email: 'login@teste.local', password: 'senha-login-123' },
    })
    expect(result.token).toBeTruthy()
    const claims = decodeJwt(result.token!)
    expect(claims.exp - claims.iat).toBe(2_592_000)
    expect(claims.collection).toBe('assinantes')
  })

  it('locks the account after 5 wrong passwords', async () => {
    await seedAssinante(payload, { email: 'trava@teste.local', password: 'senha-trava-123', name: 'Trava' })
    for (let i = 0; i < 5; i++) {
      await expect(
        payload.login({ collection: 'assinantes', data: { email: 'trava@teste.local', password: 'errada-' + i } }),
      ).rejects.toThrow()
    }
    await expect(
      payload.login({ collection: 'assinantes', data: { email: 'trava@teste.local', password: 'senha-trava-123' } }),
    ).rejects.toMatchObject({ name: 'LockedAuth' })
  })

  it('a subscriber reads only its own document and never staff notes', async () => {
    const me = await seedAssinante(payload, { email: 'eu@teste.local', password: 'senha-eu-12345', name: 'Eu' })
    await payload.update({
      collection: 'assinantes',
      id: me.id,
      data: { staffNotes: 'Pagou em dinheiro' },
      overrideAccess: true,
      context: { skipAudit: true },
    })
    const principal = { ...(me as unknown as Record<string, unknown>), collection: 'assinantes' }
    const { docs } = await payload.find({ collection: 'assinantes', overrideAccess: false, user: principal as never })
    expect(docs.map((d) => d.email)).toEqual(['eu@teste.local'])
    expect(docs[0]).not.toHaveProperty('staffNotes')

    const asStaff = await payload.find({
      collection: 'assinantes',
      overrideAccess: false,
      user: staff as never,
      where: { email: { equals: 'eu@teste.local' } },
    })
    expect(asStaff.docs[0].staffNotes).toBe('Pagou em dinheiro')
  })
})
