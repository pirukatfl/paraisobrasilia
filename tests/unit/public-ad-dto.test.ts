import { describe, expect, it } from 'vitest'

import { toPublicAdDTO } from '../../src/lib/classisex/dto'

// PREV-01 / D-04 / T-04-01 (revisão 2026-10-20): the open-area preview carries only apelido, tipo
// and one blurred photo. No text, city, contact, video or author data.
const doc = {
  id: 12,
  author: { id: 4, name: 'Nome Real', email: 'real@x.com' },
  apelido: 'Casal BSB',
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal top, zap (61) 99988-9772 ou casal@gmail.com',
  contato: { whatsapp: '5561999889772', telegram: 'casalbsb' },
  status: 'aprovado' as const,
  motivo: null,
  updatedAt: '2026-10-19T18:00:00.000Z',
  publishedAt: '2026-10-18T15:00:00.000Z',
}

const media = [
  { id: 52, kind: 'foto' as const, order: 1, previa: 'b-previa.webp', filename: 'b.webp', owner: 4, url: '/api/ad-media/file/b.webp' },
  { id: 51, kind: 'foto' as const, order: 0, previa: 'a-previa.webp', filename: 'a.webp', owner: 4 },
  { id: 53, kind: 'foto' as const, order: 2, previa: null, filename: 'c.webp' },
  { id: 60, kind: 'video' as const, order: 3, filename: 'v.mp4' },
]

describe('toPublicAdDTO (PREV-01, D-04)', () => {
  it('has exactly id, apelido, tipo and one photo', () => {
    const dto = toPublicAdDTO(doc, { euSouLabel: 'Casal', media })
    expect(Object.keys(dto).sort()).toEqual(['apelido', 'euSou', 'foto', 'id'])
    expect(dto.apelido).toBe('Casal BSB')
    expect(dto.euSou).toBe('Casal')
  })

  it('points only at the blurred cover (first photo by order) and ignores the video', () => {
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal', media }).foto).toEqual({ previewUrl: '/classisex/previa/51' })
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal' }).foto).toBeNull()
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal', media: [media[3]] }).foto).toBeNull()
  })

  it('uses coverOf: the blurred cover is the first photo even when it has no previa', () => {
    const noPrevia = [
      { id: 70, kind: 'foto' as const, order: 0, previa: null },
      { id: 71, kind: 'foto' as const, order: 1, previa: 'x-previa.webp' },
    ]
    // the cover (70) has no blurred twin yet: nothing is shown instead of leaking another photo
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal', media: noPrevia }).foto).toBeNull()
  })

  it('redacts a contact that slipped into the apelido (staff edit, old data)', () => {
    const dto = toPublicAdDTO({ ...doc, apelido: 'Casal 61 99988-9772' }, { euSouLabel: 'Casal' })
    expect(dto.apelido).not.toContain('99988')
  })

  it('never serialises text, city, contacts, author, member URLs or filenames', () => {
    const json = JSON.stringify(toPublicAdDTO(doc, { euSouLabel: 'Casal', media }))
    for (const banned of [
      '5561999889772',
      'casalbsb',
      'casal@gmail.com',
      'Casal top',
      'Brasília',
      'Nome Real',
      'real@x.com',
      '"contato"',
      '"texto"',
      '"cidade"',
      '"author"',
      '/area-do-assinante/midia',
      '/api/ad-media',
      'filename',
      'previa.webp',
    ]) {
      expect(json).not.toContain(banned)
    }
  })
})
