import { describe, expect, it } from 'vitest'

import { REDACTED_LABEL } from '@/lib/classisex/redact'
import { RECADO_MESSAGES, recadoResumo, validateRecadoInput } from '@/lib/recados/rules'

describe('validateRecadoInput (D-01)', () => {
  it('keeps a clean text and trims the apelido', () => {
    const r = validateRecadoInput({ apelido: '  Casal   BSB ', texto: 'Casal tranquilo procurando amigos.' })
    expect(r).toEqual({
      ok: true,
      value: { apelido: 'Casal BSB', texto: 'Casal tranquilo procurando amigos.', contatosRemovidos: 0 },
    })
  })

  it('removes phones and e-mails and counts them', () => {
    const r = validateRecadoInput({
      apelido: 'Bia',
      texto: 'me chama no (61) 98877-6655 ou fulano@exemplo.test',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.texto.split(REDACTED_LABEL)).toHaveLength(3)
    expect(r.value.contatosRemovidos).toBe(2)
    expect(r.value.texto).not.toMatch(/98877|fulano/)
  })

  it('refuses a recado that is only a contact', () => {
    const r = validateRecadoInput({ apelido: 'Bia', texto: '(61) 98877-6655' })
    expect(r).toEqual({ ok: false, errors: { texto: RECADO_MESSAGES.soContato } })
  })

  it('checks length before redaction and rejects empty text', () => {
    expect(validateRecadoInput({ apelido: 'Bia', texto: 'a'.repeat(501) })).toEqual({
      ok: false,
      errors: { texto: 'O recado pode ter até 500 caracteres.' },
    })
    expect(validateRecadoInput({ apelido: 'Bia', texto: 'a'.repeat(500) }).ok).toBe(true)
    expect(validateRecadoInput({ apelido: 'Bia', texto: '   ' })).toEqual({ ok: false, errors: { texto: 'Escreva o recado.' } })
  })

  it('validates the apelido like the ClassiSex ones', () => {
    const r = validateRecadoInput({ apelido: 'Bia 61 98877 6655', texto: 'Oi' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.apelido).toBe('O apelido não pode ter telefone, e-mail, @ ou link. Use só um nome ou apelido.')
    expect(validateRecadoInput({ apelido: '', texto: 'Oi' })).toEqual({ ok: false, errors: { apelido: 'Escolha um apelido.' } })
  })

  it('builds the admin title', () => {
    expect(recadoResumo('Bia', 'texto curto')).toBe('Bia — texto curto')
    expect(recadoResumo('Bia', 'x'.repeat(100))).toBe(`Bia — ${'x'.repeat(60)}…`)
  })
})
