// PREV-03 / D-03: one rule for the admin preview, the public DTO and the import report.
// Pure module: safe to import from a client component (no payload/next/react imports).

export const DEFAULT_OPEN_BLOCKS = 3
export const MAX_OPEN_BLOCKS = 20
/** A conto with a single block shows only this many words to visitors. */
export const SINGLE_BLOCK_WORDS = 60

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MAX = 200

export type LexicalStateLike = { root: { children: unknown[] } & Record<string, unknown> }

type NodeLike = { type?: string; text?: string; children?: unknown[] } & Record<string, unknown>

function textOfNode(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as NodeLike
  if (n.type === 'text') return typeof n.text === 'string' ? n.text : ''
  if (n.type === 'linebreak') return '\n'
  const children = Array.isArray(n.children) ? n.children : []
  if (n.type === 'root' || n.type === 'list') {
    return children
      .map(textOfNode)
      .filter((part) => part.trim() !== '')
      .join('\n\n')
  }
  return children.map(textOfNode).join('')
}

/** Plain text of a Lexical state or node: blocks and list items separated by a blank line. */
export function plainTextOf(stateOrNode: unknown): string {
  if (!stateOrNode || typeof stateOrNode !== 'object') return ''
  const maybe = stateOrNode as { root?: unknown }
  return textOfNode(maybe.root ?? stateOrNode)
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export type ContoSplit = {
  open: LexicalStateLike
  openBlocks: number
  totalBlocks: number
  openWords: number
  totalWords: number
}

function emptyRoot(children: unknown[] = []): LexicalStateLike {
  return { root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 } }
}

function paragraphOf(text: string): unknown {
  return {
    type: 'paragraph',
    children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    textFormat: 0,
    textStyle: '',
  }
}

/**
 * Open part of a conto. Top-level blocks: the first `n` stay open, but at least one block always
 * stays for subscribers; a single block is cut to its first SINGLE_BLOCK_WORDS words.
 */
export function splitConto(state: LexicalStateLike | null | undefined, n: number): ContoSplit {
  const blocks = Array.isArray(state?.root?.children) ? state!.root.children : []
  const totalWords = wordCount(plainTextOf(state))
  if (blocks.length === 0) {
    return { open: emptyRoot(), openBlocks: 0, totalBlocks: 0, openWords: 0, totalWords }
  }
  const wanted = Number.isFinite(n) ? Math.trunc(n) : DEFAULT_OPEN_BLOCKS
  const clamped = Math.min(Math.max(wanted, 1), MAX_OPEN_BLOCKS)

  if (blocks.length === 1) {
    const words = plainTextOf(blocks[0]).trim().split(/\s+/).filter(Boolean)
    const limit =
      words.length > SINGLE_BLOCK_WORDS ? SINGLE_BLOCK_WORDS : Math.max(1, Math.floor(words.length / 2))
    const text = words.slice(0, limit).join(' ') + (words.length > limit ? '…' : '')
    const open = emptyRoot([paragraphOf(text)])
    return { open, openBlocks: 1, totalBlocks: 1, openWords: limit, totalWords }
  }

  const openBlocks = Math.min(clamped, blocks.length - 1)
  const open = emptyRoot(structuredClone(blocks.slice(0, openBlocks)))
  return {
    open,
    openBlocks,
    totalBlocks: blocks.length,
    openWords: wordCount(plainTextOf(open)),
    totalWords,
  }
}

/** Short teaser for cards and meta description: word boundary, '…' when cut. */
export function chamadaOf(open: LexicalStateLike, max = 200): string {
  const text = plainTextOf(open).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  let cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  if (space > 0 && text[max - 1] !== ' ') cut = cut.slice(0, space)
  return `${cut.trimEnd()}…`
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
}
