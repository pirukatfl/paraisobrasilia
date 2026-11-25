import { createLocalReq, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAssinanteCompleto, passwordLinkIsValid } from '../../src/lib/assinantes/service'
import { getTestPayload, resetDatabase, seedAssinante, seedStaffUser } from '../helpers/seed'

const wa = (phone: string, message: string) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

describe('createAssinanteCompleto — novo assinante em uma etapa', () => {
  let payload: Payload
  let staff: Record<string, unknown>

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-cadastro@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  const reqOf = () => createLocalReq({ user: staff as never }, payload)

  it('creates the account, releases the plan and returns a valid password link', async () => {
    const plan = await payload.create({
      collection: 'plans',
      data: { name: 'Mensal', durationDays: 30, price: 50, active: true } as never,
      overrideAccess: true,
    })
    const out = await createAssinanteCompleto(
      payload,
      {
        name: 'Nova Pessoa',
        email: ' Nova@Teste.local ',
        whatsapp: '5561999998888',
        planId: plan.id,
        method: 'pix',
        req: await reqOf(),
      },
      wa,
    )
    expect(out.assinante.email).toBe('nova@teste.local')
    expect(out.access?.validUntilLabel).toBeTruthy()
    expect(out.link.whatsappUrl).toContain('wa.me/5561999998888')
    const token = new URL(out.link.url).searchParams.get('token')!
    expect(await passwordLinkIsValid(payload, token)).toBe(true)
    const subs = await payload.find({ collection: 'subscriptions', where: { assinante: { equals: out.assinante.id } }, overrideAccess: true })
    expect(subs.totalDocs).toBe(1)
  })

  it('courtesy with custom days works and an account without access gets no period', async () => {
    const a = await createAssinanteCompleto(
      payload,
      { name: 'Cortesia', email: 'c@teste.local', durationDays: 10, method: 'cortesia', req: await reqOf() },
      wa,
    )
    expect(a.access).not.toBeNull()
    expect(a.link.whatsappUrl).toBeNull()
    const b = await createAssinanteCompleto(payload, { name: 'Sem', email: 's@teste.local', req: await reqOf() }, wa)
    expect(b.access).toBeNull()
    const subs = await payload.find({ collection: 'subscriptions', where: { assinante: { equals: b.assinante.id } }, overrideAccess: true })
    expect(subs.totalDocs).toBe(0)
  })

  it('rejects invalid input and duplicate e-mail without leaving anything behind', async () => {
    await seedAssinante(payload, { email: 'dup@teste.local', password: 'senha-dup-12345', name: 'Dup' })
    await expect(
      createAssinanteCompleto(payload, { name: 'X', email: 'dup@teste.local', req: await reqOf() }, wa),
    ).rejects.toThrow(/Este e-mail já está cadastrado em nome de Dup \(dup@teste\.local\)/)
    await expect(
      createAssinanteCompleto(payload, { name: 'X', email: 'x@teste.local', durationDays: 5, req: await reqOf() }, wa),
    ).rejects.toThrow(/forma de pagamento/)
    await expect(
      createAssinanteCompleto(payload, { name: 'X', email: 'x@teste.local', whatsapp: '123', req: await reqOf() }, wa),
    ).rejects.toThrow(/WhatsApp/)
    const found = await payload.find({ collection: 'assinantes', where: { email: { equals: 'x@teste.local' } }, overrideAccess: true })
    expect(found.totalDocs).toBe(0)
  })
})
