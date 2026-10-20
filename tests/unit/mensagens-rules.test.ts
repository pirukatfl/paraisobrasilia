import { describe, expect, it } from 'vitest'

import { MENSAGEM_MESSAGES, MESSAGE_MAX, messageError, pairKey } from '../../src/lib/mensagens/rules'

describe('mensagens rules (REC-02)', () => {
  it('pairKey is symmetric', () => {
    expect(pairKey(7, 3)).toBe('3-7')
    expect(pairKey(3, 7)).toBe('3-7')
  })

  it('validates text length after trimming', () => {
    expect(messageError('   ')).toBe('vazio')
    expect(messageError('x'.repeat(MESSAGE_MAX + 1))).toBe('longa')
    expect(messageError('x'.repeat(MESSAGE_MAX))).toBeNull()
    expect(messageError('Oi')).toBeNull()
  })

  it('has a message for every error', () => {
    expect(MENSAGEM_MESSAGES.vazio).toBe('Escreva a mensagem.')
    expect(MENSAGEM_MESSAGES.limiteConversas).toContain('20 conversas')
  })
})
