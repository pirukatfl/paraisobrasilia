import { describe, expect, it } from 'vitest'

import { FAIXAS_IDADE, IDADE_MESSAGE, lerIdade, limitesDaFaixa, parseFaixaIdade } from '../../src/lib/classisex/idade'

describe('age ranges of the members filter (K)', () => {
  it('has the four ranges 18-29, 30-39, 40-49 and 50+, with no gap or overlap', () => {
    expect(FAIXAS_IDADE.map((f) => f.key)).toEqual(['18-29', '30-39', '40-49', '50-mais'])
    expect(limitesDaFaixa('18-29')).toEqual({ min: 18, max: 29 })
    expect(limitesDaFaixa('30-39')).toEqual({ min: 30, max: 39 })
    expect(limitesDaFaixa('40-49')).toEqual({ min: 40, max: 49 })
    expect(limitesDaFaixa('50-mais')).toEqual({ min: 50, max: 99 })
    for (let i = 1; i < FAIXAS_IDADE.length; i++) expect(FAIXAS_IDADE[i].min).toBe(FAIXAS_IDADE[i - 1].max + 1)
  })

  it('accepts only known keys; anything else means "Todas"', () => {
    expect(parseFaixaIdade('30-39')).toBe('30-39')
    expect(parseFaixaIdade(['40-49', 'x'])).toBe('40-49')
    for (const hostile of ['', 'todas', '17-29', '18-29 OR 1=1', '50+', undefined, null, 35, {}]) {
      expect(parseFaixaIdade(hostile)).toBeUndefined()
    }
  })
})

describe('lerIdade', () => {
  it('empty means no age', () => {
    for (const v of ['', '  ', null, undefined]) expect(lerIdade(v)).toEqual({ ok: true, idade: null })
  })

  it('accepts whole numbers from 18 to 99', () => {
    expect(lerIdade('18')).toEqual({ ok: true, idade: 18 })
    expect(lerIdade(' 42 ')).toEqual({ ok: true, idade: 42 })
    expect(lerIdade(99)).toEqual({ ok: true, idade: 99 })
  })

  it('refuses minors, too old, decimals, signs and text', () => {
    for (const v of ['17', '0', '100', '150', '-30', '30.5', '30,5', '3a', 'trinta', '1e2', '０３０']) {
      expect(lerIdade(v)).toEqual({ ok: false, error: IDADE_MESSAGE })
    }
  })
})
