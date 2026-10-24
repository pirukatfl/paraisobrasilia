import { describe, expect, it } from 'vitest'

import { TEXTO_MAX, TEXTO_MIN, textoToLexical, validateContoEnvio, type ContoEnvioInput } from '@/lib/contos/envio-rules'
import { plainTextOf, splitConto, type LexicalStateLike } from '@/lib/contos/excerpt'

const TEXTO = 'Era uma vez uma festa muito animada no Paraíso. '.repeat(10)
const ok: ContoEnvioInput = { title: ' Uma  noite ', assinadoComo: '', texto: TEXTO, email: ' A@B.COM ', consent: true, termos: true }

describe('validateContoEnvio', () => {
  it('normalises a valid submission', () => {
    const r = validateContoEnvio(ok)
    expect(r).toEqual({ ok: true, value: { title: 'Uma noite', assinadoComo: null, texto: TEXTO.trim(), email: 'a@b.com' } })
  })

  it('checks the limits of title, text and nickname', () => {
    const bad = (over: Partial<ContoEnvioInput>) => {
      const r = validateContoEnvio({ ...ok, ...over })
      return r.ok ? {} : r.errors
    }
    expect(bad({ title: 'ab' })).toHaveProperty('title')
    expect(bad({ title: 'a'.repeat(161) })).toHaveProperty('title')
    expect(bad({ texto: 'a'.repeat(TEXTO_MIN - 1) })).toHaveProperty('texto')
    expect(bad({ texto: 'a '.repeat(TEXTO_MAX) })).toHaveProperty('texto')
    expect(bad({ assinadoComo: 'a'.repeat(61) })).toHaveProperty('assinadoComo')
    expect(bad({ texto: `${TEXTO} zap 61 99988-9772` })).toHaveProperty('texto')
    expect(bad({ texto: `${TEXTO} siga @casalbsb` })).toHaveProperty('texto')
    expect(bad({ texto: `${TEXTO} veja https://exemplo.com.br/x` })).toHaveProperty('texto')
  })

  it('requires the 18+/authorship declaration and the terms', () => {
    const r = validateContoEnvio({ ...ok, consent: false, termos: false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['consent', 'termos'])
  })
})

describe('textoToLexical', () => {
  it('turns blank lines into paragraphs and single newlines into line breaks', () => {
    const state = textoToLexical('Primeiro\nainda primeiro\r\n\r\nSegundo\n\n\n\nTerceiro')
    const kids = state.root.children
    expect(kids).toHaveLength(3)
    expect(kids.every((k) => k.type === 'paragraph')).toBe(true)
    expect((kids[0]!.children as { type: string }[]).map((c) => c.type)).toEqual(['text', 'linebreak', 'text'])
    expect(plainTextOf(state)).toBe('Primeiro\nainda primeiro\n\nSegundo\n\nTerceiro')
  })

  it('keeps markup as plain text and strips control characters', () => {
    const state = textoToLexical('<script>alert(1)</script>\u0000\u0007 ok')
    expect(JSON.stringify(state)).not.toContain('\\u0000')
    const text = (state.root.children[0]!.children as { text: string }[])[0]!.text
    expect(text).toBe('<script>alert(1)</script> ok')
  })

  it('feeds the paywall split like any other conto', () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => `Parágrafo ${i} ${'texto '.repeat(30)}`).join('\n\n')
    const split = splitConto(textoToLexical(paragraphs) as unknown as LexicalStateLike, 3)
    expect(split.totalBlocks).toBe(6)
    expect(split.openBlocks).toBeLessThan(6)
  })
})
