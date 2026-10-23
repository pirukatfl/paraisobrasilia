import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { findMemberAds, findPublicAds } from '../../src/lib/classisex/board'
import { LEGACY_TEXT_MAX, TEXT_MAX } from '../../src/lib/classisex/rules'
import { createAd, ServiceError, updateAd } from '../../src/lib/classisex/service'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAdMedia, seedAssinante, seedSubscription } from '../helpers/seed'

vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

const NOW = new Date('2026-10-22T15:00:00.000Z')
const DAY = 86_400_000
const LONG_TEXT = 'Texto antigo comprido e sem contato nenhum. '.repeat(30) // > 600 characters
const TEXT_WITH_CONTACTS = 'Casal simpático. Chama no zap 61 99999-8888 ou @casal_antigo ou casal@exemplo.com ou https://exemplo.com/x'

describe('anúncios antigos publicados: isenções e redação (decisão do cliente de 2026-10-22)', () => {
  let payload: Payload
  let casal: number
  let owner: { id: number }

  const input = (over: Record<string, unknown> = {}) => ({
    apelido: 'Casal Novo',
    euSou: casal,
    cidade: 'Brasília',
    texto: 'Anúncio novo e curto.',
    whatsapp: '5561988887777',
    telegram: '',
    consent: true,
    ...over,
  })

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const cats = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })
    casal = cats.docs[0].id as number
    owner = await seedAssinante(payload, { email: 'dono-legado@teste.local', password: 'senha-dono-1234', name: 'Dono Legado' })
  })

  const legacy = (over: Record<string, unknown> = {}) =>
    seedAd(payload, {
      author: owner.id,
      status: 'aprovado',
      wpCommentId: 9000 + Math.floor(Math.random() * 1000),
      contato: {},
      texto: TEXT_WITH_CONTACTS,
      ...over,
    })

  it('accepts a published old ad with no contact field and a text above 600 characters', async () => {
    const ad = await legacy({ texto: LONG_TEXT })
    expect(ad.status).toBe('aprovado')
    const doc = await payload.findByID({ collection: 'ads', id: ad.id, depth: 0, overrideAccess: true })
    expect(doc.texto.length).toBeGreaterThan(TEXT_MAX)
  })

  it('keeps every limit for NEW ads: contact required, 600 characters', async () => {
    await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW }) // control: the valid input passes
    await expect(seedAd(payload, { author: owner.id, status: 'aprovado', contato: {} })).rejects.toThrow()
    await expect(seedAd(payload, { author: owner.id, status: 'aprovado', texto: LONG_TEXT })).rejects.toThrow()
    await expect(createAd(payload, { assinanteId: owner.id, input: input({ texto: LONG_TEXT }), now: NOW })).rejects.toBeInstanceOf(
      ServiceError,
    )
    await expect(
      createAd(payload, { assinanteId: owner.id, input: input({ whatsapp: '' }), now: NOW }),
    ).rejects.toBeInstanceOf(ServiceError)
  })

  it('does not count old ads in the active-ads limit of new ads', async () => {
    await legacy()
    await legacy()
    await legacy()
    await legacy({ status: 'pendente' })
    for (let i = 0; i < 3; i++) await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW })
    const err = await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW }).catch((e) => e)
    expect(err).toBeInstanceOf(ServiceError)
    expect((err as ServiceError).code).toBe('limite')
  })

  it('lets the author edit an old ad without contact and above 600 characters; it goes back to moderation', async () => {
    const ad = await legacy()
    await updateAd(payload, {
      assinanteId: owner.id,
      id: ad.id,
      input: input({ texto: LONG_TEXT, whatsapp: '', telegram: '' }),
      now: NOW,
    })
    const doc = await payload.findByID({ collection: 'ads', id: ad.id, depth: 0, overrideAccess: true })
    expect(doc.status).toBe('pendente')
    expect(doc.texto.length).toBeGreaterThan(TEXT_MAX)
    // a generous ceiling still protects against abuse
    await expect(
      updateAd(payload, {
        assinanteId: owner.id,
        id: ad.id,
        input: input({ texto: 'a'.repeat(LEGACY_TEXT_MAX + 1), whatsapp: '' }),
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(ServiceError)
  })

  it('an edited NEW ad still needs a contact and 600 characters', async () => {
    const ad = await seedAd(payload, { author: owner.id, status: 'aprovado' })
    await expect(
      updateAd(payload, { assinanteId: owner.id, id: ad.id, input: input({ whatsapp: '' }), now: NOW }),
    ).rejects.toBeInstanceOf(ServiceError)
    await expect(
      updateAd(payload, { assinanteId: owner.id, id: ad.id, input: input({ texto: LONG_TEXT }), now: NOW }),
    ).rejects.toBeInstanceOf(ServiceError)
  })

  it('does not apply the per-tier photo count to an old ad (a free owner may hold several photos)', async () => {
    const ad = await legacy()
    await seedAdMedia(payload, { ad: ad.id, order: 0 })
    await seedAdMedia(payload, { ad: ad.id, order: 1 })
    await seedAdMedia(payload, { ad: ad.id, order: 2 })
    const { totalDocs } = await payload.count({ collection: 'ad-media', where: { ad: { equals: ad.id } }, overrideAccess: true })
    expect(totalDocs).toBe(3)
    // a NEW ad of a free owner keeps the limit
    const fresh = await seedAd(payload, { author: owner.id, status: 'aprovado' })
    await seedAdMedia(payload, { ad: fresh.id, order: 0 })
    await expect(seedAdMedia(payload, { ad: fresh.id, order: 1 })).rejects.toThrow()
  })

  it('shows a published old ad on the open board with the text redacted and a sharp cover only', async () => {
    const payer = await seedAssinante(payload, { email: 'paga@teste.local', password: 'senha-paga-1234', name: 'Paga' })
    await seedSubscription(payload, {
      assinanteId: payer.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 20 * DAY).toISOString(),
    })
    const ad = await legacy({ author: payer.id })
    await seedAdMedia(payload, { ad: ad.id })
    const page = await findPublicAds(payload, {}, NOW)
    expect(page.items.map((i) => i.id)).toContain(ad.id)
    const item = page.items.find((i) => i.id === ad.id)!
    const json = JSON.stringify(item)
    expect(item.texto).toContain('Casal simpático')
    for (const secret of ['99999-8888', 'casal_antigo', 'casal@exemplo.com', 'exemplo.com']) expect(json).not.toContain(secret)
    expect(item.foto).toMatchObject({ previewUrl: expect.stringContaining('/classisex/previa/') })
  })

  it('also shows an old ad of a free owner on the members board (G-05) flagged as free author', async () => {
    const ad = await legacy()
    const page = await findMemberAds(payload, {}, NOW)
    const item = page.items.find((i) => i.id === ad.id)
    expect(item).toBeTruthy()
    expect(item!.autorGratuito).toBe(true)
  })
})
