import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { findMemberAd, findMemberAds } from '../../src/lib/classisex/board'
import { isAdVisible } from '../../src/lib/classisex/visibility'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedSubscription } from '../helpers/seed'

const NOW = new Date('2026-10-19T18:00:00.000Z')
const DAY = 86_400_000

describe('ClassiSex visibility and members board (CLAS-01, CLAS-02, D-05, D-06, D-07)', () => {
  let payload: Payload
  let cats: { id: number; name: string }[]

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    cats = (await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })).docs as never
  })

  const author = async (email: string, period?: { start: number; end: number; status?: 'ativa' | 'encerrada' }) => {
    const acc = await seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0] })
    if (period) {
      await seedSubscription(payload, {
        assinanteId: acc.id,
        startsAt: new Date(NOW.getTime() + period.start).toISOString(),
        endsAt: new Date(NOW.getTime() + period.end).toISOString(),
        status: period.status,
      })
    }
    return acc
  }

  it('shows only approved ads of authors with access now; renewal brings them back', async () => {
    const active = await author('ativo@teste.local', { start: -DAY, end: DAY })
    const A = await seedAd(payload, { author: active.id, status: 'aprovado' })
    const B = await seedAd(payload, { author: active.id, status: 'pendente' })
    const C = await seedAd(payload, { author: active.id, status: 'recusado' })
    const expired = await author('vencido@teste.local', { start: -30 * DAY, end: -DAY })
    const D = await seedAd(payload, { author: expired.id, status: 'aprovado' })
    const ended = await author('encerrado@teste.local', { start: -DAY, end: 20 * DAY })
    const E = await seedAd(payload, { author: ended.id, status: 'aprovado' })
    const { docs: periods } = await payload.find({
      collection: 'subscriptions',
      where: { assinante: { equals: ended.id } },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'subscriptions',
      id: periods[0].id,
      data: { status: 'encerrada' },
      overrideAccess: true,
      context: { skipAudit: true },
    })
    const none = await author('sem@teste.local')
    const F = await seedAd(payload, { author: none.id, status: 'aprovado' })

    const page = await findMemberAds(payload, {}, NOW)
    expect(page.items.map((i) => i.id)).toEqual([A.id])
    expect(page.total).toBe(1)

    for (const id of [B.id, C.id, D.id, E.id, F.id]) expect(await findMemberAd(payload, id, NOW)).toBeNull()
    const dto = await findMemberAd(payload, A.id, NOW)
    expect(dto?.id).toBe(A.id)
    expect(dto?.euSou).toBe('Casal')

    await seedSubscription(payload, {
      assinanteId: expired.id,
      startsAt: new Date(NOW.getTime() - 60_000).toISOString(),
      endsAt: new Date(NOW.getTime() + 30 * DAY).toISOString(),
    })
    expect((await findMemberAds(payload, {}, NOW)).items.map((i) => i.id).sort()).toEqual([A.id, D.id].sort())
  })

  it('orders by publication, paginates by 20', async () => {
    const acc = await author('muitos@teste.local', { start: -DAY, end: 10 * DAY })
    const ids: number[] = []
    for (let i = 0; i < 25; i++) {
      const ad = await seedAd(payload, {
        author: acc.id,
        status: 'aprovado',
        publishedAt: new Date(NOW.getTime() - (25 - i) * 60_000).toISOString(),
      })
      ids.push(ad.id)
    }
    const p1 = await findMemberAds(payload, { page: 1 }, NOW)
    expect(p1.items).toHaveLength(20)
    expect(p1.totalPages).toBe(2)
    expect(p1.total).toBe(25)
    expect(p1.items[0].id).toBe(ids[24])
    const p2 = await findMemberAds(payload, { page: 2 }, NOW)
    expect(p2.items).toHaveLength(5)
    expect(p2.items[4].id).toBe(ids[0])
    expect((await findMemberAds(payload, { page: 3 }, NOW)).items).toHaveLength(0)
  })

  it('filters by Eu sou and cidade (accent- and case-insensitive)', async () => {
    const acc = await author('filtro@teste.local', { start: -DAY, end: 10 * DAY })
    const solteira = cats.find((c) => c.name === 'Solteira')!.id
    const a = await seedAd(payload, { author: acc.id, status: 'aprovado', cidade: 'Brasília' })
    const b = await seedAd(payload, { author: acc.id, status: 'aprovado', cidade: 'BRASÍLIA - DF', euSou: solteira })
    await seedAd(payload, { author: acc.id, status: 'aprovado', cidade: 'Taguatinga' })

    const bySolteira = await findMemberAds(payload, { euSou: solteira }, NOW)
    expect(bySolteira.items.map((i) => i.id)).toEqual([b.id])
    const byCidade = await findMemberAds(payload, { cidade: 'brasilia' }, NOW)
    expect(byCidade.items.map((i) => i.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('hides ads exactly at the São Paulo midnight that ends the access', async () => {
    const acc = await seedAssinante(payload, { email: 'meia@teste.local', password: 'senha-teste-1234', name: 'Meia Noite' })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: '2026-10-19T03:00:00.000Z',
      endsAt: '2026-11-18T03:00:00.000Z',
    })
    const ad = await seedAd(payload, { author: acc.id, status: 'aprovado' })
    expect(await findMemberAd(payload, ad.id, new Date('2026-11-18T02:59:59.000Z'))).not.toBeNull()
    expect(await findMemberAd(payload, ad.id, new Date('2026-11-18T03:00:00.000Z'))).toBeNull()
    expect(isAdVisible({ status: 'aprovado' }, '2026-11-18T03:00:00.000Z', new Date('2026-11-18T02:59:59.000Z'))).toBe(true)
    expect(isAdVisible({ status: 'aprovado' }, '2026-11-18T03:00:00.000Z', new Date('2026-11-18T03:00:00.000Z'))).toBe(false)
    expect(isAdVisible({ status: 'pendente' }, '2026-12-18T03:00:00.000Z', new Date('2026-11-18T02:00:00.000Z'))).toBe(false)
    expect(isAdVisible({ status: 'aprovado' }, null, new Date())).toBe(false)
  })
})
