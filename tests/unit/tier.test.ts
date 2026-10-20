import { describe, expect, it } from 'vitest'

import {
  coverOf,
  TIER_COMPARISON,
  TIER_LABELS,
  TIER_LIMITS,
  tierFromAccessUntil,
  tierOf,
  visibleMediaFor,
} from '../../src/lib/assinantes/tier'

const NOW = new Date('2026-10-19T18:00:00.000Z')

describe('tierOf (I-2)', () => {
  it.each([
    ['ativa', 'assinante'],
    ['vencida', 'gratis'],
    ['encerrada', 'gratis'],
    ['sem-assinatura', 'gratis'],
  ] as const)('%s -> %s', (state, tier) => {
    expect(tierOf({ state })).toBe(tier)
  })
})

describe('tierFromAccessUntil', () => {
  it('null, undefined, past and equal-to-now are free; future pays', () => {
    expect(tierFromAccessUntil(null, NOW)).toBe('gratis')
    expect(tierFromAccessUntil(undefined, NOW)).toBe('gratis')
    expect(tierFromAccessUntil('2026-10-01T03:00:00.000Z', NOW)).toBe('gratis')
    expect(tierFromAccessUntil(NOW.toISOString(), NOW)).toBe('gratis')
    expect(tierFromAccessUntil('2026-11-18T03:00:00.000Z', NOW)).toBe('assinante')
    expect(tierFromAccessUntil(new Date('2026-11-18T03:00:00.000Z'), NOW)).toBe('assinante')
  })
})

describe('TIER_LIMITS and labels', () => {
  it('matches G-02 / G-03', () => {
    expect(TIER_LIMITS.gratis).toEqual({ fotos: 1, videos: 0, anunciosAtivos: 3 })
    expect(TIER_LIMITS.assinante).toEqual({ fotos: 10, videos: 2, anunciosAtivos: 3 })
    expect(TIER_LABELS).toEqual({ gratis: 'Conta gratuita', assinante: 'Assinante' })
  })
  it('comparison rows cover the G-06 items', () => {
    const items = TIER_COMPARISON.map((r) => r.item)
    expect(items).toEqual([
      'Fotos por anúncio',
      'Vídeos por anúncio',
      'Anúncios ativos',
      'Ver anúncios do ClassiSex',
      'Recados (conversas privadas)',
      'Contos completos',
    ])
    expect(TIER_COMPARISON[0]).toMatchObject({ gratis: '1', assinante: 'até 10' })
    expect(TIER_COMPARISON[1]).toMatchObject({ gratis: 'não', assinante: 'até 2' })
  })
})

const m = [
  { id: 5, kind: 'foto' as const, order: 2 },
  { id: 9, kind: 'video' as const, order: 0 },
  { id: 3, kind: 'foto' as const, order: 1 },
  { id: 2, kind: 'foto' as const, order: 1 },
]

describe('coverOf', () => {
  it('picks the lowest order, ties by id, ignoring videos', () => {
    expect(coverOf(m)?.id).toBe(2)
  })
  it('is null for empty or video-only lists', () => {
    expect(coverOf([])).toBeNull()
    expect(coverOf([{ id: 1, kind: 'video' as const, order: 0 }])).toBeNull()
  })
  it('treats a missing order as 0', () => {
    expect(coverOf([{ id: 8, kind: 'foto' as const }, { id: 7, kind: 'foto' as const, order: 1 }])?.id).toBe(8)
  })
})

describe('visibleMediaFor', () => {
  it('returns everything, unchanged, for a paying author', () => {
    expect(visibleMediaFor('assinante', m)).toEqual(m)
  })
  it('returns only the cover for a free author, never a video or a second photo', () => {
    expect(visibleMediaFor('gratis', m).map((x) => x.id)).toEqual([2])
    expect(visibleMediaFor('gratis', [])).toEqual([])
    expect(visibleMediaFor('gratis', [{ id: 1, kind: 'video' as const }])).toEqual([])
  })
})
