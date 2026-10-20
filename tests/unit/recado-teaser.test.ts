import { describe, expect, it } from 'vitest'

import { toPublicRecadoTeaser } from '../../src/lib/recados/dto'

describe('toPublicRecadoTeaser (D-05, T-05-03, T-05-19)', () => {
  it('drops redaction labels and @handles', () => {
    expect(toPublicRecadoTeaser('Casal BSB procurando amigos [contato só para assinantes] @casalbsb vem')).toBe(
      'Casal BSB procurando amigos vem',
    )
  })

  it('removes phones, e-mails and handles before anything is shown', () => {
    const out = toPublicRecadoTeaser('Chama 61 98877-6655 ou a@b.com ou @fulano agora')
    expect(out).not.toMatch(/98877|@|contato só/)
    expect(out).toContain('Chama')
  })

  it('cuts long text at 80 characters on a word boundary with an ellipsis', () => {
    const long = 'palavra '.repeat(30)
    const out = toPublicRecadoTeaser(long)
    expect(out.length).toBeLessThanOrEqual(81)
    expect(out.endsWith('…')).toBe(true)
    expect(out.slice(0, -1).split(' ').every((w) => w === 'palavra')).toBe(true)
  })

  it('keeps short text as is, without ellipsis', () => {
    expect(toPublicRecadoTeaser('Oi, tudo bem?')).toBe('Oi, tudo bem?')
  })

  it('returns an empty string when only contacts remain', () => {
    expect(toPublicRecadoTeaser('[contato só para assinantes] @x')).toBe('')
  })
})
