import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { loginWithLegacy, tryLegacyPassword } from '../../src/lib/assinantes/legacy-login'
import { verifyWpPassword } from '../../src/lib/assinantes/wp-password'
import { rest } from '../helpers/rest'
import { getTestPayload, resetDatabase, seedLegacyAssinante } from '../helpers/seed'

// Count calls to the verifier without changing it
vi.mock('../../src/lib/assinantes/wp-password', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/lib/assinantes/wp-password')>()
  return { ...mod, verifyWpPassword: vi.fn(mod.verifyWpPassword) }
})

// PHP-generated vectors (06-RESEARCH §1)
const WP1 = '$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica'
const PH1 = '$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.'
const WP3 = '$wp$2y$10$ZCyjg8Ai1fHJVHo4vpmju.MqB6nw24/NjZ9IiOXRF6VjB6zBH8Y..'
const PH4 = '$P$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0'

describe('login com a senha do site antigo (06-05, M-03)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    vi.mocked(verifyWpPassword).mockClear()
  })

  const read = async (email: string) =>
    (
      await payload.find({
        collection: 'assinantes',
        where: { email: { equals: email } },
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
    ).docs[0] as unknown as {
      id: number
      legacyPasswordHash?: string | null
      loginAttempts?: number | null
      lockUntil?: string | null
    }

  const auditRows = async () =>
    (await payload.find({ collection: 'audit-log', depth: 0, overrideAccess: true, limit: 100 })).docs

  it('$wp$ account: first login converts the password, the second goes through Payload', async () => {
    await seedLegacyAssinante(payload, { email: 'wp@teste.local', name: 'WP', hash: WP1, wpUserId: 1 })
    const first = await loginWithLegacy(payload, { email: 'wp@teste.local', password: 'senha-sintetica-1' })
    expect(first.ok).toBe(true)
    const acc = await read('wp@teste.local')
    expect(acc.legacyPasswordHash ?? null).toBeNull()
    expect(Number(acc.loginAttempts ?? 0)).toBe(0)
    const rows = (await auditRows()).filter((r) => r.action === 'senha-migrada')
    expect(rows).toHaveLength(1)
    const dump = JSON.stringify(await auditRows())
    expect(dump).not.toContain('$wp$')
    expect(dump).not.toContain('$P$')
    expect(dump).not.toContain('senha-sintetica-1')

    expect(await tryLegacyPassword(payload, { email: 'wp@teste.local', password: 'senha-sintetica-1' })).toEqual({ kind: 'nao-legado' })
    const second = await loginWithLegacy(payload, { email: 'WP@teste.local', password: 'senha-sintetica-1' })
    expect(second.ok).toBe(true)
  })

  it('$P$ accounts log in (including the phpass project vector)', async () => {
    await seedLegacyAssinante(payload, { email: 'ph@teste.local', name: 'PH', hash: PH1, wpUserId: 2 })
    await seedLegacyAssinante(payload, { email: 'ph4@teste.local', name: 'PH4', hash: PH4, wpUserId: 3 })
    expect((await loginWithLegacy(payload, { email: 'ph@teste.local', password: 'senha-sintetica-1' })).ok).toBe(true)
    expect((await loginWithLegacy(payload, { email: 'ph4@teste.local', password: 'test12345' })).ok).toBe(true)
    expect((await read('ph@teste.local')).legacyPasswordHash ?? null).toBeNull()
  })

  it('wrong password counts exactly one attempt and keeps the hash', async () => {
    await seedLegacyAssinante(payload, { email: 'wp@teste.local', name: 'WP', hash: WP1, wpUserId: 1 })
    const res = await loginWithLegacy(payload, { email: 'wp@teste.local', password: 'senha-errada-123' })
    expect(res).toEqual({ ok: false, error: 'credenciais' })
    const acc = await read('wp@teste.local')
    expect(Number(acc.loginAttempts)).toBe(1)
    expect(acc.legacyPasswordHash).toBe(WP1)
  })

  it('lockout: 5 wrong attempts lock, and a locked account is not checked against the old hash', async () => {
    await seedLegacyAssinante(payload, { email: 'wp@teste.local', name: 'WP', hash: WP1, wpUserId: 1 })
    let last: Awaited<ReturnType<typeof loginWithLegacy>> | null = null
    for (let i = 0; i < 6; i++) last = await loginWithLegacy(payload, { email: 'wp@teste.local', password: `errada-${i}-xxxx` })
    expect(last).toEqual({ ok: false, error: 'bloqueado' })
    const locked = await read('wp@teste.local')
    expect(locked.lockUntil).toBeTruthy()
    vi.mocked(verifyWpPassword).mockClear()
    const right = await loginWithLegacy(payload, { email: 'wp@teste.local', password: 'senha-sintetica-1' })
    expect(right).toEqual({ ok: false, error: 'bloqueado' })
    expect(verifyWpPassword).not.toHaveBeenCalled()
    const after = await read('wp@teste.local')
    expect(after.legacyPasswordHash).toBe(WP1)
    expect(after.lockUntil).toBe(locked.lockUntil)
  })

  it('short old password: single-use link, hash stays until the new password is saved', async () => {
    await seedLegacyAssinante(payload, { email: 'curta@teste.local', name: 'Curta', hash: WP3, wpUserId: 4 })
    const res = await loginWithLegacy(payload, { email: 'curta@teste.local', password: 'curta7' })
    expect(res.ok).toBe(false)
    const token = (res as { novaSenhaToken?: string }).novaSenhaToken
    expect(token).toMatch(/^[0-9a-f]{20,}$/)
    expect((await read('curta@teste.local')).legacyPasswordHash).toBe(WP3)
    const reset = await payload.resetPassword({
      collection: 'assinantes',
      data: { token: token!, password: 'nova-senha-123' },
      overrideAccess: true,
    })
    expect(reset.token).toBeTruthy()
  })

  it('an unconfirmed account is rehashed but Payload still refuses the login', async () => {
    await seedLegacyAssinante(payload, { email: 'nv@teste.local', name: 'NV', hash: WP1, wpUserId: 5, verified: false })
    const res = await loginWithLegacy(payload, { email: 'nv@teste.local', password: 'senha-sintetica-1' })
    expect(res).toEqual({ ok: false, error: 'nao-confirmado' })
  })

  it('unknown e-mail and case-insensitive e-mail', async () => {
    expect(await loginWithLegacy(payload, { email: 'ninguem@teste.local', password: 'qualquer-coisa-1' })).toEqual({
      ok: false,
      error: 'credenciais',
    })
    await seedLegacyAssinante(payload, { email: 'caixa@teste.local', name: 'Caixa', hash: WP1, wpUserId: 6 })
    expect((await loginWithLegacy(payload, { email: ' Caixa@Teste.Local ', password: 'senha-sintetica-1' })).ok).toBe(true)
  })

  it('a 5000-byte password does not throw', async () => {
    await seedLegacyAssinante(payload, { email: 'wp@teste.local', name: 'WP', hash: WP1, wpUserId: 1 })
    const res = await loginWithLegacy(payload, { email: 'wp@teste.local', password: 'x'.repeat(5000) })
    expect(res).toEqual({ ok: false, error: 'credenciais' })
  })

  describe('REST stays closed', () => {
    it('/api/assinantes/login never accepts an old password', async () => {
      await seedLegacyAssinante(payload, { email: 'wp@teste.local', name: 'WP', hash: WP1, wpUserId: 1 })
      const res = await rest('POST', ['assinantes', 'login'], { body: { email: 'wp@teste.local', password: 'senha-sintetica-1' } })
      expect(res.status).toBe(401)
      expect((await read('wp@teste.local')).legacyPasswordHash).toBe(WP1)
    })

    it('forgot-password over HTTP cannot mint a token, whatever the body says', async () => {
      await seedLegacyAssinante(payload, { email: 'wp@teste.local', name: 'WP', hash: WP1, wpUserId: 1 })
      const res = await rest('POST', ['assinantes', 'forgot-password'], {
        body: { email: 'wp@teste.local', legacyPasswordUpgrade: true, context: { legacyPasswordUpgrade: true } },
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      const raw = await payload.find({
        collection: 'assinantes',
        where: { email: { equals: 'wp@teste.local' } },
        overrideAccess: true,
        showHiddenFields: true,
        depth: 0,
      })
      expect((raw.docs[0] as unknown as { resetPasswordToken?: string | null }).resetPasswordToken ?? null).toBeNull()
    })
  })
})
