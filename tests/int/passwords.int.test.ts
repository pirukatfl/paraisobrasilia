import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestPasswordEmail, deliver } from '../../src/lib/assinantes/reset-email'
import { createPasswordLink, passwordLinkIsValid } from '../../src/lib/assinantes/service'
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

  it('staff link: 48 h, single use, the newest replaces the previous one, token never logged', async () => {
    const acc = await seedAssinante(payload, { email: 'fabi@teste.local', password: 'senha-fabi-1234', name: 'Fabi' })
    const req = await createLocalReq({ user: staff as never }, payload)
    const before = Date.now()
    const first = await createPasswordLink(payload, { assinanteId: acc.id, req })
    const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '')
    expect(first.url.startsWith(`${base}/nova-senha?token=`)).toBe(true)
    expect(new URL(first.url).searchParams.get('token')).toMatch(/^[0-9a-f]{40}$/)
    const expires = new Date(first.expiresAt).getTime()
    expect(expires - before).toBeGreaterThan(47.9 * 3600_000)
    expect(expires - before).toBeLessThan(48.1 * 3600_000)
    const token1 = new URL(first.url).searchParams.get('token')!
    expect(await passwordLinkIsValid(payload, token1)).toBe(true)

    const rows = await log('link-de-senha-gerado')
    expect(rows).toHaveLength(1)
    expect(JSON.stringify(rows)).not.toContain(token1)

    const second = await createPasswordLink(payload, { assinanteId: acc.id, req })
    const token2 = new URL(second.url).searchParams.get('token')!
    expect(await passwordLinkIsValid(payload, token1)).toBe(false)
    await expect(
      payload.resetPassword({ collection: 'assinantes', data: { token: token1, password: 'nova-senha-fabi' }, overrideAccess: true }),
    ).rejects.toThrow()
    const reset = await payload.resetPassword({
      collection: 'assinantes',
      data: { token: token2, password: 'nova-senha-fabi' },
      overrideAccess: true,
    })
    expect(reset.token).toBeTruthy()
    expect(await passwordLinkIsValid(payload, token2)).toBe(false)
    await expect(
      payload.resetPassword({ collection: 'assinantes', data: { token: token2, password: 'outra-senha-fabi' }, overrideAccess: true }),
    ).rejects.toThrow()
  })

  it('public forgot-password stays closed (regression)', async () => {
    await seedAssinante(payload, { email: 'gabi@teste.local', password: 'senha-gabi-1234', name: 'Gabi' })
    await expect(
      payload.forgotPassword({ collection: 'assinantes', data: { email: 'gabi@teste.local' }, disableEmail: true }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })
})

describe('emailed password link (ASS-02)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    delete process.env.EMAIL_CAPTURE_DIR
  })

  afterAll(() => {
    delete process.env.EMAIL_CAPTURE_DIR
  })

  it('without e-mail configured nothing is attempted and the emailed flag is refused', async () => {
    await seedAssinante(payload, { email: 'eva@teste.local', password: 'senha-eva-1234', name: 'Eva' })
    const spy = vi.spyOn(payload, 'sendEmail')
    expect(await requestPasswordEmail(payload, { email: 'eva@teste.local', ip: '1.1.1.1' })).toBe('desligado')
    expect(spy).not.toHaveBeenCalled()
    await expect(
      payload.forgotPassword({
        collection: 'assinantes',
        data: { email: 'eva@teste.local' },
        disableEmail: true,
        context: { emailedPasswordLink: true },
      }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
    spy.mockRestore()
  })

  it('with e-mail on: sends the Portuguese link, the token resets the password, old link is replaced', async () => {
    process.env.EMAIL_CAPTURE_DIR = '/tmp/ignored-by-int-test'
    const acc = await seedAssinante(payload, { email: 'fabi@teste.local', password: 'senha-fabi-1234', name: 'Fabi' })
    const sent: { to: string; subject: string; text: string; html: string }[] = []
    const spy = vi.spyOn(payload, 'sendEmail').mockImplementation((async (m: never) => {
      sent.push(m)
    }) as never)
    expect(await deliver(payload, 'fabi@teste.local')).toBe(true)
    expect(await deliver(payload, 'ninguem@teste.local')).toBe(false)
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('fabi@teste.local')
    const first = /nova-senha\?token=([a-f0-9]+)/.exec(sent[0]!.text)![1]!
    expect(sent[0]!.html).toContain(first)

    // A newer e-mail cancels the older link
    await deliver(payload, 'fabi@teste.local')
    const second = /nova-senha\?token=([a-f0-9]+)/.exec(sent[1]!.text)![1]!
    expect(second).not.toBe(first)
    expect(await passwordLinkIsValid(payload, first)).toBe(false)
    expect(await passwordLinkIsValid(payload, second)).toBe(true)

    const reset = await payload.resetPassword({
      collection: 'assinantes',
      data: { token: second, password: 'nova-senha-fabi-1' },
      overrideAccess: true,
    })
    expect(reset.token).toBeTruthy()
    await expect(
      payload.login({ collection: 'assinantes', data: { email: 'fabi@teste.local', password: 'senha-fabi-1234' } }),
    ).rejects.toThrow()
    expect((await payload.login({ collection: 'assinantes', data: { email: 'fabi@teste.local', password: 'nova-senha-fabi-1' } })).token).toBeTruthy()
    expect(acc.id).toBeTruthy()
    spy.mockRestore()
  })

  it('rate limit: 5 per e-mail per hour, counted whether or not the account exists', async () => {
    process.env.EMAIL_CAPTURE_DIR = '/tmp/ignored-by-int-test'
    const spy = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const now = Date.UTC(2026, 9, 20, 15)
    const results: string[] = []
    for (let i = 0; i < 6; i++) {
      results.push(await requestPasswordEmail(payload, { email: 'fantasma@teste.local', ip: `10.9.0.${i}`, now }))
    }
    expect(results).toEqual(['enviado', 'enviado', 'enviado', 'enviado', 'enviado', 'limite'])
    spy.mockRestore()
  })
})
