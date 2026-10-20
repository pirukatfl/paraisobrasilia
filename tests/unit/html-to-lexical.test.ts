import { describe, expect, it } from 'vitest'

import { decodeEntities, htmlToLexical, type LexicalNode } from '@/lib/contos/html-to-lexical'

const kids = (n: LexicalNode) => n.children as LexicalNode[]
const blocks = (html: string) => htmlToLexical(html).root.children
const plain = (n: LexicalNode): string =>
  kids(n)
    .map((c) => (c.type === 'text' ? String(c.text) : c.type === 'linebreak' ? '\n' : plain(c)))
    .join('')

describe('htmlToLexical', () => {
  it('splits classic autop text on blank lines and turns newlines into linebreaks', () => {
    const out = blocks('Primeiro parágrafo.\r\n\r\nSegundo\nlinha dois.')
    expect(out).toHaveLength(2)
    expect(plain(out[0]!)).toBe('Primeiro parágrafo.')
    expect(kids(out[1]!).map((c) => c.type)).toEqual(['text', 'linebreak', 'text'])
    expect(kids(out[1]!)[0]!.text).toBe('Segundo')
    expect(kids(out[1]!)[2]!.text).toBe('linha dois.')
  })

  it('maps bold and italic to the format bitmask', () => {
    const [p] = blocks('<p>Um <strong>forte</strong> e <em>leve</em> e <b><i>ambos</i></b></p>')
    expect(kids(p!).map((c) => c.format)).toEqual([0, 1, 0, 2, 0, 3])
    expect(plain(p!)).toBe('Um forte e leve e ambos')
  })

  it('maps headings to h2/h3', () => {
    const out = blocks('<h1>A</h1><h2>B</h2><h4>C</h4>')
    expect(out.map((n) => [n.type, n.tag])).toEqual([['heading', 'h2'], ['heading', 'h2'], ['heading', 'h3']])
  })

  it('builds bullet and number lists', () => {
    const out = blocks('<ul><li>um</li><li>dois</li></ul><ol><li>três</li></ol>')
    expect(out.map((n) => n.listType)).toEqual(['bullet', 'number'])
    expect(kids(out[0]!).map((i) => [i.type, i.value, plain(i)])).toEqual([
      ['listitem', 1, 'um'],
      ['listitem', 2, 'dois'],
    ])
    expect(plain(kids(out[1]!)[0]!)).toBe('três')
  })

  it('unwraps Elementor markup', () => {
    const a = blocks('<div class="elementor-widget-container"><div class="elementor-text-editor"><p>Texto</p></div></div>')
    expect(a).toHaveLength(1)
    expect(plain(a[0]!)).toBe('Texto')
    const b = blocks('<section class="elementor-section"><span style="color:red">Oi</span></section>')
    expect(b).toHaveLength(1)
    expect(plain(b[0]!)).toBe('Oi')
  })

  it('drops Gutenberg comments, shortcodes and dangerous elements with their content', () => {
    const html =
      '<!-- wp:paragraph --><p>Ok</p><!-- /wp:paragraph -->[elementor-template id="12"]' +
      '[caption id="x"]<img src="a.jpg"> legenda[/caption]<script>alert(1)</script><style>p{}</style>' +
      '<iframe src="https://x.test"></iframe><img src="a.jpg" onerror="x()"><figure><p>fig</p></figure><p>Fim</p>'
    const out = blocks(html)
    expect(out.map(plain)).toEqual(['Ok', 'Fim'])
    const json = JSON.stringify(htmlToLexical(html))
    for (const bad of ['<script', 'onerror', 'elementor-', '[elementor', 'alert', 'legenda']) expect(json).not.toContain(bad)
  })

  it('keeps bracketed words that are not shortcodes', () => {
    expect(plain(blocks('<p>Ela riu [risos] muito</p>')[0]!)).toBe('Ela riu [risos] muito')
  })

  it('keeps only the text of links', () => {
    const [p] = blocks('<p><a href="https://x.test">link</a></p>')
    expect(kids(p!)).toHaveLength(1)
    expect(JSON.stringify(p)).not.toContain('x.test')
  })

  it('decodes entities and keeps a literal "<3"', () => {
    expect(decodeEntities('a&nbsp;b &amp; &#8220;c&#x2019; &hellip;')).toBe('a b & “c’ …')
    expect(plain(blocks('<p>eu &lt;3 você, 2 <3 3</p>')[0]!)).toBe('eu <3 você, 2 <3 3')
    expect(decodeEntities('&#99999999999;&naoexiste;')).toBe('&#99999999999;&naoexiste;')
  })

  it('collapses whitespace and drops empty blocks', () => {
    expect(blocks('<p>&nbsp;</p><div></div><div>  </div>')).toEqual([])
    const [p] = blocks('<p>  muito   espaço \n aqui  </p>')
    expect(plain(p!)).toBe('muito espaço aqui')
  })

  it('only emits allowed node types', () => {
    const allowed = new Set(['root', 'paragraph', 'heading', 'list', 'listitem', 'text', 'linebreak'])
    const state = htmlToLexical(
      '<h2>T</h2><p>a<br>b <strong>c</strong></p><ul><li>x</li></ul>\n\nsolto\nlinha<table><tr><td>cel</td></tr></table>',
    )
    const walk = (n: LexicalNode) => {
      expect(allowed.has(String(n.type))).toBe(true)
      for (const c of (n.children as LexicalNode[] | undefined) ?? []) walk(c)
    }
    walk(state.root)
  })

  it('returns an empty root for empty input', () => {
    expect(htmlToLexical('').root.children).toEqual([])
    expect(htmlToLexical('   \n ').root.children).toEqual([])
  })
})
