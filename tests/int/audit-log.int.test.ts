import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { AuditLog } from '../../src/payload-types'
import { getTestPayload, resetDatabase, seedAssinante, seedPlan, seedStaffUser } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i
const STAFF_EMAIL = 'staff-audit@teste.local'
const TEMP_PASSWORD = 'senha-secreta-123'

describe('audit log (PAINEL-08, D-06, T-03-09, T-03-10)', () => {
  let payload: Payload
  let staff: Record<string, unknown>
  let mensal: { id: number }

  const asStaff = () => ({ overrideAccess: false, user: staff as never })
  const rows = async (where: Record<string, unknown> = {}) =>
    (await payload.find({ collection: 'audit-log', where: where as never, sort: 'createdAt', limit: 100, depth: 0, overrideAccess: true }))
      .docs as AuditLog[]
  const createSub = (args: Record<string, unknown>) => payload.create(args as never) as Promise<{ id: number }>

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: STAFF_EMAIL, password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    mensal = await seedPlan(payload, { name: 'Mensal', durationDays: 30, price: 30 })
  })

  async function createAccount(name = 'Bia Teste', email = 'bia@teste.local') {
    return payload.create({
      collection: 'assinantes',
      ...asStaff(),
      data: { name, email, password: TEMP_PASSWORD },
    })
  }

  it('records account creation, edits and staff notes without their content', async () => {
    const acc = await createAccount()
    let log = await rows()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      action: 'conta-criada',
      actorType: 'equipe',
      actorLabel: STAFF_EMAIL,
      assinanteLabel: 'Bia Teste <bia@teste.local>',
    })

    await payload.update({ collection: 'assinantes', id: acc.id, ...asStaff(), data: { name: 'Bia Silva' } })
    await payload.update({ collection: 'assinantes', id: acc.id, ...asStaff(), data: { staffNotes: 'pagou em dinheiro' } })
    log = await rows({ action: { equals: 'conta-editada' } })
    expect(log.map((r) => r.details)).toEqual([{ name: { de: 'Bia Teste', para: 'Bia Silva' } }, { staffNotes: 'alterada' }])
  })

  it('records grants, renewals, endings and corrections on periods', async () => {
    const acc = await createAccount()
    const first = await createSub({
      collection: 'subscriptions',
      ...asStaff(),
      data: {
        assinante: acc.id,
        plan: mensal.id,
        startsAt: '2026-10-19T18:00:00.000Z',
        payment: { method: 'pix', amount: 30, paidAt: '2026-10-19T18:00:00.000Z', note: 'comprovante no WhatsApp' },
      },
    })
    await createSub({
      collection: 'subscriptions',
      ...asStaff(),
      data: {
        assinante: acc.id,
        plan: mensal.id,
        startsAt: '2026-11-18T03:00:00.000Z',
        payment: { method: 'pagbank', amount: 30 },
      },
    })
    const grants = await rows({ action: { in: ['acesso-liberado', 'acesso-renovado'] } })
    expect(grants.map((r) => r.action)).toEqual(['acesso-liberado', 'acesso-renovado'])
    expect(grants[0].details).toMatchObject({
      pagamento: { plano: 'Mensal', valor: 30, forma: 'Pix', observação: 'comprovante no WhatsApp' },
    })
    expect((grants[0].details as { pagamento: { data: string } }).pagamento.data).toBeTruthy()

    await payload.update({
      collection: 'subscriptions',
      id: first.id,
      ...asStaff(),
      data: { endsAt: '2026-11-20T03:00:00.000Z' },
    })
    const fix = await rows({ action: { equals: 'periodo-corrigido' } })
    expect(fix).toHaveLength(1)
    expect(fix[0].details).toMatchObject({ endsAt: { para: '2026-11-20T03:00:00.000Z' } })

    await payload.update({ collection: 'subscriptions', id: first.id, ...asStaff(), data: { status: 'encerrada' } })
    expect(await rows({ action: { equals: 'acesso-encerrado' } })).toHaveLength(1)

    // accessUntil recomputes (skipAudit) never add 'conta-editada'
    expect(await rows({ action: { equals: 'conta-editada' } })).toHaveLength(0)
  })

  it('never stores secrets', async () => {
    const acc = await createAccount()
    await payload.update({ collection: 'assinantes', id: acc.id, ...asStaff(), data: { password: 'outra-senha-456' } })
    const json = JSON.stringify(await rows())
    for (const secret of ['"hash"', '"salt"', '"sessions"', TEMP_PASSWORD, 'outra-senha-456']) {
      expect(json).not.toContain(secret)
    }
  })

  it('is append-only and staff-only', async () => {
    await createAccount()
    const [row] = await rows()
    await expect(
      payload.create({ collection: 'audit-log', ...asStaff(), data: { action: 'conta-criada', summary: 'x' } as never }),
    ).rejects.toThrow(DENIED)
    await expect(
      payload.update({ collection: 'audit-log', id: row.id, ...asStaff(), data: { summary: 'adulterado' } }),
    ).rejects.toThrow(DENIED)
    await expect(payload.delete({ collection: 'audit-log', id: row.id, ...asStaff() })).rejects.toThrow(DENIED)
    expect((await payload.find({ collection: 'audit-log', ...asStaff() })).docs.length).toBeGreaterThan(0)

    const sub = await seedAssinante(payload, { email: 'curioso@teste.local', password: 'senha-curioso-1', name: 'Curioso' })
    for (const user of [{ ...sub, collection: 'assinantes' }, undefined]) {
      const res = await payload
        .find({ collection: 'audit-log', overrideAccess: false, user: user as never })
        .catch((e: Error) => e)
      if (res instanceof Error) expect(res.message).toMatch(DENIED)
      else expect(res.docs).toHaveLength(0)
    }
  })

  it('deleting an account with periods keeps one conta-excluida row', async () => {
    const acc = await createAccount()
    await createSub({
      collection: 'subscriptions',
      ...asStaff(),
      data: { assinante: acc.id, plan: mensal.id, startsAt: '2026-10-19T18:00:00.000Z', payment: { method: 'pix' } },
    })
    await payload.delete({ collection: 'assinantes', id: acc.id, ...asStaff() })
    const deleted = await rows({ action: { equals: 'conta-excluida' } })
    expect(deleted).toHaveLength(1)
    expect(deleted[0].assinante ?? null).toBeNull()
    expect(deleted[0].assinanteLabel).toBe('Bia Teste <bia@teste.local>')
    expect(deleted[0].details).toMatchObject({ periodosRemovidos: 1 })
  })
})
