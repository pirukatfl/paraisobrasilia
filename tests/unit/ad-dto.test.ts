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
