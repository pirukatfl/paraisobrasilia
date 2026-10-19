import { describe, expect, it } from 'vitest'

import { durationLabel, toPlanDTO } from '../../src/lib/assinantes/plans'
import { formatBRL } from '../../src/lib/format/money'

describe('formatBRL', () => {
  it('drops cents for whole values and uses a plain space', () => {
    expect(formatBRL(30)).toBe('R$ 30')
    expect(formatBRL(240)).toBe('R$ 240')
  })
  it('keeps cents otherwise', () => {
    expect(formatBRL(29.9)).toBe('R$ 29,90')
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50')
  })
})

describe('toPlanDTO', () => {
  const base = { id: 1, name: 'Trimestral', durationDays: 90, price: 75, paymentUrl: '', description: null }

  it('formats price, promo and duration', () => {
    const dto = toPlanDTO({ ...base, promoPrice: 60 })
    expect(dto.priceLabel).toBe('R$ 75')
    expect(dto.promoLabel).toBe('R$ 60')
    expect(dto.promoPrice).toBe(60)
    expect(dto.durationLabel).toBe('90 dias')
  })
  it('ignores empty or zero promo prices', () => {
    expect(toPlanDTO({ ...base, promoPrice: null }).promoLabel).toBeNull()
    expect(toPlanDTO({ ...base, promoPrice: 0 }).promoLabel).toBeNull()
  })
  it('turns an empty payment link into null', () => {
    expect(toPlanDTO(base).paymentUrl).toBeNull()
    expect(toPlanDTO({ ...base, paymentUrl: '  ' }).paymentUrl).toBeNull()
    expect(toPlanDTO({ ...base, paymentUrl: 'https://pag.ae/x' }).paymentUrl).toBe('https://pag.ae/x')
  })
  it('labels one day in the singular', () => {
    expect(durationLabel(1)).toBe('1 dia')
    expect(durationLabel(30)).toBe('30 dias')
  })
})
