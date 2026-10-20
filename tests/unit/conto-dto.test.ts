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
