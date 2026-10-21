import { describe, expect, it } from 'vitest'

import type { PartyDetailDTO } from '../../src/lib/parties/types'
import { buildPartyMetadata } from '../../src/lib/seo/metadata'

const party: PartyDetailDTO = {
  id: '1',
  slug: 'festa-do-branco',
  title: 'Festa do Branco',
  startsAt: '2026-10-25T02:00:00.000Z',
  endsAt: '2026-10-25T12:00:00.000Z',
  flyer: { url: '/api/media/file/x.webp', width: 1080, height: 1350, alt: 'Flyer' },
  summary: null,
  details: null,
  prices: [],
  dressCode: null,
  attractions: [],
  isPast: false,
  updatedAt: '2026-10-17T12:00:00.000Z',
  flyerOgUrl: 'http://localhost:3000/api/media/file/x-1200x630.jpg',
}

describe('buildPartyMetadata (FEST-03, INST-05)', () => {
  it('uses the SEO title when filled, else the party title', () => {
    expect(buildPartyMetadata({ ...party, meta: { title: 'X' } }).title).toBe('X')
    expect(buildPartyMetadata(party).title).toBe('Festa do Branco')
  })

  it('falls back from meta description to summary to a generated sentence', () => {
    expect(buildPartyMetadata({ ...party, meta: { description: 'Meta' } }).description).toBe('Meta')
    expect(buildPartyMetadata({ ...party, summary: 'Resumo' }).description).toBe('Resumo')
    expect(buildPartyMetadata(party).description).toBe(
      'Festa do Branco — Sábado, 24 de outubro, a partir das 23h. Veja valores, dress code e atrações.',
    )
  })

  it('builds Open Graph and Twitter data with a cache-busting share image', () => {
    const md = buildPartyMetadata(party)
    const og = md.openGraph as { images: { url: string; width: number; height: number; alt: string }[]; url: string; type: string }
    expect(og.images[0]).toEqual({
      url: `http://localhost:3000/api/media/file/x-1200x630.jpg?v=${Date.parse(party.updatedAt)}`,
      width: 1200,
      height: 630,
      alt: 'Festa do Branco',
    })
    expect(og.url).toBe('/festas/festa-do-branco')
    expect(og.type).toBe('website')
    expect((md.twitter as { card: string }).card).toBe('summary_large_image')
  })
})

describe('open-area page metadata', () => {
  it('builds title, description, canonical and a share preview', async () => {
    const { buildPageMetadata } = await import('../../src/lib/seo/metadata')
    const meta = buildPageMetadata({ title: 'Quem somos', description: 'Uma casa de festas.', path: '/quem-somos' })
    expect(meta.title).toBe('Quem somos')
    expect(meta.description).toBe('Uma casa de festas.')
    expect(meta.alternates?.canonical).toBe('/quem-somos')
    const og = meta.openGraph as { url?: string; title?: string; description?: string; images?: { url: string }[]; siteName?: string }
    expect(og.url).toBe('/quem-somos')
    expect(og.title).toBe('Quem somos')
    expect(og.description).toBe('Uma casa de festas.')
    expect(og.siteName).toBe('Paraíso Brasília')
    expect(og.images?.[0].url).toBe('/og-default.jpg')
  })
})
