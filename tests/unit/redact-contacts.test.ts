import { describe, expect, it } from 'vitest'

import { REDACTED_LABEL, redactContacts } from '../../src/lib/classisex/redact'

const L = REDACTED_LABEL

describe('redactContacts (T-04-01, D-04)', () => {
  it('uses the exact public label', () => {
    expect(REDACTED_LABEL).toBe('[contato só para assinantes]')
  })

  it.each([
    '(61) 9 9988-9772',
    '61999889772',
    '+55 61 99988 9772',
    '55 61 99988-9772',
    '9988.9772',
    '99988 9772',
    '61 9.9988.9772',
  ])('replaces the phone %s', (phone) => {
    const out = redactContacts(`Chama no ${phone} hoje`)
    expect(out.text).toBe(`Chama no ${L} hoje`)
    expect(out.removed).toBe(1)
  })

  it.each([
    'Casal 30 e 28 anos',
    '1,70 m',
    '2x por mês',
    'Festa dia 25/12',
    'Quadra 104 bloco B',
    'R$ 50',
    'nós @ festa',
    'Casal liberal procura solteira para curtir a noite.',
  ])('keeps %s unchanged', (text) => {
    expect(redactContacts(text)).toEqual({ text, removed: 0 })
  })

  it.each([
    'casal@gmail.com',
    'casal.bsb@hotmail.com.br',
    'casal arroba gmail ponto com',
    'casal(at)gmail.com',
    'CASAL @ GMAIL . COM',
  ])('replaces the e-mail %s', (email) => {
    const out = redactContacts(`Escreve para ${email} beijos`)
    expect(out.text).toBe(`Escreve para ${L} beijos`)
    expect(out.removed).toBeGreaterThanOrEqual(1)
  })

  it.each([
    'https://exemplo.com/x',
    'www.exemplo.com.br',
    'exemplo.com.br',
    'wa.me/5561999889772',
    't.me/casalbsb',
    'instagram.com/casalbsb',
    'linktr.ee/casal',
  ])('replaces the link %s', (link) => {
    const out = redactContacts(`Veja ${link} agora`)
    expect(out.text).toBe(`Veja ${L} agora`)
    expect(out.removed).toBeGreaterThanOrEqual(1)
  })

  it.each([
    '@casalbsb',
    'insta: casalbsb',
    'instagram casal.bsb',
    'telegram: casalbsb',
    'tg casalbsb',
    'zap 61999889772',
    'whats: 61 99988-9772',
  ])('replaces the handle %s', (handle) => {
    const out = redactContacts(`Me chama ${handle} beijos`)
    expect(out.text).toBe(`Me chama ${L} beijos`)
    expect(out.removed).toBeGreaterThanOrEqual(1)
  })

  it('collapses several contacts in a row into one label and counts each', () => {
    const out = redactContacts('Contato: zap 6199988-9772 / casal@gmail.com obrigado')
    expect(out.text).toBe(`Contato: ${L} obrigado`)
    expect(out.removed).toBe(2)
  })

  it('handles empty text', () => {
    expect(redactContacts('')).toEqual({ text: '', removed: 0 })
  })

  it('is idempotent', () => {
    const samples = [
      'Casal 30 e 28 anos, chama no (61) 9 9988-9772 ou casal@gmail.com',
      'insta: casalbsb e t.me/casalbsb',
      'Nada para remover aqui.',
    ]
    for (const s of samples) {
      const once = redactContacts(s).text
      expect(redactContacts(once).text).toBe(once)
    }
  })

  it('runs fast on a 600-character text with 5 contacts', () => {
    const base =
      'Casal 30 e 28 anos procura solteira. Zap (61) 9 9988-9772, e-mail casal@gmail.com, insta: casalbsb, t.me/casalbsb, site www.casal.com.br. '
    const text = base.repeat(10).slice(0, 600)
    const start = performance.now()
    redactContacts(text)
    expect(performance.now() - start).toBeLessThan(50)
  })
})
