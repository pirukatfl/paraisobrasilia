import { describe, expect, it } from 'vitest'

import { promocaoNoAr, tituloDaParticipacao, type PromocaoDTO } from '@/lib/site/promocao'

const base: PromocaoDTO = { ativa: true, titulo: 'Promo', texto: null, inicio: null, fim: null, imagem: null, participarAtivo: true, botaoParticipar: 'Participar', versao: 'v1' }
const agora = new Date('2026-11-10T12:00:00.000Z')

describe('promocaoNoAr', () => {
  it('is on when active with no period', () => {
    expect(promocaoNoAr(base, agora)).toBe(true)
  })
  it('is off when switched off, missing, or empty', () => {
    expect(promocaoNoAr({ ...base, ativa: false }, agora)).toBe(false)
    expect(promocaoNoAr(null, agora)).toBe(false)
    expect(promocaoNoAr({ ...base, titulo: ' ' }, agora)).toBe(false)
  })
  it('respects the start and the end', () => {
    expect(promocaoNoAr({ ...base, inicio: '2026-11-11T00:00:00.000Z' }, agora)).toBe(false)
    expect(promocaoNoAr({ ...base, inicio: '2026-11-10T00:00:00.000Z' }, agora)).toBe(true)
    expect(promocaoNoAr({ ...base, fim: '2026-11-09T00:00:00.000Z' }, agora)).toBe(false)
    expect(promocaoNoAr({ ...base, inicio: '2026-11-01T00:00:00.000Z', fim: '2026-11-30T00:00:00.000Z' }, agora)).toBe(true)
  })
})

describe('tituloDaParticipacao', () => {
  it('gives the title while the promotion is on', () => {
    expect(tituloDaParticipacao({ ...base, titulo: '  Promoção de aniversário ' }, agora)).toBe('Promoção de aniversário')
  })
  it('falls back to a generic title when only the text is filled', () => {
    expect(tituloDaParticipacao({ ...base, titulo: '', texto: { root: {} } as never }, agora)).toBe('Promoção')
  })
  it('is null when off, expired, not started or missing (?promocao=1 is then ignored)', () => {
    expect(tituloDaParticipacao({ ...base, ativa: false }, agora)).toBeNull()
    expect(tituloDaParticipacao({ ...base, fim: '2026-11-09T00:00:00.000Z' }, agora)).toBeNull()
    expect(tituloDaParticipacao({ ...base, inicio: '2026-11-11T00:00:00.000Z' }, agora)).toBeNull()
    expect(tituloDaParticipacao(null, agora)).toBeNull()
  })
})
