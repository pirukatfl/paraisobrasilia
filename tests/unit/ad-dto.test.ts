import { describe, expect, it } from 'vitest'

import { toMemberAdDTO, toOwnerAdDTO, toOwnerMediaDTO } from '../../src/lib/classisex/dto'

const doc = {
  id: 7,
  author: { id: 3, name: 'Duda Secreta', email: 'duda@segredo.local' },
  apelido: 'Casal BSB',
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal simpático procura amigos.',
  contato: { whatsapp: '5561988887777', telegram: 'casal_bsb' },
  status: 'aprovado' as const,
  motivo: 'nota da equipe',
  moderatedBy: 9,
  updatedAt: '2026-10-19T18:00:00.000Z',
  publishedAt: '2026-10-18T15:00:00.000Z',
}

describe('toMemberAdDTO (CLAS-02, D-05)', () => {
  it('builds contact links', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', authorTier: 'assinante' })
    expect(dto.apelido).toBe('Casal BSB')
    expect(dto.euSou).toBe('Casal')
    expect(dto.cidade).toBe('Brasília')
    expect(dto.publishedLabel).toBe('18/10/2026')
    expect(dto.contato.whatsapp?.href).toBe(
      `https://wa.me/5561988887777?text=${encodeURIComponent('Olá! Vi seu anúncio no ClassiSex do Paraíso.')}`,
    )
    expect(dto.contato.whatsapp?.href.startsWith('https://wa.me/5561988887777?text=Ol%C3%A1!')).toBe(true)
    expect(dto.contato.telegram).toEqual({ label: '@casal_bsb', href: 'https://t.me/casal_bsb' })
    expect(Object.keys(dto.contato).sort()).toEqual(['email', 'links', 'observacao', 'telegram', 'whatsapp'])
    expect(dto.fotos).toEqual([])
    expect(dto.videos).toEqual([])
  })

  it('leaves empty contacts out', () => {
    const dto = toMemberAdDTO({ ...doc, contato: { whatsapp: '', telegram: null } }, { euSouLabel: 'Casal', authorTier: 'assinante' })
    expect(dto.contato.whatsapp).toBeNull()
    expect(dto.contato.telegram).toBeNull()
  })

  it('builds the e-mail, one labelled button per link and the observation', () => {
    const dto = toMemberAdDTO(
      {
        ...doc,
        contato: {
          email: 'casal@exemplo.com',
          links: [{ url: 'https://instagram.com/casalbsb' }, { url: 'https://www.meusite.com.br/x' }, { url: '' }],
          observacao: 'Só mensagem, depois das 18h',
        },
      },
      { euSouLabel: 'Casal', authorTier: 'assinante' },
    )
    expect(dto.contato.email).toEqual({ label: 'casal@exemplo.com', href: 'mailto:casal@exemplo.com' })
    expect(dto.contato.links).toEqual([
      { label: 'Instagram', href: 'https://instagram.com/casalbsb' },
      { label: 'meusite.com.br', href: 'https://www.meusite.com.br/x' },
    ])
    expect(dto.contato.observacao).toBe('Só mensagem, depois das 18h')
    expect(dto.contato.whatsapp).toBeNull()
  })

  it('never serialises author, staff fields, filenames or Payload URLs', () => {
    const json = JSON.stringify(toMemberAdDTO(doc, { euSouLabel: 'Casal', authorTier: 'assinante' }))
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
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media, authorTier: 'assinante' })
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
    expect(dto.videos).toEqual([{ id: 40, src: '/area-do-assinante/midia/40/video', durationLabel: '0:42' }])
  })

  it('never serialises filenames, Payload URLs, the blurred twin or the owner', () => {
    const json = JSON.stringify(toMemberAdDTO(doc, { euSouLabel: 'Casal', media, authorTier: 'assinante' }))
    for (const banned of ['filename', 'segredo', '/api/', 'previa', 'owner']) expect(json).not.toContain(banned)
  })

  it('has no media when there is none', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media: [], authorTier: 'assinante' })
    expect(dto.fotos).toEqual([])
    expect(dto.videos).toEqual([])
  })

  it('keeps up to 2 videos in order', () => {
    const two = [
      { id: 41, kind: 'video' as const, order: 5, durationSeconds: 59 },
      { id: 40, kind: 'video' as const, order: 3, durationSeconds: 42 },
    ]
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media: two, authorTier: 'assinante' })
    expect(dto.videos.map((v) => v.id)).toEqual([40, 41])
  })
})

describe('toMemberAdDTO by author tier (G-04, G-05)', () => {
  const media = [
    { id: 31, kind: 'foto' as const, order: 2 },
    { id: 29, kind: 'foto' as const, order: 0 },
    { id: 30, kind: 'foto' as const, order: 1 },
    { id: 40, kind: 'video' as const, order: 3, durationSeconds: 42 },
  ]

  it('a free author shows only the cover and no video, and flags autorGratuito', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media, authorTier: 'gratis' })
    expect(dto.fotos.map((f) => f.id)).toEqual([29])
    expect(dto.videos).toEqual([])
    expect(dto.autorGratuito).toBe(true)
    expect(JSON.stringify(dto)).not.toMatch(/"(30|31|40)"|\/(30|31|40)\//)
  })

  it('a paying author shows everything', () => {
    const dto = toMemberAdDTO(doc, { euSouLabel: 'Casal', media, authorTier: 'assinante' })
    expect(dto.fotos.map((f) => f.id)).toEqual([29, 30, 31])
    expect(dto.videos.map((v) => v.id)).toEqual([40])
    expect(dto.autorGratuito).toBe(false)
  })
})

describe('toOwnerMediaDTO / toOwnerAdDTO by tier (I-1, G-05)', () => {
  const media = [
    { id: 31, kind: 'foto' as const, order: 2 },
    { id: 29, kind: 'foto' as const, order: 0 },
    { id: 40, kind: 'video' as const, order: 3, durationSeconds: 42 },
  ]

  it('lists every file and marks the ones hidden from others as guardada', () => {
    const free = toOwnerMediaDTO(media, { authorTier: 'gratis' })
    expect(free.fotos.map((f) => [f.id, f.guardada])).toEqual([[29, false], [31, true]])
    expect(free.videos.map((v) => [v.id, v.guardada])).toEqual([[40, true]])
    const paying = toOwnerMediaDTO(media, { authorTier: 'assinante' })
    expect([...paying.fotos, ...paying.videos].every((x) => x.guardada === false)).toBe(true)
  })

  it('labels an approved ad of a free author and has no off-board label', () => {
    const d = { ...doc, status: 'aprovado' as const }
    expect(toOwnerAdDTO(d, { authorTier: 'gratis', euSouLabel: 'Casal', media }).statusLabel).toBe(
      'Publicado como conta gratuita (só a capa aparece)',
    )
    expect(toOwnerAdDTO(d, { authorTier: 'assinante', euSouLabel: 'Casal', media }).statusLabel).toBe('Publicado')
    const pend = { ...doc, status: 'pendente' as const }
    expect(toOwnerAdDTO(pend, { authorTier: 'gratis', euSouLabel: 'Casal', media }).statusLabel).toBe('Em análise pela equipe')
  })
})
