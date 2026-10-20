import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { expire } from '../../src/lib/cache/expire'
import { visibleRecadosWhere } from '../../src/lib/recados/visibility'
import { expectFieldError } from '../helpers/errors'
import {
  getTestPayload,
  resetDatabase,
  seedAssinante,
  seedRecado,
  seedStaffUser,
  seedSubscription,
  seedVisibleRecado,
} from '../helpers/seed'

// The cache-expiry hooks are observed through this spy (T-05-04 pattern of 04-07)
vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

const DENIED = /permiss|forbidden|not allowed/i
const NOW = new Date('2026-10-20T18:00:00.000Z')
const DAY = 86_400_000

describe('recados collection (REC-01, D-01, T-05-03, T-05-04, T-05-12)', () => {
  let payload: Payload
  let sub: Record<string, unknown> & { collection: 'assinantes' }
  let staff: Record<string, unknown> & { collection: 'users' }
  let subId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const s = await seedAssinante(payload, { email: 'autor@teste.local', password: 'senha-assinante-1', name: 'Autor' })
    subId = s.id
    sub = { ...(s as unknown as Record<string, unknown>), collection: 'assinantes' }
    const u = await seedStaffUser(payload, { email: 'staff-recados@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    vi.mocked(expire).mockClear()
  })

  it('nobody but staff can read or write recados through the API', async () => {
    const r = await seedRecado(payload, { author: subId, status: 'aprovado' })
    for (const user of [undefined, sub]) {
      const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
      await expect(payload.find({ collection: 'recados', ...as })).rejects.toThrow(DENIED)
      await expect(payload.findByID({ collection: 'recados', id: r.id, ...as })).rejects.toThrow(DENIED)
      await expect(
        payload.create({ collection: 'recados', ...as, data: { author: subId, apelido: 'x', texto: 'y' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(
        payload.update({ collection: 'recados', id: r.id, ...as, data: { status: 'aprovado' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(payload.delete({ collection: 'recados', id: r.id, ...as })).rejects.toThrow(DENIED)
    }
    const staffAs = { overrideAccess: false, user: staff as never }
    expect((await payload.find({ collection: 'recados', ...staffAs })).totalDocs).toBe(1)
    const updated = await payload.update({ collection: 'recados', id: r.id, ...staffAs, data: { motivo: 'ok' } as never })
    expect(updated.motivo).toBe('ok')
  })

  it('validates in pt, computes the resumo and defaults the status to pendente', async () => {
    const create = (data: Record<string, unknown>) =>
      payload.create({ collection: 'recados', overrideAccess: false, user: staff as never, data: { author: subId, ...data } as never })
    await expectFieldError(create({ texto: 'oi' }), 'Escolha um apelido.')
    await expectFieldError(create({ apelido: 'Bia', texto: 'a'.repeat(501) }), 'O recado pode ter até 500 caracteres.')
    const doc = await create({ apelido: 'Bia', texto: 'Um recado da Bia para todo mundo' })
    expect(doc.status).toBe('pendente')
    expect(doc.resumo).toBe('Bia — Um recado da Bia para todo mundo')
    expect(doc.submittedAt).toBeTruthy()
  })

  it('stores texto already redacted, whoever writes it (T-05-03)', async () => {
    const doc = await seedRecado(payload, { author: subId, texto: 'chama 61 98877-6655 ou casal@exemplo.com hoje' })
    expect(doc.texto).not.toMatch(/98877|casal@/)
    expect(doc.texto).toContain('[contato só para assinantes]')
    const stored = await payload.findByID({ collection: 'recados', id: doc.id, overrideAccess: true })
    expect(stored.contatosRemovidos).toBe(2)
  })

  it('shows only approved recados of authors with access; renewal brings them back', async () => {
    const active = await seedAssinante(payload, { email: 'ativo@teste.local', password: 'senha-teste-1234', name: 'Ativo' })
    await seedSubscription(payload, {
      assinanteId: active.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + DAY).toISOString(),
    })
    const A = await seedRecado(payload, { author: active.id, status: 'aprovado' })
    await seedRecado(payload, { author: active.id, status: 'pendente' })
    await seedRecado(payload, { author: active.id, status: 'recusado' })
    const expired = await seedAssinante(payload, { email: 'vencido@teste.local', password: 'senha-teste-1234', name: 'Vencido' })
    await seedSubscription(payload, {
      assinanteId: expired.id,
      startsAt: new Date(NOW.getTime() - 30 * DAY).toISOString(),
      endsAt: new Date(NOW.getTime() - DAY).toISOString(),
    })
    const B = await seedRecado(payload, { author: expired.id, status: 'aprovado' })

    const ids = async (now: Date) =>
      (await payload.find({ collection: 'recados', where: visibleRecadosWhere(now), overrideAccess: true })).docs.map((d) => d.id)
    expect(await ids(NOW)).toEqual([A.id])

    await seedSubscription(payload, {
      assinanteId: expired.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 10 * DAY).toISOString(),
    })
    expect((await ids(NOW)).sort()).toEqual([A.id, B.id].sort())
    // São Paulo midnight edge: access ends at 03:00:00Z
    expect(await ids(new Date(NOW.getTime() + DAY + 1))).toEqual([B.id])
  })

  it('accepts a clean account apelido and rejects one with a contact', async () => {
    const ok = await payload.update({ collection: 'assinantes', id: subId, data: { apelido: 'Casal BSB' }, overrideAccess: true, context: { skipAudit: true } })
    expect((ok as { apelido?: string }).apelido).toBe('Casal BSB')
    await expect(
      payload.update({ collection: 'assinantes', id: subId, data: { apelido: 'bia@x.test' } as never, overrideAccess: true, context: { skipAudit: true } }),
    ).rejects.toThrow()
  })

  it('deleting an account deletes its recados', async () => {
    const { author, recado } = await seedVisibleRecado(payload, { authorEmail: 'apagar@teste.local' })
    await payload.delete({ collection: 'assinantes', id: author.id, overrideAccess: true, context: { skipAudit: true } })
    const gone = await payload.find({ collection: 'recados', where: { id: { equals: recado.id } }, overrideAccess: true })
    expect(gone.totalDocs).toBe(0)
  })

  it('subscription and recado changes expire the recados tag', async () => {
    const acc = await seedAssinante(payload, { email: 'tag@teste.local', password: 'senha-teste-1234', name: 'Tag' })
    vi.mocked(expire).mockClear()
    const period = await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + DAY).toISOString(),
    })
    expect(vi.mocked(expire).mock.calls.some(([tags]) => tags.includes('recados') && tags.includes('ads'))).toBe(true)
    vi.mocked(expire).mockClear()
    await payload.update({ collection: 'subscriptions', id: period.id, data: { status: 'encerrada' }, overrideAccess: true, context: { skipAudit: true } })
    expect(vi.mocked(expire).mock.calls.some(([tags]) => tags.includes('recados'))).toBe(true)
    vi.mocked(expire).mockClear()
    await seedRecado(payload, { author: acc.id })
    expect(vi.mocked(expire).mock.calls.some(([tags]) => tags.includes('recados'))).toBe(true)
  })
})
