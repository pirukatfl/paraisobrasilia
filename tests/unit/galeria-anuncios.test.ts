import { describe, expect, it } from 'vitest'

import type { AdMediaDocLike } from '../../src/lib/classisex/dto'
import { adsToGalleryCards, canServeAdPhoto, type GaleriaAdDoc } from '../../src/lib/classisex/galeria-cards'
import type { Tier } from '../../src/lib/assinantes/tier'

// Client decision 2026-11-22: every approved ClassiSex ad with a photo is a card of Galeria → Amadoras, with all photos public (as visible to members).
const ad = (over: Partial<GaleriaAdDoc> = {}): GaleriaAdDoc => ({
  id: 7,
  apelido: 'Casal BSB',
  status: 'aprovado',
  publishedAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-05T10:00:00.000Z',
  ...over,
})
const foto = (id: number, order: number, extra: Partial<AdMediaDocLike> = {}): AdMediaDocLike => ({ id, kind: 'foto', order, ...extra })

describe('adsToGalleryCards', () => {
  it('skips ads with no photo', () => {
    const media = new Map<number, AdMediaDocLike[]>([[8, [{ id: 90, kind: 'video', order: 0 }]]])
    expect(adsToGalleryCards([ad({ id: 7 }), ad({ id: 8 })], media, new Map())).toEqual([])
  })

  it('builds id, href and cover through the open ad photo route', () => {
    const media = new Map([[7, [foto(52, 1), foto(51, 0, { sizes: { card: { width: 400, height: 500 } }, width: 2000, height: 3000 })]]])
    const [card] = adsToGalleryCards([ad()], media, new Map<number, Tier>([[7, 'assinante']]))
    expect(card).toMatchObject({
      id: 'anuncio-7',
      slug: '',
      name: 'Casal BSB',
      categoria: 'amadora',
      description: null,
      videoCount: 0,
      photoCount: 2,
      href: '/amadoras/anuncio/7',
      semOtimizador: true,
      updatedAt: '2026-11-01T10:00:00.000Z',
    })
    expect(card.cover).toEqual({
      url: '/amadoras/anuncio/foto/51/foto',
      thumbUrl: '/amadoras/anuncio/foto/51/miniatura',
      width: 2000,
      height: 3000,
      thumbWidth: 400,
      thumbHeight: 500,
      alt: 'Foto de Casal BSB',
    })
  })

  it('falls back to 480x600; ties on order go to the lower id', () => {
    const media = new Map([
      [7, [foto(60, 0, { width: 1000, height: 1250 }), foto(59, 0, { width: 800, height: 900 })]],
      [8, [foto(70, 0)]],
    ])
    const [a, b] = adsToGalleryCards([ad(), ad({ id: 8, publishedAt: null })], media, new Map())
    expect(a.cover.url).toBe('/amadoras/anuncio/foto/59/foto')
    expect([a.cover.thumbWidth, a.cover.thumbHeight]).toEqual([800, 900])
    expect([b.cover.thumbWidth, b.cover.thumbHeight]).toEqual([480, 600])
    expect(b.updatedAt).toBe('2026-11-05T10:00:00.000Z')
  })

  it('counts all photos for a paying author and only the cover for a free one or without author', () => {
    const fotos = [foto(1, 0), foto(2, 1), foto(3, 2)]
    const media = new Map([[1, fotos], [2, fotos], [3, fotos]])
    const tiers = new Map<number, Tier>([[1, 'assinante'], [2, 'gratis']])
    const cards = adsToGalleryCards([ad({ id: 1 }), ad({ id: 2 }), ad({ id: 3 })], media, tiers)
    expect(cards.map((c) => c.photoCount)).toEqual([3, 1, 1])
  })

  it('never carries contact, text, city, age or author data', () => {
    const raw = {
      ...ad(),
      author: { id: 4, email: 'real@x.com' },
      texto: 'zap segredo',
      cidade: 'Brasília',
      idade: 33,
      contato: { whatsapp: '5561999889772' },
    } as GaleriaAdDoc
    const out = JSON.stringify(adsToGalleryCards([raw], new Map([[7, [foto(1, 0)]]]), new Map()))
    for (const secret of ['real@x.com', 'segredo', 'Brasília', '33', '5561999889772', 'contato', 'author']) {
      expect(out).not.toContain(secret)
    }
  })

  it('strips contacts typed in the apelido', () => {
    const [card] = adsToGalleryCards([ad({ apelido: 'Casal zap (61) 99988-9772' })], new Map([[7, [foto(1, 0)]]]), new Map())
    expect(card.name).not.toMatch(/99988/)
  })

  it('ignores a non-approved doc defensively', () => {
    expect(adsToGalleryCards([ad({ status: 'pendente' })], new Map([[7, [foto(1, 0)]]]), new Map())).toEqual([])
  })
})

describe('canServeAdPhoto', () => {
  const photos = [foto(1, 0), foto(2, 1), foto(3, 2)]
  const base = { media: { id: 2, kind: 'foto' as const, ad: 7 }, ad: { id: 7, status: 'aprovado' }, adMedia: photos }

  it('serves every photo of an approved ad with a paying author', () => {
    for (const id of [1, 2, 3]) expect(canServeAdPhoto({ ...base, media: { ...base.media, id }, authorTier: 'assinante' })).toBe(true)
  })

  it('serves only the cover when the author is free, expired or missing', () => {
    expect(canServeAdPhoto({ ...base, media: { ...base.media, id: 1 }, authorTier: 'gratis' })).toBe(true)
    expect(canServeAdPhoto({ ...base, authorTier: 'gratis' })).toBe(false)
  })

  it('refuses ads that are not approved or missing', () => {
    expect(canServeAdPhoto({ ...base, ad: { id: 7, status: 'pendente' }, authorTier: 'assinante' })).toBe(false)
    expect(canServeAdPhoto({ ...base, ad: null, authorTier: 'assinante' })).toBe(false)
  })

  it('refuses videos', () => {
    const video = { id: 9, kind: 'video' as const, order: 3 }
    expect(canServeAdPhoto({ ...base, media: { id: 9, kind: 'video', ad: 7 }, adMedia: [...photos, video], authorTier: 'assinante' })).toBe(false)
  })

  it('refuses media of another ad', () => {
    expect(canServeAdPhoto({ ...base, media: { id: 2, kind: 'foto', ad: 8 }, authorTier: 'assinante' })).toBe(false)
  })
})
