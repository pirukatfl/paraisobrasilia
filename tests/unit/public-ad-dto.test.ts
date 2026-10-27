import { describe, expect, it } from 'vitest'

import { toPublicAdDTO } from '../../src/lib/classisex/dto'

// PREV-01 / D-04 / T-04-01 (revisão 2026-10-22): the open view (visitors and free accounts) carries
// apelido, tipo, city and the FULL text with every contact removed, plus one sharp cover photo.
// No contact fields, video, author data or member URLs.
const doc = {
  id: 12,
  author: { id: 4, name: 'Nome Real', email: 'real@x.com' },
  apelido: 'Casal BSB',
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal top, zap (61) 99988-9772 ou casal@gmail.com',
  contato: {
    whatsapp: '5561999889772',
    telegram: 'casalbsb',
    email: 'casal.secreto@exemplo.com',
    links: [{ url: 'https://instagram.com/perfil_secreto' }],
    observacao: 'só depois das 18h secreto',
  },
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
  it('has exactly id, apelido, tipo, city, text and one photo', () => {
    const dto = toPublicAdDTO(doc, { euSouLabel: 'Casal', media })
    expect(Object.keys(dto).sort()).toEqual(['apelido', 'cidade', 'euSou', 'foto', 'id', 'texto'])
    expect(dto.apelido).toBe('Casal BSB')
    expect(dto.euSou).toBe('Casal')
    expect(dto.cidade).toBe('Brasília')
  })

  it('shows the whole text with the contacts removed', () => {
    const dto = toPublicAdDTO(doc, { euSouLabel: 'Casal', media })
    expect(dto.texto.startsWith('Casal top, ')).toBe(true)
    expect(dto.texto).toContain('[contato só para assinantes]')
    expect(dto.texto).not.toContain('99988')
    expect(dto.texto).not.toContain('casal@gmail.com')
  })

  it('keeps a text without contacts exactly as written, line breaks included', () => {
    const texto = 'Somos um casal simpático.\nGostamos de festas e de conversar.'
    expect(toPublicAdDTO({ ...doc, texto }, { euSouLabel: 'Casal' }).texto).toBe(texto)
  })

  it('removes phones, e-mails, links, @handles and keyword handles from text and city', () => {
    const texto = [
      'Chama no (61) 99988-1234 ou 61999887766.',
      'Mail fulano@exemplo.com.br e fulano arroba gmail ponto com.',
      'Site https://exemplo.com/x, www.exemplo.com, wa.me/5561999887766.',
      'Insta: casalbsb, @casalbsb, telegram fulano_tg, zap 61 99988-9772.',
    ].join(' ')
    const dto = toPublicAdDTO({ ...doc, texto, cidade: 'Brasília, zap 61 99988-1234' }, { euSouLabel: 'Casal' })
    for (const leak of ['99988', '99887766', 'fulano@', 'gmail', 'exemplo.com', 'wa.me', 'casalbsb', 'fulano_tg', '@']) {
      expect(dto.texto, leak).not.toContain(leak)
    }
    expect(dto.cidade).not.toContain('99988')
    expect(dto.cidade).toContain('Brasília')
  })

  it('points only at the cover (first photo by order) and ignores the video', () => {
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal', media }).foto).toEqual({ previewUrl: '/classisex/previa/51' })
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal' }).foto).toBeNull()
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal', media: [media[3]] }).foto).toBeNull()
  })

  it('uses coverOf: the cover is the first photo whether or not it has an old blurred twin (previa)', () => {
    const mixed = [
      { id: 70, kind: 'foto' as const, order: 0, previa: null },
      { id: 71, kind: 'foto' as const, order: 1, previa: 'x-previa.webp' },
    ]
    // never another photo instead of the cover
    expect(toPublicAdDTO(doc, { euSouLabel: 'Casal', media: mixed }).foto).toEqual({ previewUrl: '/classisex/previa/70' })
  })

  it('redacts a contact that slipped into the apelido (staff edit, old data)', () => {
    const dto = toPublicAdDTO({ ...doc, apelido: 'Casal 61 99988-9772' }, { euSouLabel: 'Casal' })
    expect(dto.apelido).not.toContain('99988')
  })

  it('never serialises contacts, author, member URLs or filenames', () => {
    const json = JSON.stringify(toPublicAdDTO(doc, { euSouLabel: 'Casal', media }))
    for (const banned of [
      '5561999889772',
      'casalbsb',
      'casal@gmail.com',
      'Nome Real',
      'real@x.com',
      '99988',
      '"contato"',
      '"whatsapp"',
      '"telegram"',
      'casal.secreto',
      'perfil_secreto',
      'secreto',
      '"links"',
      '"observacao"',
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
