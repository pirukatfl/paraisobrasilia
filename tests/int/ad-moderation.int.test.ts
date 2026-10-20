import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { adEndpoints } from '../../src/lib/classisex/endpoints'
import { approveAd, getModerationCounts, rejectAd, unpublishAd, updateAd } from '../../src/lib/classisex/service'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedStaffUser } from '../helpers/seed'

const NOW = new Date('2026-10-19T18:00:00.000Z')
const MOTIVO_MSG = 'Escreva o motivo (até 300 caracteres).'

describe('moderation (PAINEL-07, CLAS-04, D-03, T-04-04, T-04-13)', () => {
  let payload: Payload
  let staffReq: PayloadRequest
  let staffUser: Record<string, unknown>
  let author: { id: number; name: string; email: string }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const u = await seedStaffUser(payload, { email: 'staff-mod@teste.local', password: 'senha-equipe-123' })
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    staffReq = await createLocalReq({ user: staffUser as never }, payload)
    author = await seedAssinante(payload, { email: 'cris@teste.local', password: 'senha-cris-1234', name: 'Cris Anuncia' })
  })

  const load = (id: number) => payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })
  const auditRows = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true })).docs

  it('approves a pending ad with publishedAt, moderator and an audit row', async () => {
    const ad = await seedAd(payload, { author: author.id })
    const result = await approveAd(staffReq, ad.id, NOW)
    expect(result).toEqual({ status: 'aprovado', statusLabel: 'Publicado' })
    const after = await load(ad.id)
    expect(after.status).toBe('aprovado')
    expect(after.publishedAt).toBe(NOW.toISOString())
    expect(after.moderatedAt).toBe(NOW.toISOString())
    expect(after.moderatedBy).toBe(staffUser.id)
    expect(after.motivo ?? null).toBeNull()
    const rows = await auditRows('anuncio-aprovado')
    expect(rows).toHaveLength(1)
    expect(rows[0].actorType).toBe('equipe')
    expect(rows[0].assinante).toBe(author.id)
    expect(rows[0].summary).toContain(`Anúncio #${ad.id}`)
    expect(rows[0].summary).toContain('aprovado')
  })

  it('rejects with a reason; refuses empty/long reasons and wrong transitions', async () => {
    const ad = await seedAd(payload, { author: author.id })
    for (const motivo of ['', '  ', 'x'.repeat(301)]) {
      const err = await rejectAd(staffReq, ad.id, motivo, NOW).catch((e) => e)
      expect(err.status).toBe(400)
      expect(err.message).toBe(MOTIVO_MSG)
    }
    await rejectAd(staffReq, ad.id, 'Contato no texto', NOW)
    const after = await load(ad.id)
    expect(after.status).toBe('recusado')
    expect(after.motivo).toBe('Contato no texto')
    const rows = await auditRows('anuncio-recusado')
    expect(rows).toHaveLength(1)
    expect((rows[0].details as { motivo?: string }).motivo).toBe('Contato no texto')

    const approved = await seedAd(payload, { author: author.id, status: 'aprovado' })
    const err = await rejectAd(staffReq, approved.id, 'Motivo qualquer', NOW).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.message).toBe('Este anúncio já está publicado.')
  })

  it('unpublishes an approved ad and approves it again with a fresh publishedAt', async () => {
    const ad = await seedAd(payload, { author: author.id, status: 'aprovado', publishedAt: '2026-10-01T12:00:00.000Z' })
    await unpublishAd(staffReq, ad.id, 'Pedido do anunciante', NOW)
    let after = await load(ad.id)
    expect(after.status).toBe('despublicado')
    expect(after.motivo).toBe('Pedido do anunciante')
    expect(await auditRows('anuncio-despublicado')).toHaveLength(1)

    const later = new Date(NOW.getTime() + 3_600_000)
    await approveAd(staffReq, ad.id, later)
    after = await load(ad.id)
    expect(after.status).toBe('aprovado')
    expect(after.publishedAt).toBe(later.toISOString())
    expect(after.motivo ?? null).toBeNull()
  })

  it('an owner edit after a refusal clears the reason and goes back to pendente', async () => {
    const cats = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })
    const ad = await seedAd(payload, { author: author.id })
    await rejectAd(staffReq, ad.id, 'Telefone no texto', NOW)
    await updateAd(payload, {
      assinanteId: author.id,
      id: ad.id,
      input: {
        apelido: 'Casal Teste',
        euSou: cats.docs[0].id as number,
        cidade: '',
        texto: 'Texto sem telefone',
        whatsapp: '5561988887777',
        telegram: '',
        consent: true,
      },
      now: NOW,
    })
    const after = await load(ad.id)
    expect(after.status).toBe('pendente')
    expect(after.motivo ?? null).toBeNull()
  })

  it('counts pending ads for the dashboard', async () => {
    await seedAd(payload, { author: author.id })
    await seedAd(payload, { author: author.id })
    await seedAd(payload, { author: author.id, status: 'aprovado' })
    expect((await getModerationCounts(payload)).pendentes).toBe(2)
  })

  describe('endpoints', () => {
    const handler = (path: string) => adEndpoints.find((e) => e.path === path && e.method === 'post')!.handler

    async function call(path: string, id: number | string, user: unknown, body?: unknown) {
      const req = await createLocalReq({ user: user as never }, payload)
      req.routeParams = { id: String(id) }
      ;(req as unknown as { json: () => Promise<unknown> }).json = async () => body ?? {}
      const res = await handler(path)(req)
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }

    it('refuse anonymous callers and subscribers', async () => {
      const ad = await seedAd(payload, { author: author.id })
      const sub = { ...author, collection: 'assinantes' }
      for (const user of [null, sub]) {
        for (const path of ['/:id/aprovar', '/:id/recusar', '/:id/despublicar']) {
          expect((await call(path, ad.id, user, { motivo: 'x x x' })).status).toBe(403)
        }
      }
      expect((await load(ad.id)).status).toBe('pendente')
    })

    it('run for staff, ignore dates/status in the body, 404 for unknown ids', async () => {
      const ad = await seedAd(payload, { author: author.id })
      const res = await call('/:id/aprovar', ad.id, staffUser, {
        status: 'recusado',
        publishedAt: '2000-01-01T00:00:00.000Z',
      })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'aprovado', statusLabel: 'Publicado' })
      const after = await load(ad.id)
      expect(after.publishedAt).not.toBe('2000-01-01T00:00:00.000Z')

      const rec = await call('/:id/despublicar', ad.id, staffUser, { motivo: 'Pedido do anunciante' })
      expect(rec.status).toBe(200)
      expect(rec.body.statusLabel).toBe('Despublicado')

      expect((await call('/:id/aprovar', 999_999, staffUser)).status).toBe(404)
      expect((await call('/:id/recusar', ad.id, staffUser, {})).status).toBe(409)
    })
  })
})
