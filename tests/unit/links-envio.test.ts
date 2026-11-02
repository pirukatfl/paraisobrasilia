import { describe, expect, it } from 'vitest'

import { ENVIO_CONTOS_HREF, ENVIO_MIDIA_HREF, linkarEstado, partirTextoComLinks } from '@/lib/site/links'

describe('partirTextoComLinks', () => {
  it('links "contos" and "fotos e vídeos" (also without accent, any case)', () => {
    expect(partirTextoComLinks('Envie contos e Fotos e Videos agora')).toEqual([
      { texto: 'Envie ' },
      { texto: 'contos', href: ENVIO_CONTOS_HREF },
      { texto: ' e ' },
      { texto: 'Fotos e Videos', href: ENVIO_MIDIA_HREF },
      { texto: ' agora' },
    ])
    expect(partirTextoComLinks('fotos e vídeos')[0]).toEqual({ texto: 'fotos e vídeos', href: ENVIO_MIDIA_HREF })
  })

  it('does not link inside other words or the singular', () => {
    expect(partirTextoComLinks('um conto, descontos e contosa')).toEqual([{ texto: 'um conto, descontos e contosa' }])
  })

  it('returns plain text untouched', () => {
    expect(partirTextoComLinks('sem palavras')).toEqual([{ texto: 'sem palavras' }])
    expect(partirTextoComLinks('')).toEqual([])
  })
})

describe('linkarEstado', () => {
  const texto = (text: string, format = 0) => ({ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' })
  const estado = (children: unknown[]) => ({
    root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, children }] },
  })

  it('splits text nodes into text + link, keeping the format of the words', () => {
    const out = linkarEstado(estado([texto('Mande seus contos hoje', 1)]))
    const filhos = (out.root as { children: { children: Record<string, unknown>[] }[] }).children[0].children
    expect(filhos).toHaveLength(3)
    expect(filhos[0]).toMatchObject({ type: 'text', text: 'Mande seus ', format: 1 })
    expect(filhos[1]).toMatchObject({ type: 'link', fields: { url: ENVIO_CONTOS_HREF } })
    expect((filhos[1].children as Record<string, unknown>[])[0]).toMatchObject({ text: 'contos', format: 1 })
    expect(filhos[2]).toMatchObject({ type: 'text', text: ' hoje' })
  })

  it('leaves an existing link alone', () => {
    const link = { type: 'link', version: 3, fields: { url: 'https://x.test' }, children: [texto('contos')] }
    const e = estado([link])
    expect(linkarEstado(e)).toEqual(e)
  })

  it('does not change a state without the words', () => {
    const e = estado([texto('Nada a linkar')])
    expect(linkarEstado(e)).toEqual(e)
  })
})
