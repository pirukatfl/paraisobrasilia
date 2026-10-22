import { afterEach, describe, expect, it } from 'vitest'

import { cutText, toDicaCardDTO, toPublicDicaDTO } from '@/lib/dicas/dto'

import { lexicalParagraphs } from '../helpers/seed'

const media = {
  id: 7,
  url: '/api/media/file/capa.jpg',
  width: 3000,
  height: 2000,
  alt: 'Capa de teste',
  sizes: {
    card: { url: '/api/media/file/capa-640.webp', width: 640, height: 427 },
    gallery: { url: '/api/media/file/capa-1600.webp', width: 1600, height: 1067 },
    og: { url: '/api/media/file/capa-og.jpg', width: 1200, height: 630 },
  },
}

const base = {
  slug: 'dica-um',
  title: 'Dica Um',
  publishedAt: '2026-10-20T15:00:00.000Z',
  updatedAt: '2026-10-21T15:00:00.000Z',
  texto: lexicalParagraphs(['Primeiro parágrafo da dica.', 'Segundo parágrafo da dica.', 'Último parágrafo da dica.']),
}

describe('dica DTOs (DH-01, DH-04, I-1)', () => {
  const original = process.env.NEXT_PUBLIC_SERVER_URL
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL
    else process.env.NEXT_PUBLIC_SERVER_URL = original
  })

  it('card: resumo wins, else the start of the text; date label dd/MM/yyyy', () => {
    expect(toDicaCardDTO({ ...base, resumo: '  Um resumo.  ' }).resumo).toBe('Um resumo.')
    const card = toDicaCardDTO({ ...base, resumo: '' })
    expect(card.resumo).toContain('Primeiro parágrafo da dica.')
    expect(card.dateLabel).toBe('20/10/2026')
  })

  it('cover gate: only a populated media with capaConferida === true is exposed', () => {
    for (const capaConferida of [false, undefined, null]) {
      const card = toDicaCardDTO({ ...base, capa: media, capaConferida })
      expect(card.capa).toBeNull()
      const page = toPublicDicaDTO({ ...base, capa: media, capaConferida })
      expect(page.capa).toBeNull()
      expect(page.ogImage).toBeNull()
    }
    // an id (not populated) or a media without url never leaks
    expect(toDicaCardDTO({ ...base, capa: 7, capaConferida: true }).capa).toBeNull()
    expect(toPublicDicaDTO({ ...base, capa: { id: 7 }, capaConferida: true }).capa).toBeNull()
  })

  it('confirmed cover: card size on cards, gallery on the page, absolute og 1200x630', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://novo.exemplo.test/'
    const card = toDicaCardDTO({ ...base, capa: media, capaConferida: true })
    expect(card.capa).toEqual({ url: '/api/media/file/capa-640.webp', width: 640, height: 427, alt: 'Capa de teste' })
    const page = toPublicDicaDTO({ ...base, capa: media, capaConferida: true })
    expect(page.capa).toEqual({ url: '/api/media/file/capa-1600.webp', width: 1600, height: 1067, alt: 'Capa de teste' })
    expect(page.ogImage).toEqual({
      url: 'https://novo.exemplo.test/api/media/file/capa-og.jpg',
      width: 1200,
      height: 630,
      alt: 'Capa de teste',
    })
  })

  it('falls back to the original when the card/gallery size is missing; no og size → no og image', () => {
    const bare = { id: 7, url: '/api/media/file/capa.jpg', width: 800, height: 600, alt: 'x' }
    expect(toDicaCardDTO({ ...base, capa: bare, capaConferida: true }).capa?.url).toBe('/api/media/file/capa.jpg')
    const page = toPublicDicaDTO({ ...base, capa: bare, capaConferida: true })
    expect(page.capa?.url).toBe('/api/media/file/capa.jpg')
    expect(page.ogImage).toBeNull()
  })

  it('description: resumo cut at a word boundary to 155 chars, else the start of the text', () => {
    const long = Array.from({ length: 60 }, (_, i) => `palavra${i}`).join(' ')
    const cut = toPublicDicaDTO({ ...base, resumo: long }).description
    expect(cut.length).toBeLessThanOrEqual(155)
    expect(cut.endsWith('…')).toBe(true)
    // cut at a word boundary: every word before the ellipsis is a whole word
    expect(long.startsWith(cut.slice(0, -1))).toBe(true)
    expect(long[cut.length - 1]).toBe(' ')
    expect(toPublicDicaDTO({ ...base, resumo: 'Curto.' }).description).toBe('Curto.')
    const fromText = toPublicDicaDTO({ ...base }).description
    expect(fromText).toContain('Primeiro parágrafo da dica.')
    expect(fromText.length).toBeLessThanOrEqual(155)
  })

  it('page carries the WHOLE text (no open/closed split)', () => {
    const page = toPublicDicaDTO({ ...base })
    expect((page.texto as unknown as { root: { children: unknown[] } }).root.children).toHaveLength(3)
  })

  it('cutText leaves short text alone', () => {
    expect(cutText('  a   b ', 10)).toBe('a b')
  })
})
