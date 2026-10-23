import { describe, expect, it } from 'vitest'

import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  APELIDO_MAX,
  CIDADE_MAX,
  TEXT_MAX,
  normaliseCidade,
  resumoOf,
  validateAdInput,
  type AdInput,
} from '../../src/lib/classisex/rules'

const valid: AdInput = {
  apelido: 'Casal BSB',
  euSou: 1,
  cidade: 'Brasília',
  texto: 'Casal liberal procura amigos para a próxima festa.',
  whatsapp: '+55 (61) 99988-9772',
  telegram: '@casal_bsb',
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
    expect(APELIDO_MAX).toBe(40)
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
    })
    expect(result.value.apelido).toBe('Casal BSB')
    expect(result.value.cidade).toBe('Brasília')
    expect(result.value.cidadeBusca).toBe('brasilia')
    expect(result.value.euSou).toBe(1)
  })

  it('accepts a single contact and an empty cidade', () => {
    const result = validateAdInput({ ...valid, whatsapp: '', cidade: '  ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contato).toEqual({ whatsapp: null, telegram: 'casal_bsb' })
    expect(result.value.cidade).toBeNull()
  })

  it.each([
    [{ apelido: '  ' }, 'apelido', 'Escolha um apelido para o anúncio.'],
    [{ apelido: 'a'.repeat(41) }, 'apelido', 'O apelido pode ter até 40 caracteres.'],
    [{ texto: '   ' }, 'texto', 'Escreva o texto do anúncio.'],
    [{ texto: 'a'.repeat(601) }, 'texto', 'O texto pode ter até 600 caracteres.'],
    [{ whatsapp: '61999889772' }, 'whatsapp', 'WhatsApp: só números, com 55 e DDD (ex.: 5561999889772).'],
    [{ telegram: '@ab' }, 'telegram', 'Telegram: use o @ do seu usuário (5 a 32 letras, números ou _).'],
    [{ cidade: 'Brasília 61 9999' }, 'cidade', 'Cidade: use só letras.'],
    [{ euSou: null }, 'euSou', 'Escolha uma opção em "Eu sou".'],
    [{ consent: false }, 'consent', 'Confirme a declaração para enviar.'],
  ] as const)('refuses %o', (input, key, message) => {
    expect(errorsOf(input as Partial<AdInput>)[key]).toBe(message)
  })

  it.each([
    'chama 61 99988-9772',
    'casal@gmail.com',
    '@casalbsb',
    'casalbsb.com.br',
    'https://wa.me/5561999889772',
    'zap 61999889772',
    'insta: casalbsb',
  ])('refuses an apelido with a contact: %s', (apelido) => {
    expect(errorsOf({ apelido }).apelido).toBe('O apelido não pode ter telefone, e-mail, @ ou link. Use só um nome ou apelido.')
  })

  it('accepts a plain apelido of exactly 40 characters', () => {
    expect(validateAdInput({ ...valid, apelido: 'Casal Fogo 40' }).ok).toBe(true)
    expect(validateAdInput({ ...valid, apelido: 'a'.repeat(40) }).ok).toBe(true)
  })

  it('the contact is optional and an e-mail is never stored as contact', () => {
    const result = validateAdInput({ ...valid, whatsapp: '', telegram: '', email: 'a@b.com' } as AdInput)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.contato).toEqual({ whatsapp: null, telegram: null })
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

describe('upload codes for the free-account limits (G-02)', () => {
  it('maps the hook messages to the codes and the codes to messages with the Assine Já pointer', async () => {
    const { AD_MEDIA_MESSAGES, UPLOAD_ERROR_MESSAGES, uploadCodeFor, uploadErrorMessage } = await import(
      '../../src/lib/classisex/media-messages'
    )
    expect(uploadCodeFor(AD_MEDIA_MESSAGES.fotosGratis, 'foto')).toBe('limite-fotos-gratis')
    expect(uploadCodeFor(AD_MEDIA_MESSAGES.videoGratis, 'video')).toBe('video-gratis')
    expect(uploadCodeFor(AD_MEDIA_MESSAGES.fotos, 'foto')).toBe('limite-fotos')
    expect(UPLOAD_ERROR_MESSAGES['limite-fotos-gratis']).toMatch(/Veja os planos em Assine Já\.$/)
    expect(uploadErrorMessage('video-gratis')).toMatch(/Veja os planos em Assine Já\.$/)
  })

  it('keeps 3 active ads for both tiers', async () => {
    const { TIER_LIMITS } = await import('../../src/lib/assinantes/tier')
    expect(TIER_LIMITS.gratis.anunciosAtivos).toBe(ACTIVE_LIMIT)
    expect(TIER_LIMITS.assinante.anunciosAtivos).toBe(ACTIVE_LIMIT)
  })
})
