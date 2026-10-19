import { describe, expect, it } from 'vitest'

import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  CIDADE_MAX,
  TEXT_MAX,
  normaliseCidade,
  resumoOf,
  validateAdInput,
  type AdInput,
} from '../../src/lib/classisex/rules'

const valid: AdInput = {
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal liberal procura amigos para a próxima festa.',
  whatsapp: '+55 (61) 99988-9772',
  telegram: '@casal_bsb',
  email: 'Casal@Exemplo.com',
  consent: true,
}

const errorsOf = (input: Partial<AdInput>) => {
  const result = validateAdInput({ ...valid, ...input })
  if (result.ok) throw new Error('expected errors')
  return result.errors
}

describe('ClassiSex ad rules (D-01, D-02)', () => {
  it('exposes the limits', () => {
    expect(TEXT_MAX).toBe(600)
    expect(CIDADE_MAX).toBe(60)
    expect(ACTIVE_LIMIT).toBe(3)
    expect(ACTIVE_STATUSES).toEqual(['pendente', 'aprovado'])
  })

  it('normalises a valid ad', () => {
    const result = validateAdInput(valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contato).toEqual({
      whatsapp: '5561999889772',
      telegram: 'casal_bsb',
      email: 'casal@exemplo.com',
    })
    expect(result.value.cidade).toBe('Brasília')
    expect(result.value.cidadeBusca).toBe('brasilia')
    expect(result.value.euSou).toBe(1)
  })

  it('accepts a single contact and an empty cidade', () => {
    const result = validateAdInput({ ...valid, whatsapp: '', telegram: '', cidade: '  ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contato).toEqual({ whatsapp: null, telegram: null, email: 'casal@exemplo.com' })
    expect(result.value.cidade).toBeNull()
  })

  it.each([
    [{ whatsapp: '', telegram: '', email: '' }, 'contato', 'Informe pelo menos um contato: WhatsApp, Telegram ou e-mail.'],
    [{ texto: '   ' }, 'texto', 'Escreva o texto do anúncio.'],
    [{ texto: 'a'.repeat(601) }, 'texto', 'O texto pode ter até 600 caracteres.'],
    [{ whatsapp: '61999889772' }, 'whatsapp', 'WhatsApp: só números, com 55 e DDD (ex.: 5561999889772).'],
    [{ telegram: '@ab' }, 'telegram', 'Telegram: use o @ do seu usuário (5 a 32 letras, números ou _).'],
    [{ email: 'x@' }, 'email', 'E-mail inválido.'],
    [{ cidade: 'Brasília 61 9999' }, 'cidade', 'Cidade: use só letras.'],
    [{ euSou: null }, 'euSou', 'Escolha uma opção em "Eu sou".'],
    [{ consent: false }, 'consent', 'Confirme a declaração para enviar.'],
  ] as const)('refuses %o', (input, key, message) => {
    expect(errorsOf(input as Partial<AdInput>)[key]).toBe(message)
  })

  it('accepts exactly 600 characters', () => {
    expect(validateAdInput({ ...valid, texto: 'a'.repeat(600) }).ok).toBe(true)
  })

  it('normalises cidade for search', () => {
    expect(normaliseCidade('  São  Sebastião ')).toBe('sao sebastiao')
  })

  it('builds the admin title', () => {
    expect(resumoOf('Casal', 'Brasília', 'Texto curto')).toBe('Casal · Brasília — Texto curto')
    expect(resumoOf('Solteira', null, 'Oi')).toBe('Solteira — Oi')
    const long = 'x'.repeat(80)
    expect(resumoOf('Casal', 'Brasília', long)).toBe(`Casal · Brasília — ${'x'.repeat(60)}…`)
  })
})
