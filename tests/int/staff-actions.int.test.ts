import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { assinanteEndpoints } from '../../src/lib/assinantes/endpoints'
import { endAccess, getSituacao, grantOrRenew } from '../../src/lib/assinantes/service'
import { accessStatusFor } from '../../src/lib/assinantes/status'
import { getTestPayload, resetDatabase, seedAssinante, seedPlan, seedStaffUser } from '../helpers/seed'

const NOW = new Date('2026-10-19T18:00:00.000Z')

describe('liberar / renovar / encerrar (PAINEL-05, D-05, D-06, T-03-06, T-03-15)', () => {
  let payload: Payload
  let staffReq: PayloadRequest
  let staffUser: Record<string, unknown>
  let mensal: { id: number }
  let trimestral: { id: number }
  let acc: { id: number; name: string; email: string }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-acoes@teste.local', password: 'senha-equipe-123' })
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    staffReq = await createLocalReq({ user: staffUser as never }, payload)
    mensal = await seedPlan(payload, { name: 'Mensal', durationDays: 30, price: 30, order: 1 })
    trimestral = await seedPlan(payload, { name: 'Trimestral', durationDays: 90, price: 75, promoPrice: 60, order: 2 })
    await seedPlan(payload, { name: 'Antigo', durationDays: 30, price: 10, active: false })
    acc = await seedAssinante(payload, { email: 'acao@teste.local', password: 'senha-acao-1234', name: 'Ação Teste' })
  })

  const auditRows = async (action: string) =>
    (
      await payload.find({
        collection: 'audit-log',
        where: { action: { equals: action } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs

  it('grants, then renews from the current end, with the plan price as default amount', async () => {
    const first = await grantOrRenew(payload, { assinanteId: acc.id, planId: mensal.id, method: 'pix', req: staffReq, now: NOW })
    expect(first.action).toBe('acesso-liberado')
    expect(first.startsAt).toBe(NOW.toISOString())
    expect(first.endsAt).toBe('2026-11-18T03:00:00.000Z')
    expect(first.validUntilLabel).toBe('17 de novembro de 2026')
    const period = await payload.findByID({ collection: 'subscriptions', id: first.subscriptionId, overrideAccess: true })
    expect(period.payment?.amount).toBe(30)

    const second = await grantOrRenew(payload, {
      assinanteId: acc.id,
      planId: mensal.id,
      method: 'pix',
      req: staffReq,
      now: new Date('2026-11-10T15:00:00.000Z'),
    })
    expect(second.action).toBe('acesso-renovado')
    expect(second.startsAt).toBe('2026-11-18T03:00:00.000Z')
    expect(second.endsAt).toBe('2026-12-18T03:00:00.000Z')

    const promo = await grantOrRenew(payload, {
      assinanteId: acc.id,
      planId: trimestral.id,
      method: 'pagbank',
      req: staffReq,
      now: new Date('2026-11-10T15:00:00.000Z'),
    })
    const promoPeriod = await payload.findByID({ collection: 'subscriptions', id: promo.subscriptionId, overrideAccess: true })
    expect(promoPeriod.payment?.amount).toBe(60)
    expect((await auditRows('acesso-liberado')).length).toBe(1)
    expect((await auditRows('acesso-renovado')).length).toBe(2)
  })

  it('courtesy needs a number of days', async () => {
    await expect(
      grantOrRenew(payload, { assinanteId: acc.id, planId: null, method: 'cortesia', req: staffReq, now: NOW }),
    ).rejects.toThrow('Escolha um plano ou informe quantos dias de acesso.')
    const r = await grantOrRenew(payload, {
      assinanteId: acc.id,
      planId: null,
      durationDays: 7,
      method: 'cortesia',
      req: staffReq,
      now: NOW,
    })
    expect(r.endsAt).toBe('2026-10-26T03:00:00.000Z')
    const period = await payload.findByID({ collection: 'subscriptions', id: r.subscriptionId, overrideAccess: true })
    expect(period.payment?.amount).toBe(0)
  })

  it('rejects unknown payment methods and negative amounts', async () => {
    await expect(
      grantOrRenew(payload, { assinanteId: acc.id, planId: mensal.id, method: 'bitcoin' as never, req: staffReq, now: NOW }),
    ).rejects.toThrow('Escolha a forma de pagamento.')
    await expect(
      grantOrRenew(payload, { assinanteId: acc.id, planId: mensal.id, method: 'pix', amount: -5, req: staffReq, now: NOW }),
    ).rejects.toThrow('Informe um valor válido.')
  })

  it('ends every active or future period with one audit row', async () => {
    await grantOrRenew(payload, { assinanteId: acc.id, planId: mensal.id, method: 'pix', req: staffReq, now: NOW })
    await grantOrRenew(payload, { assinanteId: acc.id, planId: mensal.id, method: 'pix', req: staffReq, now: NOW })
    await expect(endAccess(payload, { assinanteId: acc.id, reason: '  ', req: staffReq, now: NOW })).rejects.toThrow(
      'Informe o motivo.',
    )
    const later = new Date('2026-10-20T12:00:00.000Z')
    const r = await endAccess(payload, { assinanteId: acc.id, reason: 'Pedido do cliente', req: staffReq, now: later })
    expect(r.ended).toBe(2)
    expect((await accessStatusFor(payload, acc.id, later)).state).toBe('encerrada')
    const rows = await auditRows('acesso-encerrado')
    expect(rows).toHaveLength(1)
    expect(rows[0].details).toMatchObject({ motivo: 'Pedido do cliente' })
  })

  it('getSituacao returns state, active plans and recent periods', async () => {
    await grantOrRenew(payload, { assinanteId: acc.id, planId: mensal.id, method: 'pix', req: staffReq, now: NOW })
    const s = await getSituacao(payload, acc.id, NOW)
    expect(s.access.state).toBe('ativa')
    expect(s.plans.map((p) => p.name)).toEqual(['Mensal', 'Trimestral'])
    expect(s.periods).toHaveLength(1)
    expect(s.assinante.name).toBe('Ação Teste')
  })

  describe('endpoints', () => {
    const handler = (path: string, method: string) => assinanteEndpoints.find((e) => e.path === path && e.method === method)!.handler

    async function call(path: string, method: string, user: unknown, body?: unknown) {
      const req = await createLocalReq({ user: user as never }, payload)
      req.routeParams = { id: String(acc.id) }
      ;(req as unknown as { json: () => Promise<unknown> }).json = async () => body ?? {}
      const res = await handler(path, method)(req)
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }

    it('refuse subscribers and anonymous callers', async () => {
      const sub = { ...acc, collection: 'assinantes' }
      for (const user of [sub, null]) {
        expect((await call('/:id/situacao', 'get', user)).status).toBe(403)
        expect((await call('/:id/liberar', 'post', user, { planId: mensal.id, method: 'pix' })).status).toBe(403)
        expect((await call('/:id/encerrar', 'post', user, { reason: 'x' })).status).toBe(403)
      }
      expect((await accessStatusFor(payload, acc.id, new Date())).state).toBe('sem-assinatura')
    })

    it('answer 400 with the Portuguese message on invalid input and 200 on success', async () => {
      const bad = await call('/:id/liberar', 'post', staffUser, { planId: null, method: 'cortesia' })
      expect(bad.status).toBe(400)
      expect(bad.body.message).toBe('Escolha um plano ou informe quantos dias de acesso.')
      const ok = await call('/:id/liberar', 'post', staffUser, {
        planId: mensal.id,
        method: 'pix',
        // dates from the client are ignored (T-03-15)
        startsAt: '2020-01-01T00:00:00.000Z',
        endsAt: '2099-01-01T00:00:00.000Z',
      })
      expect(ok.status).toBe(200)
      expect(ok.body.validUntilLabel).toBeTruthy()
      expect(String(ok.body.endsAt)).not.toContain('2099')
      const situacao = await call('/:id/situacao', 'get', staffUser)
      expect(situacao.status).toBe(200)
      expect((situacao.body.access as { state: string }).state).toBe('ativa')
      const end = await call('/:id/encerrar', 'post', staffUser, { reason: 'Teste' })
      expect(end.status).toBe(200)
      expect(end.body.ended).toBe(1)
    })
  })
})
