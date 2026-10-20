import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { notifyNewSignup } from '../../src/lib/email/new-signup-notice'
import { signUp } from '../../src/lib/assinantes/signup'
import { getTestPayload, resetDatabase, seedAssinante } from '../helpers/seed'

type Mail = { to: string; subject: string; text: string; html: string }
const NOTICE = 'Novo cadastro no Paraíso Brasília'

describe('aviso de novo cadastro para a equipe', () => {
  let payload: Payload
  let sent: Mail[]
  let spy: ReturnType<typeof vi.spyOn>
  let n = 0
  let clock = Date.UTC(2031, 0, 1)
  const opts = () => ({ ip: `10.30.0.${n++ % 250}`, now: (clock += 2 * 3_600_000), background: false })
  const signup = (email: string) =>
    signUp(payload, { email, password: 'senha-cadastro-123', apelido: 'Casal Aviso', maior18: true, termos: true }, opts())
  const notices = () => sent.filter((m) => m.subject === NOTICE)

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    // the contact global survives resetDatabase: start every test with the setting empty
    await payload.updateGlobal({ slug: 'contact', data: { avisoNovoCadastroEmail: null } as never, overrideAccess: true })
    process.env.EMAIL_CAPTURE_DIR = '/tmp/ignored-by-int-test'
    sent = []
    spy = vi.spyOn(payload, 'sendEmail').mockImplementation((async (m: never) => {
      sent.push(m)
    }) as never)
  })

  afterEach(() => {
    spy.mockRestore()
    delete process.env.EMAIL_CAPTURE_DIR
  })

  afterAll(() => {
    delete process.env.EMAIL_CAPTURE_DIR
  })

  it('sends one notice on a public sign-up, to the from-address when the setting is empty', async () => {
    expect(await signup('nova1@teste.local')).toBe('enviado')
    const [mail] = notices()
    expect(notices()).toHaveLength(1)
    expect(mail!.to).toBe('suporte@swingbrasilia.com.br')
    expect(mail!.text).toContain('Casal Aviso')
    expect(mail!.text).toContain('nova1@teste.local')
    expect(mail!.text).toContain('horário de Brasília')
    expect(mail!.text).toContain('gratuito')
    const created = (await payload.find({ collection: 'assinantes', where: { email: { equals: 'nova1@teste.local' } }, limit: 1 })).docs[0]!
    expect(mail!.text).toContain(`/admin/collections/assinantes/${created.id}`)
    expect(mail!.text + mail!.html).not.toMatch(/senha-cadastro-123|confirmar\?token|[a-f0-9]{40}/)
  })

  it('goes to the address staff set in "Contato e endereço"', async () => {
    await payload.updateGlobal({ slug: 'contact', data: { avisoNovoCadastroEmail: 'dono@teste.local' } as never, overrideAccess: true })
    await signup('nova2@teste.local')
    expect(notices().map((m) => m.to)).toEqual(['dono@teste.local'])
  })

  it('the recipient setting is staff-only: anonymous reads do not see it', async () => {
    await payload.updateGlobal({ slug: 'contact', data: { avisoNovoCadastroEmail: 'dono@teste.local' } as never, overrideAccess: true })
    const anon = (await payload.findGlobal({ slug: 'contact', overrideAccess: false })) as unknown as Record<string, unknown>
    expect(anon.avisoNovoCadastroEmail).toBeUndefined()
  })

  it('does not send for accounts created by staff or by trusted code', async () => {
    await seedAssinante(payload, { email: 'equipe@teste.local', password: 'senha-equipe-123', name: 'Feita pela equipe' })
    expect(notices()).toHaveLength(0)
  })

  it('does not send when e-mail is not configured', async () => {
    delete process.env.EMAIL_CAPTURE_DIR
    expect(await signup('nova3@teste.local')).toBe('fechado')
    await notifyNewSignup(payload, { id: 1, email: 'x@teste.local', name: 'X' }, 'http://localhost:3000')
    expect(sent).toHaveLength(0)
  })

  it('a failing notice never breaks the sign-up and logs only the id', async () => {
    spy.mockImplementation((async (m: Mail) => {
      if (m.subject === NOTICE) throw new Error('smtp caiu para nova4@teste.local')
      sent.push(m)
    }) as never)
    const log = vi.spyOn(payload.logger, 'error').mockImplementation((() => undefined) as never)
    expect(await signup('nova4@teste.local')).toBe('enviado')
    const found = await payload.find({ collection: 'assinantes', where: { email: { equals: 'nova4@teste.local' } }, limit: 1 })
    expect(found.docs).toHaveLength(1)
    expect(sent.some((m) => /confirmar\?token=/.test(m.text))).toBe(true)
    const logged = log.mock.calls.map((c) => String(c[0])).join('\n')
    expect(logged).toContain(`cadastro ${found.docs[0]!.id}`)
    expect(logged).not.toContain('nova4@teste.local')
    log.mockRestore()
  })
})
