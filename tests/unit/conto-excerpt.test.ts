import { describe, expect, it } from 'vitest'

import {
  chamadaOf,
  plainTextOf,
  SLUG_RE,
  slugify,
  splitConto,
  wordCount,
  type LexicalStateLike,
} from '@/lib/contos/excerpt'

const text = (t: string, format = 0) => ({ type: 'text', text: t, format, detail: 0, mode: 'normal', style: '', version: 1 })
const para = (t: string) => ({ type: 'paragraph', children: [text(t)], version: 1 })
const state = (children: unknown[]): LexicalStateLike => ({ root: { type: 'root', children } })
const five = () => state([1, 2, 3, 4, 5].map((i) => para(`Parágrafo número ${i} do conto.`)))

describe('splitConto', () => {
  it('opens n blocks but always leaves one for subscribers', () => {
    expect(splitConto(five(), 3)).toMatchObject({ openBlocks: 3, totalBlocks: 5 })
    expect(splitConto(five(), 5)).toMatchObject({ openBlocks: 4, totalBlocks: 5 })
    expect(splitConto(five(), 99).openBlocks).toBe(4)
    expect(splitConto(five(), 0).openBlocks).toBe(1)
    expect(splitConto(five(), -2).openBlocks).toBe(1)
    expect(splitConto(five(), Number.NaN).openBlocks).toBe(3)
    expect(splitConto(state([para('a'), para('b')]), 3).openBlocks).toBe(1)
  })

  it('cuts a single block to its first 60 words', () => {
    const long = Array.from({ length: 100 }, (_, i) => `p${i}`).join(' ')
    const split = splitConto(state([para(long)]), 3)
    expect(split.openBlocks).toBe(1)
    expect(split.totalBlocks).toBe(1)
    const open = plainTextOf(split.open)
    expect(open.endsWith('…')).toBe(true)
    expect(wordCount(open)).toBe(60)
    expect(open).not.toContain('p60')
    expect(split.openWords).toBe(60)
    expect(split.totalWords).toBe(100)
  })

  it('handles empty states', () => {
    for (const s of [null, undefined, state([])]) {
      expect(splitConto(s, 3)).toMatchObject({ openBlocks: 0, totalBlocks: 0, totalWords: 0, openWords: 0 })
    }
  })

  it('counts headings and lists as blocks and does not mutate the input', () => {
    const input = state([
      { type: 'heading', tag: 'h2', children: [text('Título')] },
      { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [text('item')] }] },
      para('fim'),
    ])
    const before = JSON.stringify(input)
    const split = splitConto(input, 2)
    expect(split.openBlocks).toBe(2)
    expect(split.open).not.toBe(input)
    split.open.root.children.push('x')
    expect(JSON.stringify(input)).toBe(before)
  })
})

describe('plainTextOf / wordCount / chamadaOf', () => {
  it('ignores formats, turns linebreaks into newlines and separates blocks by a blank line', () => {
    const s = state([
      { type: 'paragraph', children: [text('a', 1), { type: 'linebreak' }, text('b', 2)] },
      { type: 'list', children: [{ type: 'listitem', children: [text('x')] }, { type: 'listitem', children: [text('y')] }] },
    ])
    expect(plainTextOf(s)).toBe('a\nb\n\nx\n\ny')
    expect(wordCount(' um  dois\ntrês ')).toBe(3)
    expect(wordCount('')).toBe(0)
  })

  it('cuts the chamada on a word boundary with an ellipsis', () => {
    const long = state([para(Array.from({ length: 80 }, (_, i) => `palavra${i}`).join(' '))])
    const c = chamadaOf(long, 200)
    expect(c.length).toBeLessThanOrEqual(200)
    expect(c.endsWith('…')).toBe(true)
    expect(c).not.toMatch(/\s…$/)
    expect(chamadaOf(state([para('curto')]))).toBe('curto')
  })
})

describe('slugify / SLUG_RE', () => {
  it('normalises titles', () => {
    expect(slugify('Conto da Maçã!')).toBe('conto-da-maca')
    expect(slugify('  --A  B--  ')).toBe('a-b')
    const s = slugify('a '.repeat(200))
    expect(s.length).toBeLessThanOrEqual(200)
    expect(s.endsWith('-')).toBe(false)
  })

  it('validates slugs', () => {
    expect(SLUG_RE.test('a-b-1')).toBe(true)
    for (const bad of ['A', 'a--b', '-a', 'a-', 'a b', '']) expect(SLUG_RE.test(bad)).toBe(false)
  })
})
