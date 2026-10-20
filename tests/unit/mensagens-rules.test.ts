import { describe, expect, it } from 'vitest'

import { MENSAGEM_MESSAGES, MESSAGE_MAX, messageError, pairKey, RECADO_ANUNCIO_GRATUITO } from '../../src/lib/mensagens/rules'

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

  it('has a message for every error, in recado wording (R-01, I-3)', () => {
    expect(MENSAGEM_MESSAGES).toEqual({
      vazio: 'Escreva o recado.',
      longa: 'O recado pode ter até 2.000 caracteres.',
      remetenteInativo: 'Sua assinatura não está ativa. Renove para mandar recados.',
      destinatarioInativo: 'Esta pessoa está sem assinatura ativa e não recebe recados agora.',
      propria: 'Este anúncio é seu.',
      limiteConversas: 'Você já começou 20 conversas hoje. Tente amanhã.',
      limiteMensagens: 'Você enviou muitos recados hoje. Tente amanhã.',
      semApelido: 'Escolha um apelido para mandar recados.',
      bloqueado: 'Não é possível mandar recados para esta pessoa.',
      voceBloqueou: 'Você bloqueou esta pessoa. Desbloqueie para voltar a conversar.',
      suspenso: 'Seu envio de recados foi suspenso pela equipe. Fale com a casa pelo WhatsApp.',
    })
    expect(MENSAGEM_MESSAGES.limiteConversas).toContain('20 conversas')
    for (const text of [...Object.values(MENSAGEM_MESSAGES), RECADO_ANUNCIO_GRATUITO]) {
      expect(text).not.toMatch(/mensage[mn]/i)
    }
  })

  it('exports the note for a free advertiser', () => {
    expect(RECADO_ANUNCIO_GRATUITO).toBe(
      'Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.',
    )
  })
})
