import { describe, expect, it } from 'vitest'

import { toMemberAdDTO } from '../../src/lib/classisex/dto'

const doc = {
  id: 7,
  author: { id: 3, name: 'Duda Secreta', email: 'duda@segredo.local' },
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal simpático procura amigos.',
  contato: { whatsapp: '5561988887777', telegram: 'casal_bsb', email: 'c@x.com' },
  status: 'aprovado' as const,
  motivo: 'nota da equipe',
  moderatedBy: 9,
  updatedAt: '2026-10-19T18:00:00.000Z',
  publishedAt: '2026-10-18T15:00:00.000Z',
}

describe('toMemberAdDTO (CLAS-02, D-05)', () => {
  it('builds contact links', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal' })
    expect(dto.euSou).toBe('Casal')
    expect(dto.cidade).toBe('Brasília')
    expect(dto.publishedLabel).toBe('18/10/2026')
    expect(dto.contato.whatsapp?.href).toBe(
      `https://wa.me/5561988887777?text=${encodeURIComponent('Olá! Vi seu anúncio no ClassiSex do Paraíso.')}`,
    )
    expect(dto.contato.whatsapp?.href.startsWith('https://wa.me/5561988887777?text=Ol%C3%A1!')).toBe(true)
    expect(dto.contato.telegram).toEqual({ label: '@casal_bsb', href: 'https://t.me/casal_bsb' })
    expect(dto.contato.email).toEqual({ label: 'c@x.com', href: 'mailto:c@x.com' })
    expect(dto.fotos).toEqual([])
    expect(dto.video).toBeNull()
  })

  it('leaves empty contacts out', () => {
    const dto = toMemberAdDTO({ ...doc, contato: { whatsapp: '', telegram: null, email: 'c@x.com' } }, { euSouLabel: 'Casal' })
    expect(dto.contato.whatsapp).toBeNull()
    expect(dto.contato.telegram).toBeNull()
    expect(dto.contato.email).not.toBeNull()
  })

  it('never serialises author, staff fields, filenames or Payload URLs', () => {
    const json = JSON.stringify(toMemberAdDTO(doc, { euSouLabel: 'Casal' }))
    for (const banned of ['Duda Secreta', 'duda@segredo.local', '"author"', 'staff', 'filename', '/api/', 'nota da equipe', 'moderated']) {
      expect(json).not.toContain(banned)
    }
  })
})

describe('toMemberAdDTO media (CLAS-01, CLAS-02, T-04-07)', () => {
  const media = [
    { id: 31, kind: 'foto' as const, order: 2, filename: 'segredo-c.webp', previa: 'segredo-c-previa.webp', owner: 3, url: '/api/ad-media/file/segredo-c.webp', width: 1200, height: 900, sizes: { card: { width: 480, height: 360, filename: 'segredo-c-480.webp' } } },
    { id: 29, kind: 'foto' as const, order: 0, filename: 'segredo-a.webp', previa: 'segredo-a-previa.webp', owner: 3, url: '/api/ad-media/file/segredo-a.webp', width: 1000, height: 1500, sizes: { card: { width: 480, height: 720 } } },
    { id: 30, kind: 'foto' as const, order: 1, filename: 'segredo-b.webp', owner: 3, width: 800, height: 800 },
    { id: 40, kind: 'video' as const, order: 3, filename: 'segredo.mp4', owner: 3, durationSeconds: 42, url: '/api/ad-media/file/segredo.mp4' },
  ]

  it('sorts photos by order and points every URL at the protected route', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media })
    expect(dto.fotos.map((f) => f.id)).toEqual([29, 30, 31])
    expect(dto.fotos[0]).toEqual({
      id: 29,
      miniatura: '/area-do-assinante/midia/29/miniatura',
      foto: '/area-do-assinante/midia/29/foto',
      width: 1000,
      height: 1500,
      thumbWidth: 480,
      thumbHeight: 720,
    })
    expect(dto.video).toEqual({ id: 40, src: '/area-do-assinante/midia/40/video', durationLabel: '0:42' })
  })

  it('never serialises filenames, Payload URLs, the blurred twin or the owner', () => {
    const json = JSON.stringify(toMemberAdDTO(doc, { euSouLabel: 'Casal', media }))
    for (const banned of ['filename', 'segredo', '/api/', 'previa', 'owner']) expect(json).not.toContain(banned)
  })

  it('has no media when there is none', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media: [] })
    expect(dto.fotos).toEqual([])
    expect(dto.video).toBeNull()
  })
})
