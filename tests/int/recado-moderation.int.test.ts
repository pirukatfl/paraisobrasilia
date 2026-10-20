import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { recadoEndpoints } from '../../src/lib/recados/endpoints'
import { countPendingRecados, getRecadoModerationView, moderateRecado } from '../../src/lib/recados/service'
import { getTestPayload, resetDatabase, seedAssinante, seedRecado, seedStaffUser } from '../helpers/seed'

// REC-04: staff moderation of recados, audited (T-05-06)
const NOW = new Date('2026-10-20T18:00:00.000Z')
const MOTIVO_MSG = 'Escreva o motivo (até 300 caracteres).'

describe('recados moderation (REC-04, T-05-06)', () => {
  let payload: Payload
  let staffReq: PayloadRequest
  let subReq: PayloadRequest
  let staffUser: Record<string, unknown>
  let author: { id: number; name: string; email: string }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, { email: 'staff-rmod@teste.local', password: 'senha-equipe-123' })
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    staffReq = await createLocalReq({ user: staffUser as never }, payload)
    author = await seedAssinante(payload, { email: 'rita@teste.local', password: 'senha-rita-1234', name: 'Rita' })
    subReq = await createLocalReq({ user: { ...author, collection: 'assinantes' } as never }, payload)
  })

  const load = (id: number) => payload.findByID({ collection: 'recados', id, depth: 0, overrideAccess: true })
  const audit = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true })).docs

  it('approves with publishedAt, moderator and an audit row', async () => {
    const r = await seedRecado(payload, { author: author.id })
    expect(await moderateRecado(staffReq, r.id, 'aprovar', { now: NOW })).toEqual({
      status: 'aprovado',
      statusLabel: 'Publicado',
    })
    const after = await load(r.id)
    expect(after.status).toBe('aprovado')
    expect(after.publishedAt).toBe(NOW.toISOString())
    expect(after.moderatedBy).toBe(staffUser.id)
    const rows = await audit('recado-aprovado')
    expect(rows).toHaveLength(1)
    expect(rows[0].assinante).toBe(author.id)
    expect(rows[0].summary).toContain(`Recado #${r.id}`)
  })

  it('refuses with a reason; rejects empty/long reasons and wrong transitions', async () => {
    const r = await seedRecado(payload, { author: author.id })
    for (const motivo of ['', '  ', 'x'.repeat(301)]) {
      const err = await moderateRecado(staffReq, r.id, 'recusar', { motivo, now: NOW }).catch((e) => e)
      expect(err.status).toBe(400)
      expect(err.message).toBe(MOTIVO_MSG)
    }
    await moderateRecado(staffReq, r.id, 'recusar', { motivo: 'Ofensivo', now: NOW })
    const after = await load(r.id)
    expect(after.status).toBe('recusado')
    expect(after.motivo).toBe('Ofensivo')
    expect(await audit('recado-recusado')).toHaveLength(1)

    const err = await moderateRecado(staffReq, r.id, 'recusar', { motivo: 'De novo', now: NOW }).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.message).toBe('Este recado já está recusado.')
  })

  it('unpublishes an approved recado and approves it again clearing the reason', async () => {
    const r = await seedRecado(payload, { author: author.id, status: 'aprovado' })
    await moderateRecado(staffReq, r.id, 'despublicar', { motivo: 'Pedido da pessoa', now: NOW })
    expect((await load(r.id)).status).toBe('despublicado')
    expect(await audit('recado-despublicado')).toHaveLength(1)
    await moderateRecado(staffReq, r.id, 'aprovar', { now: NOW })
    const after = await load(r.id)
    expect(after.status).toBe('aprovado')
    expect(after.motivo ?? null).toBeNull()
  })

  it('a non-staff principal cannot moderate; unknown ids answer 404', async () => {
    const r = await seedRecado(payload, { author: author.id })
    expect((await moderateRecado(subReq, r.id, 'aprovar', { now: NOW }).catch((e) => e)).status).toBe(403)
    expect((await load(r.id)).status).toBe('pendente')
    expect((await moderateRecado(staffReq, 999999, 'aprovar', { now: NOW }).catch((e) => e)).status).toBe(404)
    expect((await getRecadoModerationView(subReq, r.id).catch((e) => e)).status).toBe(403)
  })

  it('a signed-in write of status through the API keeps the stored status', async () => {
    const r = await seedRecado(payload, { author: author.id })
    await payload.update({
      collection: 'recados',
      id: r.id,
      data: { status: 'aprovado', motivo: 'x' } as never,
      overrideAccess: false,
      user: staffUser as never,
    })
    const after = await load(r.id)
    expect(after.status).toBe('pendente')
    expect(after.motivo ?? null).toBeNull()
  })

  it('endpoints answer 403 to a non-staff principal and counts pending', async () => {
    const r = await seedRecado(payload, { author: author.id })
    expect(await countPendingRecados(payload)).toBe(1)
    for (const ep of recadoEndpoints.filter((e) => /\/(moderacao|aprovar|recusar|despublicar)$/.test(e.path))) {
      const res = await ep.handler({ ...subReq, routeParams: { id: String(r.id) } } as never)
      expect(res.status).toBe(403)
    }
    const view = await getRecadoModerationView(staffReq, r.id)
    expect(view.status).toBe('pendente')
    expect(view.apelido).toBe('Apelido Teste')
  })
})
