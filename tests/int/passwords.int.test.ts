import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, seedAssinante, seedStaffUser } from '../helpers/seed'

const sidOf = (token: string) =>
  (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { sid: string }).sid

describe('passwords without e-mail (ASS-02 substitute, D-04, T-03-04, T-03-11)', () => {
  let payload: Payload
  let staff: Record<string, unknown>

  const sessionsOf = async (id: number) => {
    const doc = (await payload.findByID({
      collection: 'assinantes',
      id,
      overrideAccess: true,
      showHiddenFields: true,
      depth: 0,
    })) as unknown as { sessions?: { id: string }[] | null; mustChangePassword?: boolean | null }
    return { sessions: (doc.sessions ?? []).map((s) => s.id), mustChangePassword: doc.mustChangePassword }
  }
  const log = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true }))
      .docs

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-senhas@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  it('an account created by staff starts with a temporary password, logged once', async () => {
    const acc = await payload.create({
      collection: 'assinantes',
      overrideAccess: false,
      user: staff as never,
      data: { name: 'Caio', email: 'caio@teste.local', password: 'senha-provisoria-1' },
    })
    expect(acc.mustChangePassword).toBe(true)
    const created = await log('conta-criada')
    expect(created).toHaveLength(1)
    expect(created[0].summary).toContain('com senha provisória')
    expect(await log('senha-definida-pela-equipe')).toHaveLength(0)
  })

  it('a password set by staff is temporary and logs the subscriber out everywhere', async () => {
    const acc = await seedAssinante(payload, { email: 'dani@teste.local', password: 'senha-dani-1234', name: 'Dani' })
    await payload.login({ collection: 'assinantes', data: { email: 'dani@teste.local', password: 'senha-dani-1234' } })
    await payload.login({ collection: 'assinantes', data: { email: 'dani@teste.local', password: 'senha-dani-1234' } })
    expect((await sessionsOf(acc.id)).sessions).toHaveLength(2)

    await payload.update({
      collection: 'assinantes',
      id: acc.id,
      overrideAccess: false,
      user: staff as never,
      data: { password: 'nova-provisoria-1' },
    })
    const after = await sessionsOf(acc.id)
    expect(after.mustChangePassword).toBe(true)
    expect(after.sessions).toHaveLength(0)
    const rows = await log('senha-definida-pela-equipe')
    expect(rows).toHaveLength(1)
    expect(rows[0].actorType).toBe('equipe')
    expect(await log('conta-editada')).toHaveLength(0)
  })

  it('the subscriber changes the password, keeps the current session and drops the others', async () => {
    const acc = await seedAssinante(payload, { email: 'edu@teste.local', password: 'senha-edu-12345', name: 'Edu' })
    await payload.update({
      collection: 'assinantes',
      id: acc.id,
      overrideAccess: true,
      data: { mustChangePassword: true },
      context: { skipAudit: true },
    })
    const other = await payload.login({ collection: 'assinantes', data: { email: 'edu@teste.local', password: 'senha-edu-12345' } })
    const current = await payload.login({ collection: 'assinantes', data: { email: 'edu@teste.local', password: 'senha-edu-12345' } })
    const sid = sidOf(current.token!)
    expect((await sessionsOf(acc.id)).sessions).toContain(sidOf(other.token!))

    // Same call the trocarSenha action makes (user = the authenticated subscriber, with _sid)
    await payload.update({
      collection: 'assinantes',
      id: acc.id,
      overrideAccess: true,
      user: { ...current.user, collection: 'assinantes', _sid: sid } as never,
      data: { password: 'senha-nova-edu-1', mustChangePassword: false },
    })
    const after = await sessionsOf(acc.id)
    expect(after.mustChangePassword).toBe(false)
    expect(after.sessions).toEqual([sid])
    const rows = await log('senha-trocada-pelo-assinante')
    expect(rows).toHaveLength(1)
    expect(rows[0].actorType).toBe('assinante')
    expect(await log('conta-editada')).toHaveLength(0)

    await expect(
      payload.login({ collection: 'assinantes', data: { email: 'edu@teste.local', password: 'senha-edu-12345' } }),
    ).rejects.toThrow()
    const ok = await payload.login({ collection: 'assinantes', data: { email: 'edu@teste.local', password: 'senha-nova-edu-1' } })
    expect(ok.token).toBeTruthy()
  })
})
