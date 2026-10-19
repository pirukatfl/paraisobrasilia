import type { Payload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessStatus } from '../../src/lib/assinantes/access'
import type { Subscription } from '../../src/payload-types'
import { expectFieldError } from '../helpers/errors'
import { getTestPayload, resetDatabase, seedAssinante, seedPlan, seedStaffUser, seedSubscription } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i

describe('subscription periods and entitlement (ASS-03, ASS-04, D-05, T-03-06)', () => {
  let payload: Payload
  let staff: Record<string, unknown>
  let mensal: { id: number }
  let sub: { id: number; email: string; name: string }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-subs@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    mensal = await seedPlan(payload, { name: 'Mensal', durationDays: 30, price: 30 })
    sub = await seedAssinante(payload, { email: 'periodo@teste.local', password: 'senha-periodo-1', name: 'Período' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const asStaff = () => ({ overrideAccess: false, user: staff as never })
  // Generated types require defaulted fields (status); the hooks fill them
  const createSub = (args: Record<string, unknown>) => payload.create(args as never) as Promise<Subscription>

  it('fills endsAt from the plan, writes the summary and the subscriber accessUntil', async () => {
    const period = await createSub({
      collection: 'subscriptions',
      ...asStaff(),
      data: {
        assinante: sub.id,
        plan: mensal.id,
        startsAt: '2026-10-19T18:00:00.000Z',
        payment: { method: 'pix', amount: 30 },
      },
    })
    expect(new Date(period.endsAt!).toISOString()).toBe('2026-11-18T03:00:00.000Z')
    expect(period.summary).toBe('Mensal · 19/10/2026 a 17/11/2026')
    const account = await payload.findByID({ collection: 'assinantes', id: sub.id, overrideAccess: true })
    expect(new Date(account.accessUntil!).toISOString()).toBe('2026-11-18T03:00:00.000Z')
  })

  it('validates plan/end, order of dates, payment method and amount', async () => {
    await expectFieldError(
      createSub({
        collection: 'subscriptions',
        ...asStaff(),
        data: { assinante: sub.id, startsAt: '2026-10-19T18:00:00.000Z', payment: { method: 'cortesia' } },
      }),
      'Escolha um plano ou informe a data de término.',
    )
    await expectFieldError(
      createSub({
        collection: 'subscriptions',
        ...asStaff(),
        data: {
          assinante: sub.id,
          startsAt: '2026-10-19T18:00:00.000Z',
          endsAt: '2026-10-19T18:00:00.000Z',
          payment: { method: 'cortesia' },
        },
      }),
      'A data de término precisa ser depois do início.',
    )
    await expect(
      createSub({
        collection: 'subscriptions',
        ...asStaff(),
        data: { assinante: sub.id, plan: mensal.id, startsAt: '2026-10-19T18:00:00.000Z', payment: {} } as never,
      }),
    ).rejects.toThrow()
    await expect(
      createSub({
        collection: 'subscriptions',
        ...asStaff(),
        data: {
          assinante: sub.id,
          plan: mensal.id,
          startsAt: '2026-10-19T18:00:00.000Z',
          payment: { method: 'pix', amount: -1 },
        },
      }),
    ).rejects.toThrow()
  })

  it('access state follows the dates, with no job (ASS-04)', async () => {
    await seedSubscription(payload, { assinanteId: sub.id, planId: mensal.id, startsAt: '2026-10-19T18:00:00.000Z' })
    const active = await getAccessStatus(sub.id, new Date('2026-11-17T23:00:00Z'))
    expect(active.state).toBe('ativa')
    expect(active.validUntilLabel).toBe('17 de novembro de 2026')
    expect(active.daysLeft).toBe(1)

    const expired = await getAccessStatus(sub.id, new Date('2026-11-18T03:00:00Z'))
    expect(expired.state).toBe('vencida')
    expect(expired.lastEndedAt?.toISOString()).toBe('2026-11-18T03:00:00.000Z')

    const other = await seedAssinante(payload, { email: 'sem@teste.local', password: 'senha-sem-1234', name: 'Sem' })
    expect((await getAccessStatus(other.id, new Date('2026-11-01T12:00:00Z'))).state).toBe('sem-assinatura')
  })

  it('a period ended by staff ends the access and clears accessUntil', async () => {
    const period = await seedSubscription(payload, {
      assinanteId: sub.id,
      planId: mensal.id,
      startsAt: '2026-10-19T18:00:00.000Z',
    })
    const updated = await payload.update({
      collection: 'subscriptions',
      id: period.id,
      ...asStaff(),
      data: { status: 'encerrada' },
    })
    expect(updated.closedAt).toBeTruthy()
    const status = await getAccessStatus(sub.id, new Date('2026-10-25T12:00:00Z'))
    expect(status.state).toBe('encerrada')
    const account = await payload.findByID({ collection: 'assinantes', id: sub.id, overrideAccess: true })
    expect(account.accessUntil ?? null).toBeNull()
  })

  it('subscribers and anonymous callers cannot read or write periods or their own accessUntil (T-03-06)', async () => {
    await seedSubscription(payload, { assinanteId: sub.id, planId: mensal.id, startsAt: '2026-10-19T18:00:00.000Z' })
    const me = { ...sub, collection: 'assinantes' } as never
    for (const user of [me, undefined]) {
      const res = await payload
        .find({ collection: 'subscriptions', overrideAccess: false, user })
        .catch((e: Error) => e)
      if (res instanceof Error) expect(res.message).toMatch(DENIED)
      else expect(res.docs).toHaveLength(0)
      await expect(
        createSub({
          collection: 'subscriptions',
          overrideAccess: false,
          user,
          data: { assinante: sub.id, plan: mensal.id, startsAt: '2026-10-19T18:00:00.000Z', payment: { method: 'pix' } },
        }),
      ).rejects.toThrow(DENIED)
      await expect(
        payload.update({
          collection: 'assinantes',
          id: sub.id,
          overrideAccess: false,
          user,
          data: { accessUntil: '2030-01-01T03:00:00.000Z' },
        }),
      ).rejects.toThrow(DENIED)
    }
  })

  it('staff cannot delete periods (history is kept)', async () => {
    const period = await seedSubscription(payload, {
      assinanteId: sub.id,
      planId: mensal.id,
      startsAt: '2026-10-19T18:00:00.000Z',
    })
    await expect(payload.delete({ collection: 'subscriptions', id: period.id, ...asStaff() })).rejects.toThrow(DENIED)
  })

  it('recomputes accessUntil with context skipAudit', async () => {
    const spy = vi.spyOn(payload, 'update')
    await createSub({
      collection: 'subscriptions',
      ...asStaff(),
      data: { assinante: sub.id, plan: mensal.id, startsAt: '2026-10-19T18:00:00.000Z', payment: { method: 'pix' } },
    })
    const calls = spy.mock.calls.filter(([args]) => (args as { collection: string }).collection === 'assinantes')
    expect(calls.length).toBeGreaterThan(0)
    for (const [args] of calls) {
      expect((args as { context?: Record<string, unknown> }).context?.skipAudit).toBe(true)
    }
  })
})
