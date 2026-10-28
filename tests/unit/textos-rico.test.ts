import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TextoRico } from '../../src/components/TextoRico'
import { preencherRico, ricoParaTexto, ricoTemTexto, type TextoRico as Estado, textoParaRico, textoPuro } from '../../src/lib/textos/rico'

type No = Record<string, unknown>

const texto = (text: string, format = 0): No => ({ type: 'text', version: 1, text, format })
const paragrafo = (...children: No[]): No => ({ type: 'paragraph', version: 1, children })
const link = (url: string, ...children: No[]): No => ({ type: 'link', version: 1, fields: { url, linkType: 'custom' }, children })
const lista = (tipo: 'bullet' | 'number', ...itens: string[]): No => ({
  type: 'list',
  version: 1,
  listType: tipo,
  children: itens.map((t, i) => ({ type: 'listitem', version: 1, value: i + 1, children: [texto(t)] })),
})
// Stored JSON is untrusted: tests build it loosely on purpose
const estado = (...children: No[]) => ({ root: { type: 'root', version: 1, children } }) as unknown as Estado

const html = (valor: Estado, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(TextoRico, { valor, ...props }))

describe('textoParaRico / ricoParaTexto', () => {
  it('round-trips paragraphs and line breaks', () => {
    const original = 'Linha um\nLinha dois\n\nSegundo parágrafo com {nome}'
    const rico = textoParaRico(original)
    expect(rico.root.children).toHaveLength(2)
    expect(ricoParaTexto(rico)).toBe(original)
  })

  it('drops blank paragraphs and normalises line endings', () => {
    expect(ricoParaTexto(textoParaRico('\r\nA\r\n\r\n\r\n\r\nB\r\n'))).toBe('A\n\nB')
    expect(textoParaRico('').root.children).toHaveLength(0)
  })

  it('reads lists as one item per line and ignores unknown nodes', () => {
    const rico = estado(paragrafo(texto('Antes')), lista('bullet', 'um', 'dois'), { type: 'upload', version: 1 })
    expect(ricoParaTexto(rico)).toBe('Antes\n\num\ndois')
  })
})

describe('textoPuro (soTexto destinations)', () => {
  it('drops marks and joins paragraphs and line breaks into one line', () => {
    const rico = estado(paragrafo(texto('Festas ', 1), texto('liberais', 2)), paragrafo(texto('em'), { type: 'linebreak', version: 1 }, texto('Brasília')))
    expect(textoPuro(rico)).toBe('Festas liberais em Brasília')
  })

  it('keeps list items as words and trims', () => {
    expect(textoPuro(estado(paragrafo(texto('  Antes  ')), lista('bullet', 'um', 'dois')))).toBe('Antes um dois')
  })

  it('is empty for an empty editor and works on the converted original', () => {
    expect(textoPuro(estado(paragrafo()))).toBe('')
    expect(textoPuro(textoParaRico('Casa de festas\n\nem Brasília'))).toBe('Casa de festas em Brasília')
  })
})

describe('ricoTemTexto', () => {
  it('accepts visible text only', () => {
    expect(ricoTemTexto(textoParaRico('Oi'))).toBe(true)
    expect(ricoTemTexto(estado(paragrafo(texto('  ')), paragrafo()))).toBe(false)
    expect(ricoTemTexto(estado(paragrafo()))).toBe(false)
    expect(ricoTemTexto(textoParaRico(''))).toBe(false)
  })

  it('rejects anything that is not editor JSON', () => {
    for (const invalido of [null, undefined, '', 'texto', 42, [], {}, { root: null }, { root: 'x' }, { root: { children: 'x' } }]) {
      expect(ricoTemTexto(invalido)).toBe(false)
    }
  })

  it('finds text nested in lists and links', () => {
    expect(ricoTemTexto(estado(lista('number', 'item')))).toBe(true)
    expect(ricoTemTexto(estado(paragrafo(link('/x', texto('aqui')))))).toBe(true)
  })
})

describe('preencherRico', () => {
  it('fills placeholders in every text node, keeping the formatting, without touching the input', () => {
    const entrada = estado(paragrafo(texto('Olá ', 0), texto('{nome}', 1)), lista('bullet', '{n} fotos'))
    const copia = JSON.stringify(entrada)
    const saida = preencherRico(entrada, { nome: 'Ana', n: 3 })
    expect(ricoParaTexto(saida)).toBe('Olá Ana\n\n3 fotos')
    expect(JSON.stringify(entrada)).toBe(copia)
    expect(html(saida)).toContain('<strong>Ana</strong>')
  })

  it('keeps unknown placeholders', () => {
    expect(ricoParaTexto(preencherRico(textoParaRico('a {x}'), {}))).toBe('a {x}')
  })
})

describe('TextoRico render (whitelist, T-02-04b)', () => {
  it('renders bold, italic, underline, strikethrough, lists and links', () => {
    const out = html(
      estado(
        paragrafo(texto('b', 1), texto('i', 2), texto('u', 8), texto('s', 4), texto('bi', 3)),
        lista('bullet', 'um', 'dois'),
        lista('number', 'primeiro'),
        paragrafo(link('https://exemplo.com/a', texto('externo')), link('/festas', texto('interno'))),
      ),
    )
    expect(out).toContain('<strong>b</strong>')
    expect(out).toContain('<em>i</em>')
    expect(out).toContain('<u>u</u>')
    expect(out).toContain('<s>s</s>')
    expect(out).toContain('<em><strong>bi</strong></em>')
    expect(out).toContain('<ul><li>um</li><li>dois</li></ul>')
    expect(out).toContain('<ol><li>primeiro</li></ol>')
    expect(out).toContain('<a href="https://exemplo.com/a" target="_blank" rel="noopener noreferrer">externo')
    expect(out).toContain('<a href="/festas">interno</a>')
    expect(out.startsWith('<div class="texto-rico">')).toBe(true)
  })

  it('never turns javascript:, data: or protocol-relative URLs into a href', () => {
    for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<b>x</b>', '//evil.example', 'vbscript:x', '']) {
      const out = html(estado(paragrafo(link(url, texto('clique')))))
      expect(out, url).not.toContain('href')
      expect(out, url).toContain('clique')
    }
    for (const url of ['mailto:a@b.com', 'tel:+5561999999999', '#topo']) {
      expect(html(estado(paragrafo(link(url, texto('ok'))))), url).toContain(`href="${url}"`)
    }
  })

  it('escapes markup typed as text', () => {
    const out = html(estado(paragrafo(texto('<script>alert(1)</script><img src=x onerror=alert(1)>'))))
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('drops nodes outside the whitelist', () => {
    const out = html(
      estado(
        { type: 'heading', tag: 'h1', version: 1, children: [texto('Título')] },
        { type: 'upload', version: 1, value: 3 },
        { type: 'block', version: 1, fields: { blockType: 'x' } },
        { type: 'relationship', version: 1, value: 1 },
        paragrafo(texto('fica')),
      ),
    )
    expect(out).not.toContain('Título')
    expect(out).not.toContain('<h1')
    expect(out).toBe('<div class="texto-rico"><p>fica</p></div>')
  })

  it('survives malformed stored JSON', () => {
    expect(() => html(estado({ type: 'paragraph', children: 'x' }, { type: 'text', text: 5 }, { type: 'link' }))).not.toThrow()
    expect(() => html({ root: null } as unknown as Estado)).not.toThrow()
  })

  it('fills {vars}, passes className, id and role', () => {
    const out = html(textoParaRico('Até {fotos} fotos'), { vars: { fotos: 10 }, className: 'mt-4 text-muted', id: 'ajuda', role: 'note' })
    expect(out).toBe('<div id="ajuda" role="note" class="texto-rico mt-4 text-muted"><p>Até 10 fotos</p></div>')
  })

  it('inline renders a span with no block elements', () => {
    const out = html(
      estado(paragrafo(texto('Um', 1)), paragrafo(texto('Dois')), lista('bullet', 'a', 'b'), paragrafo(link('/x', texto('ver')))),
      { inline: true },
    )
    expect(out).not.toMatch(/<(p|ul|ol|li|div)[ >]/)
    expect(out.startsWith('<span>')).toBe(true)
    expect(out).toContain('<strong>Um</strong><br/>Dois<br/>a<br/>b<br/><a href="/x">ver</a>')
  })
})

describe('TextoRico linha (line editor texts)', () => {
  it('keeps bold, italic, underline and strikethrough inline in a span', () => {
    const out = html(estado(paragrafo(texto('a', 1), texto('b', 2), texto('c', 8), texto('d', 4))), { linha: true })
    expect(out).toBe('<span><strong>a</strong><em>b</em><u>c</u><s>d</s></span>')
  })

  it('drops a stored link (words stay) and flattens a stored list to lines', () => {
    const out = html(estado(paragrafo(texto('Ver '), link('https://exemplo.com', texto('aqui'))), lista('bullet', 'um', 'dois')), { linha: true })
    expect(out).not.toContain('<a')
    expect(out).not.toContain('<ul')
    expect(out).not.toContain('<li')
    expect(out).toContain('Ver aqui')
    expect(out).toContain('um<br/>dois')
  })

  it('separates paragraphs with a line break and fills {vars}', () => {
    const out = html(estado(paragrafo(texto('Oi {nome}')), paragrafo(texto('Fim'))), { linha: true, vars: { nome: 'Ana' } })
    expect(out).toBe('<span>Oi Ana<br/>Fim</span>')
  })

  it('still renders links in the block mode (unchanged)', () => {
    expect(html(estado(paragrafo(link('https://exemplo.com', texto('aqui')))))).toContain('<a ')
  })
})
