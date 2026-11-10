import { describe, expect, it } from 'vitest'

import { duracaoRotulo, estaPublicado } from '../../src/lib/midia-enviada/publicacao'

describe('estaPublicado', () => {
  it('is true only for an approved submission and a file not hidden', () => {
    expect(estaPublicado({ kind: 'foto', oculto: false, envioStatus: 'aprovado' })).toBe(true)
    expect(estaPublicado({ kind: 'video', oculto: null, envioStatus: 'aprovado' })).toBe(true)
    expect(estaPublicado({ kind: 'video', oculto: undefined, envioStatus: 'aprovado' })).toBe(true)
  })
  it('is false for hidden files and for new, refused or unknown submissions', () => {
    expect(estaPublicado({ kind: 'foto', oculto: true, envioStatus: 'aprovado' })).toBe(false)
    for (const envioStatus of ['novo', 'recusado', '', null, undefined]) {
      expect(estaPublicado({ kind: 'foto', oculto: false, envioStatus })).toBe(false)
    }
  })
  it('is false for an unknown kind', () => {
    expect(estaPublicado({ kind: 'audio', oculto: false, envioStatus: 'aprovado' })).toBe(false)
    expect(estaPublicado({ kind: null, oculto: false, envioStatus: 'aprovado' })).toBe(false)
  })
})

describe('duracaoRotulo', () => {
  it('formats minutes and seconds', () => {
    expect(duracaoRotulo(42)).toBe('0:42')
    expect(duracaoRotulo(65)).toBe('1:05')
    expect(duracaoRotulo(720)).toBe('12:00')
    expect(duracaoRotulo(0)).toBe('0:00')
    expect(duracaoRotulo(9.6)).toBe('0:10')
  })
  it('is null when unknown or invalid', () => {
    expect(duracaoRotulo(null)).toBeNull()
    expect(duracaoRotulo(undefined)).toBeNull()
    expect(duracaoRotulo(-1)).toBeNull()
    expect(duracaoRotulo(Number.NaN)).toBeNull()
  })
})
