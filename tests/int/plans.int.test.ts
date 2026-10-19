import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getActivePlans } from '../../src/lib/assinantes/plans'
import { PLANS_SEED, seedPlansIfEmpty } from '../../src/migrations/seed/plans-content'
import { getTestPayload, resetDatabase, seedAssinante, seedPlan, seedStaffUser } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i

/** Payload ValidationError: the field message is in data.errors[].message. */
async function expectFieldError(promise: Promise<unknown>, message: string) {
  const err = (await promise.then(
    () => null,
    (e: unknown) => e,
  )) as { data?: { errors?: { message: string }[] } } | null
  expect(err, 'expected a validation error').not.toBeNull()
  expect((err?.data?.errors ?? []).map((e) => e.message)).toContain(message)
}

describe('plans (ASS-05, D-02, D-03)', () => {
  let payload: Payload
  let staff: Record<string, unknown>

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-plans@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  it('seeds the four confirmed plans once, without payment links', async () => {
    expect(await seedPlansIfEmpty(payload)).toBe(4)
    const { docs } = await payload.find({ collection: 'plans', sort: 'order', overrideAccess: true })
    expect(docs.map((d) => [d.name, d.durationDays, d.price, d.paymentUrl ?? '', d.active])).toEqual([
      ['Mensal', 30, 30, '', true],
      ['Trimestral', 90, 75, '', true],
      ['Semestral', 180, 135, '', true],
      ['Anual', 365, 240, '', true],
    ])
    expect(PLANS_SEED).toHaveLength(4)
    expect(await seedPlansIfEmpty(payload)).toBe(0)
    expect((await payload.count({ collection: 'plans' })).totalDocs).toBe(4)
  })

  it('never overwrites staff edits', async () => {
    await seedPlansIfEmpty(payload)
    const { docs } = await payload.find({ collection: 'plans', where: { name: { equals: 'Mensal' } }, overrideAccess: true })
    await payload.update({ collection: 'plans', id: docs[0].id, data: { price: 35 }, overrideAccess: true })
    await seedPlansIfEmpty(payload)
    const after = await payload.findByID({ collection: 'plans', id: docs[0].id, overrideAccess: true })
    expect(after.price).toBe(35)
  })

  it('anonymous visitors read only active plans and cannot write', async () => {
    await seedPlan(payload, { name: 'Ativo', durationDays: 30, price: 30 })
    await seedPlan(payload, { name: 'Inativo', durationDays: 30, price: 30, active: false })
    const { docs } = await payload.find({ collection: 'plans', overrideAccess: false })
    expect(docs.map((d) => d.name)).toEqual(['Ativo'])
    await expect(
      payload.create({ collection: 'plans', overrideAccess: false, data: { name: 'X', durationDays: 1, price: 1 } }),
    ).rejects.toThrow(DENIED)
    await expect(
      payload.update({ collection: 'plans', id: docs[0].id, overrideAccess: false, data: { price: 1 } }),
    ).rejects.toThrow(DENIED)
  })

  it('subscribers cannot create plans', async () => {
    const sub = await seedAssinante(payload, { email: 'sub-plans@teste.local', password: 'senha-sub-123', name: 'Sub' })
    await expect(
      payload.create({
        collection: 'plans',
        overrideAccess: false,
        user: { ...sub, collection: 'assinantes' } as never,
        data: { name: 'X', durationDays: 1, price: 1 },
      }),
    ).rejects.toThrow(DENIED)
  })

  it('validates payment link, promo price and duration', async () => {
    const as = { overrideAccess: false, user: staff as never }
    for (const paymentUrl of ['http://pag.ae/x', 'javascript:alert(1)']) {
      await expectFieldError(
        payload.create({ collection: 'plans', ...as, data: { name: 'X', durationDays: 30, price: 30, paymentUrl } }),
        'Use um link que comece com https://',
      )
    }
    await expectFieldError(
      payload.create({ collection: 'plans', ...as, data: { name: 'X', durationDays: 30, price: 30, promoPrice: 30 } }),
      'O preço promocional precisa ser menor que o preço normal.',
    )
    await expect(
      payload.create({ collection: 'plans', ...as, data: { name: 'X', durationDays: 0, price: 30 } }),
    ).rejects.toThrow()
    const ok = await payload.create({
      collection: 'plans',
      ...as,
      data: { name: 'Ok', durationDays: 30, price: 30, promoPrice: 25, paymentUrl: 'https://pag.ae/ok' },
    })
    expect(ok.paymentUrl).toBe('https://pag.ae/ok')
  })

  it('getActivePlans returns DTOs by order then duration, active only', async () => {
    await seedPlan(payload, { name: 'Anual', durationDays: 365, price: 240, order: 2 })
    await seedPlan(payload, { name: 'Mensal', durationDays: 30, price: 30, order: 1 })
    await seedPlan(payload, { name: 'Trimestral', durationDays: 90, price: 75, order: 1, promoPrice: 60 })
    await seedPlan(payload, { name: 'Escondido', durationDays: 7, price: 10, order: 0, active: false })
    const plans = await getActivePlans()
    expect(plans.map((p) => p.name)).toEqual(['Mensal', 'Trimestral', 'Anual'])
    expect(plans[1]).toMatchObject({ priceLabel: 'R$ 75', promoLabel: 'R$ 60', durationLabel: '90 dias', paymentUrl: null })
  })
})
