import { describe, expect, it } from 'vitest'

import { toPublicAdDTO } from '../../src/lib/classisex/dto'
import { REDACTED_LABEL } from '../../src/lib/classisex/redact'

// PREV-01 / D-04 / T-04-01: the open-area preview carries no contact and no author data.
const doc = {
  id: 12,
  author: { id: 4, name: 'Nome Real', email: 'real@x.com' },
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal top, zap (61) 99988-9772 ou casal@gmail.com',
  contato: { whatsapp: '5561999889772', telegram: 'casalbsb', email: 'casal@gmail.com' },
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
  it('redacts contacts from the text and keeps Eu sou and cidade', () => {
    const dto = toPublicAdDTO(doc, { euSouLabel: 'Casal', media })
    expect(dto.euSou).toBe('Casal')
    expect(dto.cidade).toBe('Brasília')
    expect(dto.texto).toContain(REDACTED_LABEL)
    expect(dto.texto).not.toContain('99988')
    expect(dto.texto).not.toContain('casal@gmail')
    expect(dto.publishedLabel).toBe('18/10/2026')
  })

  it('only points at blurred previews, in order, and flags the video', () => {
    const dto = toPublicAdDTO(doc, { euSouLabel: 'Casal', media })
    expect(dto.fotos).toEqual([{ previewUrl: '/classisex/previa/51' }, { previewUrl: '/classisex/previa/52' }])
    expect(dto.hasVideo).toBe(true)
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal' }).hasVideo).toBe(false)
  })

  it('redacts a contact typed in the cidade field', () => {
    const dto = toPublicAdDTO({ ...doc, cidade: 'Brasília 61 99988-9772' }, { euSouLabel: 'Casal' })
    expect(dto.cidade).not.toContain('99988')
  })

  it('never serialises contacts, author, member URLs or filenames', () => {
    const json = JSON.stringify(toPublicAdDTO(doc, { euSouLabel: 'Casal', media }))
    for (const banned of [
      '5561999889772',
      'casalbsb',
      'casal@gmail.com',
      'Nome Real',
      'real@x.com',
      'contato',
      'author',
      '/area-do-assinante/midia',
      '/api/ad-media',
      'filename',
      'previa.webp',
    ]) {
      expect(json).not.toContain(banned)
    }
  })
})
