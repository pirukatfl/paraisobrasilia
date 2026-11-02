import { describe, expect, it } from 'vitest'

import { toContoCardDTO, toMemberContoDTO, toPublicContoDTO } from '@/lib/contos/dto'

import { lexicalParagraphs } from '../helpers/seed'

const SENTINEL = 'SENTINELA-RESTRITA-ABC'
const doc = {
  slug: 'conto-um',
  title: 'Conto Um',
  publishedAt: '2026-10-20T15:00:00.000Z',
  paragrafosAbertos: 2,
  texto: lexicalParagraphs([
    'Primeiro parágrafo aberto do conto.',
    'Segundo parágrafo aberto do conto.',
    'Terceiro parágrafo só para assinantes.',
    `Quarto parágrafo com ${SENTINEL}.`,
    'Quinto parágrafo.',
  ]),
}

describe('conto DTOs (T-05-01)', () => {
  it('public DTO has the open blocks only and no internal keys', () => {
    const dto = toPublicContoDTO(doc)
    expect(JSON.stringify(dto)).not.toContain(SENTINEL)
    expect(JSON.stringify(dto)).not.toContain('Terceiro')
    expect(dto.open.root.children).toHaveLength(2)
    expect(dto.hasMore).toBe(true)
    expect(dto.description.length).toBeLessThanOrEqual(155)
    expect(dto.description).toContain('Primeiro parágrafo')
    for (const key of ['texto', 'wpId', 'wpSlug', 'wpRestrito', 'id']) expect(dto).not.toHaveProperty(key)
  })

  it('card DTO has a short chamada from the open part and a pt-BR date', () => {
    const card = toContoCardDTO(doc)
    expect(card.chamada.length).toBeLessThanOrEqual(200)
    expect(card.chamada).not.toContain(SENTINEL)
    expect(card.dateLabel).toBe('20/10/2026')
    expect(JSON.stringify(card)).not.toContain('Terceiro')
  })

  it('member DTO keeps the full text', () => {
    expect(JSON.stringify(toMemberContoDTO(doc))).toContain(SENTINEL)
  })

  it('a long single paragraph is truncated publicly', () => {
    const words = Array.from({ length: 120 }, (_, i) => `w${i}`).join(' ')
    const dto = toPublicContoDTO({ ...doc, texto: lexicalParagraphs([words]), paragrafosAbertos: 3 })
    expect(JSON.stringify(dto)).not.toContain('w100')
    expect(dto.hasMore).toBe(true)
  })
})

describe('conto DTOs with image and signature', () => {
  const media = {
    url: '/api/media/file/capa.webp',
    width: 1000,
    height: 800,
    alt: 'Imagem do conto Um',
    sizes: { card: { url: '/api/media/file/capa-640.webp', width: 640, height: 512 }, gallery: { url: '/api/media/file/capa-1600.webp', width: 1000, height: 800 } },
  }
  const withImage = { ...doc, imagem: media, assinadoComo: ' Casal BSB ' }

  it('the pages use the whole photo (gallery size, never the 4:3 crop)', () => {
    const sizes = { ...media.sizes, thumb: { url: '/api/media/file/capa-480x360.webp', width: 480, height: 360 }, thumb2x: { url: '/api/media/file/capa-960x720.webp', width: 960, height: 720 } }
    const m = { ...media, sizes }
    expect(toContoCardDTO({ ...withImage, imagem: m })).not.toHaveProperty('imagem')
    expect(toPublicContoDTO({ ...withImage, imagem: m }).imagem).toEqual({ url: '/api/media/file/capa-1600.webp', width: 1000, height: 800, alt: 'Imagem do conto Um' })
    expect(toPublicContoDTO({ ...withImage, imagem: m }).imagem?.url).toBe('/api/media/file/capa-1600.webp')
    expect(toMemberContoDTO({ ...withImage, imagem: m }).imagem?.url).toBe('/api/media/file/capa-1600.webp')
    expect(toContoCardDTO(withImage).assinadoComo).toBe('Casal BSB')
  })

  it('falls back to the original when the size is missing', () => {
    expect(toPublicContoDTO({ ...doc, imagem: { ...media, sizes: {} } }).imagem?.url).toBe('/api/media/file/capa.webp')
  })

  it('has no image for an id, a missing url, a pending media or no value', () => {
    expect(toPublicContoDTO({ ...doc, imagem: 12 }).imagem).toBeNull()
    expect(toPublicContoDTO({ ...doc, imagem: { alt: 'x' } }).imagem).toBeNull()
    expect(toPublicContoDTO({ ...doc, imagem: { ...media, pendente: true } }).imagem).toBeNull()
    expect(toPublicContoDTO(doc).imagem).toBeNull()
    expect(toContoCardDTO(doc).assinadoComo).toBeNull()
  })

  it('never carries the visitor e-mail', () => {
    const dto = toPublicContoDTO({ ...withImage, emailVisitante: 'leitor@exemplo.com' } as never)
    expect(JSON.stringify(dto)).not.toContain('leitor@exemplo.com')
  })
})
