import { describe, expect, it } from 'vitest'

import { ENVIO_MIDIA_MESSAGES, normalizarContato, validarEnvioMidia } from '@/lib/midia-enviada/regras'

const ok = { apelido: ' Casal  BSB ', contato: 'Fulano@Exemplo.com', mensagem: '', maior18: true, autorizacao: true }

describe('validarEnvioMidia', () => {
  it('normalises a valid submission', () => {
    expect(validarEnvioMidia(ok)).toEqual({ ok: true, value: { apelido: 'Casal BSB', contato: 'fulano@exemplo.com', mensagem: null } })
  })

  it('requires both declarations, a nickname and a contact', () => {
    const r = validarEnvioMidia({ ...ok, apelido: '', contato: 'x', maior18: false, autorizacao: false })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['apelido', 'autorizacao', 'contato', 'maior18'])
      expect(r.errors.autorizacao).toBe(ENVIO_MIDIA_MESSAGES.autorizacao)
    }
  })

  it('limits the message', () => {
    expect(validarEnvioMidia({ ...ok, mensagem: 'a'.repeat(1001) }).ok).toBe(false)
    expect(validarEnvioMidia({ ...ok, mensagem: 'a'.repeat(1000) }).ok).toBe(true)
  })
})

describe('normalizarContato', () => {
  it('keeps digits of a phone with 10 to 13 digits', () => {
    expect(normalizarContato('(61) 99988-9772')).toBe('61999889772')
    expect(normalizarContato('+55 61 99988-9772')).toBe('5561999889772')
    expect(normalizarContato('12345')).toBeNull()
    expect(normalizarContato('61 9998 abc 9772')).toBeNull()
  })
  it('accepts only well-formed e-mails', () => {
    expect(normalizarContato('a@b.co')).toBe('a@b.co')
    expect(normalizarContato('a@b')).toBeNull()
    expect(normalizarContato('')).toBeNull()
  })
})
