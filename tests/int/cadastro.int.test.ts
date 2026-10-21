import fs from 'node:fs'

import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { confirmEmail, resendVerification, signUp } from '../../src/lib/assinantes/signup'
import * as contaGratuita from '../../src/migrations/20261020_172550_conta_gratuita'
import { getTestPayload, resetDatabase, seedAssinante, seedStaffUser } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i
const DAY = 86_400_000
const PASSWORD = 'senha-cadastro-123'

type Mail = { to: string; subject: string; text: string; html: string }

describe('public sign-up with e-mail confirmation (G-01, T-CG-04..11)', () => {
  let payload: Payload
  let sent: Mail[]
  let spy: ReturnType<typeof vi.spyOn>
  let ipSeq = 0
  const ip = () => `10.20.${Math.floor(ipSeq / 200)}.${ipSeq++ % 200}`
  // each call gets its own hour so the in-memory attempt limits of one test never leak into the next
  let clock = Date.UTC(2030, 0, 1)
  const o = () => ({ ip: ip(), now: (clock += 2 * 3_600_000), background: false })
  const input = (over: Record<string, unknown> = {}) => ({
    email: 'nova@teste.local',
    password: PASSWORD,
    apelido: 'Casal Nova',
    maior18: true,
    termos: true,
    ...over,
  })
  const tokenOf = (mail: Mail) => /confirmar\?token=([a-f0-9]{40})/.exec(mail.text)![1]!
  const account = async (email: string) =>
    (
      await payload.find({
        collection: 'assinantes',
        where: { email: { equals: email } },
        showHiddenFields: true,
        overrideAccess: true,
        limit: 1,
      })
    ).docs[0] as unknown as Record<string, unknown> | undefined

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    process.env.EMAIL_CAPTURE_DIR = '/tmp/ignored-by-int-test'
    sent = []
    spy = vi.spyOn(payload, 'sendEmail').mockImplementation((async (m: Mail) => {
      // the staff notice has its own spec (aviso-novo-cadastro.int.test.ts); here only the subscriber's mails
      if (m.subject !== 'Novo cadastro no Paraíso Brasília') sent.push(m)
    }) as never)
  })

  afterEach(() => {
    spy.mockRestore()
    delete process.env.EMAIL_CAPTURE_DIR
  })

  afterAll(() => {
    delete process.env.EMAIL_CAPTURE_DIR
  })

  describe('the doors stay closed', () => {
    it('anonymous REST-style create and first-register are refused', async () => {
      // POST /api/assinantes (access.create = isStaff) and /api/assinantes/first-register (create with overrideAccess, no user)
      await expect(
        payload.create({ collection: 'assinantes', overrideAccess: false, data: { email: 'rest@teste.local', password: PASSWORD, name: 'Rest' } }),
      ).rejects.toThrow(DENIED)
      await expect(
        payload.create({ collection: 'assinantes', overrideAccess: true, data: { email: 'first-register@teste.local', password: PASSWORD, name: 'First' } }),
      ).rejects.toThrow(DENIED)
      // a self-declared flag from outside is only honoured while e-mail is configured
      delete process.env.EMAIL_CAPTURE_DIR
      await expect(
        payload.create({
          collection: 'assinantes',
          overrideAccess: true,
          context: { selfSignup: true },
          data: { email: 'sneaky@teste.local', password: PASSWORD, name: 'Sneaky' },
        }),
      ).rejects.toThrow(DENIED)
      expect((await payload.count({ collection: 'assinantes', overrideAccess: true })).totalDocs).toBe(0)
    })

    it('with e-mail off, signUp answers fechado and creates nothing', async () => {
      delete process.env.EMAIL_CAPTURE_DIR
      expect(await signUp(payload, input(), o())).toBe('fechado')
      expect(await resendVerification(payload, { email: 'nova@teste.local' }, o())).toBe('fechado')
      expect((await payload.count({ collection: 'assinantes', overrideAccess: true })).totalDocs).toBe(0)
      expect(sent).toHaveLength(0)
    })
  })

  describe('sign-up', () => {
    it('creates an unconfirmed account with origem, consent dates, mails the link; login needs the confirmation', async () => {
      expect(await signUp(payload, input({ email: 'Nova@Teste.Local' }), o())).toBe('enviado')
      const acc = (await account('nova@teste.local'))!
      expect(acc._verified).toBe(false)
      expect(acc.origem).toBe('cadastro')
      expect(acc.apelido).toBe('Casal Nova')
      expect(acc.name).toBe('Casal Nova')
      expect(typeof acc.declaracao18Em).toBe('string')
      expect(typeof acc.termosAceitosEm).toBe('string')
      expect(acc.accessUntil ?? null).toBeNull()
      expect(sent).toHaveLength(1)
      expect(sent[0]!.to).toBe('nova@teste.local')
      expect(sent[0]!.subject).toBe('Confirme seu e-mail - Paraíso Brasília')
      expect(sent[0]!.html).toContain('cadastro/confirmar?token=')

      await expect(payload.login({ collection: 'assinantes', data: { email: 'nova@teste.local', password: PASSWORD } })).rejects.toMatchObject({
        name: 'UnverifiedEmail',
      })
      // a wrong password does not reveal the state
      await expect(payload.login({ collection: 'assinantes', data: { email: 'nova@teste.local', password: 'errada-errada' } })).rejects.not.toMatchObject({
        name: 'UnverifiedEmail',
      })

      const token = tokenOf(sent[0]!)
      expect(await confirmEmail(payload, 'a'.repeat(40))).toBe('invalido')
      expect(await confirmEmail(payload, 'not-a-token')).toBe('invalido')
      expect(await confirmEmail(payload, token)).toBe('ok')
      expect(await confirmEmail(payload, token)).toBe('invalido') // single use
      const login = await payload.login({ collection: 'assinantes', data: { email: 'nova@teste.local', password: PASSWORD } })
      expect(login.token).toBeTruthy()
      // the account never appears as a subscriber: no access
      expect((await account('nova@teste.local'))!.accessUntil ?? null).toBeNull()
    })

    it('writes an audit row for the sign-up (system actor) and never copies the token', async () => {
      await signUp(payload, input(), o())
      const { docs } = await payload.find({ collection: 'audit-log', overrideAccess: true, pagination: false })
      const row = docs.find((d) => d.action === 'conta-criada')!
      expect(row.summary).toMatch(/^Conta criada pelo cadastro do site: /)
      expect(row.actorType).toBe('sistema')
      expect(JSON.stringify(docs)).not.toMatch(/[a-f0-9]{40}/)
    })

    it('ignores _verified, origem, accessUntil and dates sent in the input', async () => {
      const spoofed = {
        ...input({ email: 'spoof@teste.local' }),
        _verified: true,
        origem: 'equipe',
        accessUntil: '2099-01-01T00:00:00.000Z',
      }
      // the service only forwards known fields; the guard also strips them if code ever did
      await signUp(payload, spoofed as never, o())
      const acc = (await account('spoof@teste.local'))!
      expect(acc._verified).toBe(false)
      expect(acc.origem).toBe('cadastro')
      expect(acc.accessUntil ?? null).toBeNull()

      await expect(
        payload.create({
          collection: 'assinantes',
          overrideAccess: true,
          context: { selfSignup: true },
          data: { email: 'guard@teste.local', password: PASSWORD, name: 'Guard', _verified: true, origem: 'equipe', accessUntil: '2099-01-01T00:00:00.000Z', staffNotes: 'x' } as never,
        }),
      ).resolves.toBeTruthy()
      const guard = (await account('guard@teste.local'))!
      expect(guard._verified).toBe(false)
      expect(guard.origem).toBe('cadastro')
      expect(guard.accessUntil ?? null).toBeNull()
      expect(guard.staffNotes ?? null).toBeNull()
    })

    it('validates every field and stays silent about the honeypot', async () => {
      const r = await signUp(payload, input({ email: 'sem-arroba', password: 'curta', apelido: 'fale (61) 99988-9772', maior18: false, termos: false }), {
        ip: ip(),
        background: false,
      })
      expect(r).toMatchObject({ errors: { email: expect.any(String), senha: expect.any(String), apelido: expect.any(String), maior18: expect.any(String), termos: expect.any(String) } })
      expect(await signUp(payload, input({ website: 'http://spam.test' }), o())).toBe('enviado')
      expect((await payload.count({ collection: 'assinantes', overrideAccess: true })).totalDocs).toBe(0)
      expect(sent).toHaveLength(0)
    })

    it('a duplicate CONFIRMED e-mail answers the same, keeps the password and mails "você já tem conta"', async () => {
      await seedAssinante(payload, { email: 'dono@teste.local', password: 'senha-do-dono-1', name: 'Dono' })
      expect(await signUp(payload, input({ email: 'dono@teste.local', password: 'senha-do-invasor-1' }), o())).toBe('enviado')
      expect(sent).toHaveLength(1)
      expect(sent[0]!.subject).toBe('Você já tem uma conta - Paraíso Brasília')
      expect(sent[0]!.text + sent[0]!.html).not.toMatch(/token=/)
      expect((await payload.login({ collection: 'assinantes', data: { email: 'dono@teste.local', password: 'senha-do-dono-1' } })).token).toBeTruthy()
      await expect(payload.login({ collection: 'assinantes', data: { email: 'dono@teste.local', password: 'senha-do-invasor-1' } })).rejects.toThrow()
    })

    it('a duplicate UNCONFIRMED e-mail replaces password and token (I-5); the old link dies', async () => {
      await signUp(payload, input(), o())
      const first = tokenOf(sent[0]!)
      await signUp(payload, input({ password: 'outra-senha-9999', apelido: 'Casal Real' }), o())
      const second = tokenOf(sent[1]!)
      expect(second).not.toBe(first)
      expect((await payload.count({ collection: 'assinantes', overrideAccess: true })).totalDocs).toBe(1)
      expect(await confirmEmail(payload, first)).toBe('invalido')
      expect(await confirmEmail(payload, second)).toBe('ok')
      await expect(payload.login({ collection: 'assinantes', data: { email: 'nova@teste.local', password: PASSWORD } })).rejects.toThrow()
      expect((await payload.login({ collection: 'assinantes', data: { email: 'nova@teste.local', password: 'outra-senha-9999' } })).token).toBeTruthy()
      expect((await account('nova@teste.local'))!.apelido).toBe('Casal Real')
    })

    it('rate limits: 5 per IP per hour and 3 per e-mail per hour', async () => {
      const now = Date.UTC(2026, 9, 20, 18)
      const sameIp = '10.99.0.1'
      const results: unknown[] = []
      for (let i = 0; i < 6; i++) {
        results.push(await signUp(payload, input({ email: `lote${i}@teste.local`, apelido: `Lote ${i}` }), { ip: sameIp, now, background: false }))
      }
      expect(results).toEqual(['enviado', 'enviado', 'enviado', 'enviado', 'enviado', 'limite'])

      const results2: unknown[] = []
      for (let i = 0; i < 4; i++) {
        results2.push(await signUp(payload, input({ email: 'mesmo@teste.local' }), { ip: `10.99.1.${i}`, now, background: false }))
      }
      expect(results2).toEqual(['enviado', 'enviado', 'enviado', 'limite'])
    })

    it('deletes unconfirmed sign-ups older than 7 days on the next sign-up, never confirmed or staff accounts', async () => {
      await signUp(payload, input({ email: 'velha@teste.local' }), o())
      await seedAssinante(payload, { email: 'equipe@teste.local', password: PASSWORD, name: 'Equipe' })
      await signUp(payload, input({ email: 'confirmada@teste.local' }), o())
      await confirmEmail(payload, tokenOf(sent[sent.length - 1]!))
      // age every account by 8 days
      const { drizzle } = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
      const { sql } = await import('@payloadcms/db-postgres')
      await drizzle.execute(sql`UPDATE assinantes SET created_at = now() - interval '8 days'`)
      await signUp(payload, input({ email: 'recente@teste.local' }), o())
      const emails = (await payload.find({ collection: 'assinantes', overrideAccess: true, pagination: false })).docs.map((d) => d.email).sort()
      expect(emails).toEqual(['confirmada@teste.local', 'equipe@teste.local', 'recente@teste.local'])
    })

    it('a link older than 7 days no longer confirms', async () => {
      await signUp(payload, input(), o())
      const token = tokenOf(sent[0]!)
      expect(await confirmEmail(payload, token, Date.now() + 8 * DAY)).toBe('invalido')
      expect(await confirmEmail(payload, token)).toBe('ok')
    })
  })

  describe('resend', () => {
    it('sends a fresh link only for unconfirmed self sign-ups, with the same answer for everyone', async () => {
      await signUp(payload, input(), o())
      const first = tokenOf(sent[0]!)
      expect(await resendVerification(payload, { email: 'nova@teste.local' }, o())).toBe('enviado')
      expect(sent).toHaveLength(2)
      const second = tokenOf(sent[1]!)
      expect(second).not.toBe(first)
      expect(await confirmEmail(payload, first)).toBe('invalido')
      // unknown, confirmed and staff accounts: same answer, no mail
      await seedAssinante(payload, { email: 'ok@teste.local', password: PASSWORD, name: 'Ok' })
      for (const email of ['ninguem@teste.local', 'ok@teste.local', 'lixo']) {
        expect(await resendVerification(payload, { email }, o())).toBe('enviado')
      }
      expect(sent).toHaveLength(2)
      // limits per e-mail
      const now = Date.UTC(2026, 9, 20, 19)
      const out: string[] = []
      for (let i = 0; i < 4; i++) out.push(await resendVerification(payload, { email: 'x@teste.local' }, { ip: `10.77.0.${i}`, now, background: false }))
      expect(out).toEqual(['enviado', 'enviado', 'enviado', 'limite'])
    })
  })

  describe('existing accounts keep working with verify on (T-CG-07)', () => {
    it('staff-created and seeded accounts are confirmed, no verification mail, and log in', async () => {
      const staffUser = await seedStaffUser(payload, { email: 'staff-cadastro@teste.local', password: 'senha-equipe-123' })
      const staff = { ...(staffUser as unknown as Record<string, unknown>), collection: 'users' }
      const made = await payload.create({
        collection: 'assinantes',
        overrideAccess: false,
        user: staff as never,
        data: { email: 'feita-pela-equipe@teste.local', password: 'senha-provisoria-1', name: 'Pela Equipe', _verified: false } as never,
      })
      expect(made._verified).toBe(true)
      expect(made.origem).toBe('equipe')
      expect(sent).toHaveLength(0)
      expect((await payload.login({ collection: 'assinantes', data: { email: 'feita-pela-equipe@teste.local', password: 'senha-provisoria-1' } })).token).toBeTruthy()

      const seeded = await seedAssinante(payload, { email: 'semeada@teste.local', password: 'senha-semeada-12', name: 'Semeada' })
      expect(((await account('semeada@teste.local'))!)._verified).toBe(true)
      const { token } = await payload.login({ collection: 'assinantes', data: { email: 'semeada@teste.local', password: 'senha-semeada-12' } })
      const auth = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
      expect(auth.user?.id).toBe(seeded.id)
    })

    it('the migration marks pre-existing accounts as confirmed so their sessions keep working', async () => {
      const text = fs.readFileSync('src/migrations/20261020_172550_conta_gratuita.ts', 'utf8')
      expect(text).toContain('_verified" = true')

      await seedAssinante(payload, { email: 'antiga@teste.local', password: 'senha-antiga-123', name: 'Antiga' })
      const db = (payload.db as unknown as { drizzle: never }).drizzle
      // roll the schema back to "before the migration" (the row survives), then run it forward
      await contaGratuita.down({ db, payload, req: {} as never })
      try {
        await contaGratuita.up({ db, payload, req: {} as never })
      } finally {
        // up() recreates enum_assinantes_origem with its original two values; the later migration
        // migracao_contas (06-04) added 'site-antigo' to the shared test database: put it back
        await (payload.db as unknown as { pool: { query: (q: string) => Promise<unknown> } }).pool.query(
          `ALTER TYPE "public"."enum_assinantes_origem" ADD VALUE IF NOT EXISTS 'site-antigo'`,
        )
      }
      const after = (await account('antiga@teste.local'))!
      expect(after._verified).toBe(true)
      expect(after.origem).toBe('equipe')
      const { token } = await payload.login({ collection: 'assinantes', data: { email: 'antiga@teste.local', password: 'senha-antiga-123' } })
      const auth = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
      expect(auth.user?.email).toBe('antiga@teste.local')
    })
  })
})
