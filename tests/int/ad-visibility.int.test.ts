import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { expire } from '../../src/lib/cache/expire'
import { findMemberAd, findMemberAds, findPublicAds } from '../../src/lib/classisex/board'
import { getPublicAds } from '../../src/lib/classisex/public'
import { isAdVisible } from '../../src/lib/classisex/visibility'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedSubscription } from '../helpers/seed'

// The cache-expiry hooks are observed through this spy (D-06, T-04-14)
vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

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
    const mulher = cats.find((c) => c.name === 'Mulher')!.id
    const a = await seedAd(payload, { author: acc.id, status: 'aprovado', cidade: 'Brasília' })
    const b = await seedAd(payload, { author: acc.id, status: 'aprovado', cidade: 'BRASÍLIA - DF', euSou: mulher })
    await seedAd(payload, { author: acc.id, status: 'aprovado', cidade: 'Taguatinga' })

    const byMulher = await findMemberAds(payload, { euSou: mulher }, NOW)
    expect(byMulher.items.map((i) => i.id)).toEqual([b.id])
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

describe('public preview read model (PREV-01, D-04, D-07)', () => {
  let payload: Payload
  const NOW_P = new Date()

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    vi.mocked(expire).mockClear()
  })

  const withAccess = async (email: string, start: number, end: number) => {
    const acc = await seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0] })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW_P.getTime() + start).toISOString(),
      endsAt: new Date(NOW_P.getTime() + end).toISOString(),
    })
    return acc
  }

  it('lists only visible ads, newest first, with redacted text and the same filters', async () => {
    const active = await withAccess('pub-ativo@teste.local', -DAY, 10 * DAY)
    const expired = await withAccess('pub-vencido@teste.local', -30 * DAY, -DAY)
    const old = await seedAd(payload, {
      author: active.id,
      status: 'aprovado',
      cidade: 'Taguatinga',
      publishedAt: new Date(NOW_P.getTime() - 2 * DAY).toISOString(),
    })
    const recent = await seedAd(payload, {
      author: active.id,
      status: 'aprovado',
      texto: 'Chama no zap 61 99988-9772 agora.',
      publishedAt: new Date(NOW_P.getTime() - DAY).toISOString(),
    })
    await seedAd(payload, { author: active.id, status: 'pendente' })
    await seedAd(payload, { author: active.id, status: 'recusado' })
    await seedAd(payload, { author: active.id, status: 'despublicado' })
    await seedAd(payload, { author: expired.id, status: 'aprovado' })

    const page = await findPublicAds(payload, {}, NOW_P)
    expect(page.items.map((i) => i.id)).toEqual([recent.id, old.id])
    // Revisão 2026-10-20: the open preview carries no ad text, city or contact at all
    expect(Object.keys(page.items[0]).sort()).toEqual(['apelido', 'euSou', 'foto', 'id'])
    expect(JSON.stringify(page)).not.toContain('99988')
    expect(JSON.stringify(page)).not.toContain('Taguatinga')
    expect(JSON.stringify(page)).not.toContain('Casal simpático')
    expect(JSON.stringify(page)).not.toContain('5561999990000')
    // the city is not public: the open area ignores a cidade filter
    expect((await findPublicAds(payload, { cidade: 'taguatinga' }, NOW_P)).items.map((i) => i.id)).toEqual([recent.id, old.id])

    // The cached wrapper calls through outside a Next server
    const cachedPage = await getPublicAds({})
    expect(cachedPage.items.map((i) => i.id)).toEqual([recent.id, old.id])
  })

  it('subscription and access changes expire the ads tag', async () => {
    const acc = await seedAssinante(payload, { email: 'tag@teste.local', password: 'senha-teste-1234', name: 'Tag' })
    vi.mocked(expire).mockClear()
    const sub = await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW_P.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW_P.getTime() + DAY).toISOString(),
    })
    const calls = () => vi.mocked(expire).mock.calls.filter(([tags]) => tags.includes('ads')).length
    expect(calls()).toBeGreaterThanOrEqual(2) // the period itself and the author's accessUntil
    vi.mocked(expire).mockClear()
    await payload.delete({ collection: 'subscriptions', id: (sub as { id: number }).id, overrideAccess: true })
    expect(calls()).toBeGreaterThanOrEqual(1)
  })
})
