import { describe, expect, it } from 'vitest'

import { filterByTipo, parseTipo, toCategoria } from '../../src/lib/gallery/tipo'
import type { ModelCardDTO } from '../../src/lib/gallery/types'

const card = (name: string, categoria: ModelCardDTO['categoria']) => ({ name, categoria }) as ModelCardDTO

describe('Galeria ?tipo= (Profissionais / Amadoras)', () => {
  const all = [card('A', 'profissional'), card('B', 'amadora'), card('C', 'profissional')]

  it('parses only the two known values', () => {
    expect(parseTipo('profissionais')).toBe('profissionais')
    expect(parseTipo('amadoras')).toBe('amadoras')
    expect(parseTipo(['amadoras', 'x'])).toBe('amadoras')
    expect(parseTipo('todas')).toBeNull()
    expect(parseTipo('')).toBeNull()
    expect(parseTipo(undefined)).toBeNull()
  })

  it('filters by category; no tipo lists everyone', () => {
    expect(filterByTipo(all, null).map((m) => m.name)).toEqual(['A', 'B', 'C'])
    expect(filterByTipo(all, 'profissionais').map((m) => m.name)).toEqual(['A', 'C'])
    expect(filterByTipo(all, 'amadoras').map((m) => m.name)).toEqual(['B'])
  })

  it('a missing or unknown stored category counts as profissional', () => {
    expect(toCategoria(undefined)).toBe('profissional')
    expect(toCategoria(null)).toBe('profissional')
    expect(toCategoria('amadora')).toBe('amadora')
  })
})
