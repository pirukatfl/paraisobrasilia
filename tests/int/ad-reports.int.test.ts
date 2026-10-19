import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { reportEndpoints } from '../../src/lib/classisex/endpoints'
import { getModerationCounts, reportAd, resolveReport } from '../../src/lib/classisex/service'
import {
  getTestPayload,
  resetDatabase,
  seedAdCategories,
  seedAssinante,
  seedStaffUser,
  seedSubscription,
  seedVisibleAd,
} from '../helpers/seed'

const NOW = new Date('2026-10-19T18:00:00.000Z')

describe('ad reports (CLAS-05, D-08, T-04-12, T-04-13, T-04-24)', () => {
  let payload: Payload
  let staffReq: PayloadRequest
  let staffUser: Record<string, unknown>
  let owner: { id: number; email: string; name: string }
  let adId: number
  let reporter: { id: number; email: string; name: string }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  async function activeSubscriber(email: string, name: string) {
    const a = await seedAssinante(payload, { email, password: 'senha-teste-1234', name })
    await seedSubscription(payload, {
      assinanteId: a.id,
      startsAt: new Date(NOW.getTime() - 86_400_000).toISOString(),
      endsAt: new Date(NOW.getTime() + 20 * 86_400_000).toISOString(),
    })
    return a
  }

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const u = await seedStaffUser(payload, { email: 'staff-rep@teste.local', password: 'senha-equipe-123' })
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    staffReq = await createLocalReq({ user: staffUser as never }, payload)
    const seeded = await seedVisibleAd(payload, { authorEmail: 'pia@teste.local', authorName: 'Pia', now: NOW })
    owner = seeded.author
    adId = seeded.ad.id
    reporter = await activeSubscriber('rui@teste.local', 'Rui')
  })

  const reports = async (where: Record<string, unknown> = {}) =>
    (await payload.find({ collection: 'ad-reports' as never, where: where as never, depth: 0, limit: 100, overrideAccess: true })).docs as unknown as Array<
      Record<string, unknown> & { id: number }
    >
  const loadAd = (id: number) => payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })
  const auditRows = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true })).docs
  const report = (over: Partial<Parameters<typeof reportAd>[1]> = {}) =>
    reportAd(payload, { reporterId: reporter.id, adId, motivo: 'contato-falso', detalhes: '', now: NOW, ...over })

  it('stores an open report with a snapshot; menor de idade is urgent', async () => {
    const { id } = await report({ detalhes: '  Número não responde  ' })
    const [row] = await reports({ id: { equals: id } })
    expect(row.status).toBe('aberta')
    expect(row.urgente).toBe(false)
    expect(row.reporter).toBe(reporter.id)
    expect(row.ad).toBe(adId)
    expect(row.detalhes).toBe('Número não responde')
    expect(String(row.adSnapshot).length).toBeLessThanOrEqual(140)
    expect(String(row.adSnapshot)).toContain('Brasília')

    const other = await activeSubscriber('lia@teste.local', 'Lia')
    const urgent = await report({ reporterId: other.id, motivo: 'menor-de-idade' })
    expect((await reports({ id: { equals: urgent.id } }))[0].urgente).toBe(true)
  })

  it('refuses duplicates while open, allows again after a discard', async () => {
    await report()
    const err = await report().catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.message).toBe('Você já denunciou este anúncio.')
    const [open] = await reports()
    await resolveReport(staffReq, open.id, { acao: 'descartar' }, NOW)
    await expect(report()).resolves.toHaveProperty('id')
  })

  it('refuses the owner, hidden ads, unknown reasons and long details', async () => {
    const own = await report({ reporterId: owner.id }).catch((e) => e)
    expect(own.status).toBe(400)
    expect(own.message).toBe('Você não pode denunciar o próprio anúncio.')

    await payload.update({ collection: 'ads', id: adId, data: { status: 'despublicado', motivo: 'x x x' }, overrideAccess: true })
    expect(((await report().catch((e) => e)) as { status: number }).status).toBe(404)
    await payload.update({ collection: 'ads', id: adId, data: { status: 'aprovado' }, overrideAccess: true })

    const long = await report({ detalhes: 'x'.repeat(501) }).catch((e) => e)
    expect(long.status).toBe(400)
    expect(long.message).toBe('Escreva até 500 caracteres.')
    expect(((await report({ motivo: 'inventado' }).catch((e) => e)) as { status: number }).status).toBe(400)
    expect(((await report({ adId: 999_999 }).catch((e) => e)) as { status: number }).status).toBe(404)
    expect(await reports()).toHaveLength(0)
  })

  it('limits a subscriber to 10 reports per São Paulo day', async () => {
    for (let i = 0; i < 10; i++) {
      const s = await seedVisibleAd(payload, { authorEmail: `anunc${i}@teste.local`, now: NOW })
      await report({ adId: s.ad.id })
    }
    const s = await seedVisibleAd(payload, { authorEmail: 'anunc-x@teste.local', now: NOW })
    const err = await report({ adId: s.ad.id }).catch((e) => e)
    expect(err.status).toBe(429)
    expect(err.message).toBe('Você enviou muitas denúncias hoje. Tente amanhã ou fale com a equipe.')
  })

  it('menor de idade hides the ad at once and writes the audit log; other reasons do not', async () => {
    await report({ motivo: 'golpe-ou-cobranca' })
    expect((await loadAd(adId)).status).toBe('aprovado')

    const other = await activeSubscriber('lia@teste.local', 'Lia')
    const { id } = await report({ reporterId: other.id, motivo: 'menor-de-idade' })
    const ad = await loadAd(adId)
    expect(ad.status).toBe('despublicado')
    expect(ad.motivo).toContain('menor de idade')
    const rows = await auditRows('anuncio-despublicado')
    expect(rows).toHaveLength(1)
    expect(rows[0].actorType).toBe('sistema')
    expect(rows[0].assinante).toBe(owner.id)
    expect(String(rows[0].summary)).toContain(`Anúncio #${adId}`)
    expect(rows[0].details).toMatchObject({ anuncio: adId, denuncia: id, automatico: true })
    // the report stays open and urgent for staff
    const [row] = await reports({ id: { equals: id } })
    expect(row.status).toBe('aberta')
    expect(row.urgente).toBe(true)
  })

  it('resolve: despublicar closes every open report of the ad with one audit row each kind', async () => {
    const a = await activeSubscriber('a@teste.local', 'A')
    const b = await activeSubscriber('b@teste.local', 'B')
    await report()
    await report({ reporterId: a.id, motivo: 'ofensivo' })
    await report({ reporterId: b.id, motivo: 'outro' })
    const [first] = await reports({ reporter: { equals: reporter.id } })
    await resolveReport(staffReq, first.id, { acao: 'despublicar' }, NOW)
    const ad = await loadAd(adId)
    expect(ad.status).toBe('despublicado')
    expect(ad.motivo).toBe('Denúncia: Contato falso')
    const all = await reports()
    expect(all.map((r) => r.status)).toEqual(['resolvida', 'resolvida', 'resolvida'])
    for (const r of all) {
      expect(r.resolvidaPor).toBe(staffUser.id)
      expect(r.resolvidaEm).toBe(NOW.toISOString())
    }
    expect(await auditRows('denuncia-resolvida')).toHaveLength(1)
    expect(await auditRows('anuncio-despublicado')).toHaveLength(1)
  })

  it('resolve: despublicar with a note, and on an ad already hidden by a minor report', async () => {
    const other = await activeSubscriber('lia@teste.local', 'Lia')
    const { id } = await report({ reporterId: other.id, motivo: 'menor-de-idade' })
    await resolveReport(staffReq, id, { acao: 'despublicar', nota: 'Confirmado pela equipe' }, NOW)
    expect((await reports({ id: { equals: id } }))[0].status).toBe('resolvida')
    expect((await loadAd(adId)).status).toBe('despublicado')
  })

  it('resolve: descartar closes only that report', async () => {
    const a = await activeSubscriber('a@teste.local', 'A')
    const r1 = await report()
    const r2 = await report({ reporterId: a.id, motivo: 'outro' })
    await resolveReport(staffReq, r1.id, { acao: 'descartar', nota: 'Sem fundamento' }, NOW)
    expect((await reports({ id: { equals: r1.id } }))[0]).toMatchObject({ status: 'descartada', nota: 'Sem fundamento' })
    expect((await reports({ id: { equals: r2.id } }))[0].status).toBe('aberta')
    expect((await loadAd(adId)).status).toBe('aprovado')
    expect(await auditRows('denuncia-resolvida')).toHaveLength(1)
    const again = await resolveReport(staffReq, r1.id, { acao: 'descartar' }, NOW).catch((e) => e)
    expect(again.status).toBe(409)
  })

  it('keeps the report when the ad or the reporter is deleted', async () => {
    const { id } = await report()
    const [before] = await reports({ id: { equals: id } })
    await payload.delete({ collection: 'ads', id: adId, overrideAccess: true })
    let [row] = await reports({ id: { equals: id } })
    expect(row.ad ?? null).toBeNull()
    expect(row.adSnapshot).toBe(before.adSnapshot)
    expect(row.reporter).toBe(reporter.id)

    await payload.delete({ collection: 'assinantes', id: reporter.id, overrideAccess: true, context: { skipAudit: true } })
    ;[row] = await reports({ id: { equals: id } })
    expect(row.reporter ?? null).toBeNull()
  })

  it('counts open reports and urgent ones for the dashboard', async () => {
    const a = await activeSubscriber('a@teste.local', 'A')
    await report()
    await report({ reporterId: a.id, motivo: 'menor-de-idade' })
    expect(await getModerationCounts(payload)).toEqual({ pendentes: 0, denunciasAbertas: 2, urgentes: 1 })
  })

  describe('REST and endpoints', () => {
    const handler = reportEndpoints.find((e) => e.path === '/:id/resolver' && e.method === 'post')!.handler

    it('only staff can read, create or resolve', async () => {
      const { id } = await report()
      const sub = { ...reporter, collection: 'assinantes' }
      for (const user of [null, sub]) {
        const req = await createLocalReq({ user: user as never }, payload)
        await expect(
          payload.find({ collection: 'ad-reports' as never, req, user: user as never, overrideAccess: false }),
        ).rejects.toMatchObject({ status: 403 })
        await expect(
          payload.create({
            collection: 'ad-reports' as never,
            data: { motivo: 'outro' } as never,
            req,
            user: user as never,
            overrideAccess: false,
          }),
        ).rejects.toMatchObject({ status: 403 })
        req.routeParams = { id: String(id) }
        ;(req as unknown as { json: () => Promise<unknown> }).json = async () => ({ acao: 'descartar' })
        expect((await handler(req)).status).toBe(403)
      }
      expect((await reports({ id: { equals: id } }))[0].status).toBe('aberta')
    })

    it('runs for staff and ignores status in the body', async () => {
      const { id } = await report()
      const req = await createLocalReq({ user: staffUser as never }, payload)
      req.routeParams = { id: String(id) }
      ;(req as unknown as { json: () => Promise<unknown> }).json = async () => ({ acao: 'descartar', status: 'resolvida' })
      const res = await handler(req)
      expect(res.status).toBe(200)
      expect((await reports({ id: { equals: id } }))[0].status).toBe('descartada')
      req.routeParams = { id: '999999' }
      expect((await handler(req)).status).toBe(404)
    })
  })
})
