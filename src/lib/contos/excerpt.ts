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

/** Open words never exceed max(OPEN_CAP_MIN_WORDS, OPEN_CAP_RATIO of the total), whatever staff set. */
export const OPEN_CAP_MIN_WORDS = 150
export const OPEN_CAP_RATIO = 0.15
/** Stories long enough get at least this many open words. */
export const OPEN_FLOOR_WORDS = 40
/** Leading blocks shorter than this (titles, headings) do not count toward the open blocks. */
export const TITLE_BLOCK_WORDS = 8

const SENTENCE_END = /[.!?…]["'”’)\]]*$/

/** Cuts a block to at most `room` words, at a sentence end when that keeps at least half of them. */
function cutBlock(text: string, room: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= room) return words.join(' ')
  let end = -1
  for (let i = room - 1; i >= Math.floor(room / 2); i--) {
    if (SENTENCE_END.test(words[i]!)) {
      end = i + 1
      break
    }
  }
  if (end > 0) return words.slice(0, end).join(' ')
  return `${words.slice(0, room).join(' ')}…`
}

/**
 * Open part of a conto. Top-level blocks: the first `n` content blocks stay open (leading blocks
 * under TITLE_BLOCK_WORDS words, like titles, do not count), but the open words are capped at
 * max(150, 15% of the story), at least one block always stays for subscribers, and stories of
 * 150+ words open at least ~40 words (a huge block is cut at a sentence). A single block is cut
 * to its first SINGLE_BLOCK_WORDS words.
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

  const sizes = blocks.map((b) => wordCount(plainTextOf(b)))
  const hasContent = sizes.some((w) => w >= TITLE_BLOCK_WORDS)
  let lead = 0
  if (hasContent) while (lead < blocks.length && sizes[lead]! < TITLE_BLOCK_WORDS) lead++

  const cap = Math.max(OPEN_CAP_MIN_WORDS, Math.ceil(totalWords * OPEN_CAP_RATIO))
  const floor = totalWords >= OPEN_CAP_MIN_WORDS ? OPEN_FLOOR_WORDS : 0
  const maxBlocks = blocks.length - 1 // the last block always stays for subscribers
  const target = Math.min(lead + clamped, maxBlocks)

  const kept: unknown[] = []
  let words = 0
  let leadWords = 0
  let i = 0
  while (i < blocks.length) {
    const contentWords = words - leadWords
    const needMore = i < target || contentWords < floor
    if (!needMore) break
    const size = sizes[i]!
    if (i < lead) {
      kept.push(structuredClone(blocks[i]))
      words += size
      leadWords += size
      i++
      continue
    }
    if (i >= maxBlocks) {
      // the last block always stays for subscribers
      break
    }
    if (words + size <= cap) {
      kept.push(structuredClone(blocks[i]))
      words += size
      i++
      continue
    }
    // Next block busts the cap: cut it only when the open part is still under the floor
    if (contentWords < floor || contentWords === 0) {
      const room = Math.max(cap - words, 1)
      const cut = cutBlock(plainTextOf(blocks[i]), room)
      kept.push(paragraphOf(cut))
      words += wordCount(cut.replace(/…$/, ''))
    }
    break
  }

  const open = emptyRoot(kept)
  return {
    open,
    openBlocks: kept.length,
    totalBlocks: blocks.length,
    openWords: wordCount(plainTextOf(open).replace(/…$/, '')),
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
