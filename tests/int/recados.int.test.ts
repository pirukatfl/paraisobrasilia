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
    const updated = await payload.update({ collection: 'recados', id: r.id, ...staffAs, data: { apelido: 'Ok Apelido' } as never })
    expect(updated.apelido).toBe('Ok Apelido')
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

describe('recados service and board (REC-01, D-01)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })

  const active = async (email: string, now: Date = NOW) => {
    const acc = await seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0]! })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(now.getTime() - DAY).toISOString(),
      endsAt: new Date(now.getTime() + 20 * DAY).toISOString(),
    })
    return acc
  }

  it('creates a pendente recado, redacts the text and saves the apelido on the account', async () => {
    const { createRecado } = await import('../../src/lib/recados/service')
    const acc = await active('dona@teste.local')
    const created = await createRecado(payload, {
      assinanteId: acc.id,
      input: { apelido: 'Dona Flor', texto: 'Oi! Zap 61 98877-6655' },
      now: NOW,
    })
    expect(created.contatosRemovidos).toBe(1)
    const doc = await payload.findByID({ collection: 'recados', id: created.id, overrideAccess: true })
    expect(doc).toMatchObject({ status: 'pendente', apelido: 'Dona Flor', submittedAt: NOW.toISOString() })
    expect(doc.texto).not.toContain('98877')
    const account = await payload.findByID({ collection: 'assinantes', id: acc.id, overrideAccess: true })
    expect((account as { apelido?: string }).apelido).toBe('Dona Flor')
  })

  it('limits to 3 active recados; refused ones do not count', async () => {
    const { createRecado } = await import('../../src/lib/recados/service')
    const { RECADO_MESSAGES } = await import('../../src/lib/recados/rules')
    const acc = await active('limite@teste.local')
    const input = { apelido: 'Lim', texto: 'Um recado qualquer' }
    await createRecado(payload, { assinanteId: acc.id, input, now: NOW })
    await createRecado(payload, { assinanteId: acc.id, input, now: NOW })
    const third = await createRecado(payload, { assinanteId: acc.id, input, now: NOW })
    await expect(createRecado(payload, { assinanteId: acc.id, input, now: NOW })).rejects.toMatchObject({
      code: 'limite',
      status: 409,
      message: RECADO_MESSAGES.limite,
    })
    await payload.update({ collection: 'recados', id: third.id, data: { status: 'recusado', motivo: 'x' }, overrideAccess: true })
    await expect(createRecado(payload, { assinanteId: acc.id, input, now: NOW })).resolves.toBeTruthy()
  })

  it('deleteRecado only deletes the owner\'s recado', async () => {
    const { deleteRecado } = await import('../../src/lib/recados/service')
    const a = await active('a@teste.local')
    const b = await active('b@teste.local')
    const r = await seedRecado(payload, { author: a.id })
    await expect(deleteRecado(payload, { assinanteId: b.id, id: r.id })).rejects.toMatchObject({ code: 'nao-encontrado', status: 404 })
    await expect(deleteRecado(payload, { assinanteId: a.id, id: 'abc' })).rejects.toMatchObject({ code: 'nao-encontrado' })
    await deleteRecado(payload, { assinanteId: a.id, id: r.id })
    expect((await payload.count({ collection: 'recados', overrideAccess: true })).totalDocs).toBe(0)
  })

  it('lists own recados with labels, including the off-board one for an ended period', async () => {
    const { listOwnRecados } = await import('../../src/lib/recados/service')
    const acc = await seedAssinante(payload, { email: 'fora@teste.local', password: 'senha-teste-1234', name: 'Fora' })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW.getTime() - 30 * DAY).toISOString(),
      endsAt: new Date(NOW.getTime() - DAY).toISOString(),
    })
    await seedRecado(payload, { author: acc.id, status: 'aprovado' })
    await seedRecado(payload, { author: acc.id, status: 'recusado', motivo: 'Fora das regras' })
    const list = await listOwnRecados(payload, acc.id, NOW)
    expect(list.map((r) => r.statusLabel).sort()).toEqual(['Fora do ar: assinatura vencida', 'Recusado'])
    expect(list.find((r) => r.status === 'recusado')!.motivo).toBe('Fora das regras')
  })

  it('board: newest first, 20 per page, own flag, no author data', async () => {
    const { findVisibleRecados } = await import('../../src/lib/recados/board')
    const me = await active('eu@teste.local')
    const other = await active('outro@teste.local')
    for (let i = 1; i <= 21; i++) {
      await seedRecado(payload, {
        author: i === 3 ? me.id : other.id,
        status: 'aprovado',
        apelido: `Ap ${i}`,
        publishedAt: new Date(NOW.getTime() - (30 - i) * 60_000).toISOString(),
      })
    }
    const page1 = await findVisibleRecados(payload, { page: 1 }, NOW, me.id)
    expect(page1.items).toHaveLength(20)
    expect(page1.total).toBe(21)
    expect(page1.totalPages).toBe(2)
    expect(page1.items[0]!.apelido).toBe('Ap 21')
    expect(page1.items.filter((r) => r.isOwn).map((r) => r.apelido)).toEqual(['Ap 3'])
    const page2 = await findVisibleRecados(payload, { page: 2 }, NOW, me.id)
    expect(page2.items.map((r) => r.apelido)).toEqual(['Ap 1'])
    const json = JSON.stringify(page1)
    expect(json).not.toContain('@teste.local')
    expect(json).not.toMatch(/"author"/)
  })
})
