/**
 * WordPress / Elementor HTML -> Lexical editor state, without a DOM library (05-RESEARCH Finding 1).
 * Handles classic "autop" text (blank line = paragraph, newline = <br>), Gutenberg comments,
 * Elementor wrapper markup, shortcodes and entities.
 *
 * // T-05-13: only text-bearing Lexical nodes are produced; nothing executable is stored
 * (paragraph, heading, list, listitem, text, linebreak). Links, images and embeds are dropped.
 */

export type LexicalNode = Record<string, unknown>
export type LexicalState = {
  root: { type: 'root'; children: LexicalNode[]; direction: 'ltr'; format: ''; indent: 0; version: 1 }
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  hellip: '…',
  ndash: '–',
  mdash: '—',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  bdquo: '„',
  bull: '•',
  middot: '·',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  cent: '¢',
  pound: '£',
  sect: '§',
  para: '¶',
  iexcl: '¡',
  iquest: '¿',
  ordf: 'ª',
  ordm: 'º',
  shy: '',
  zwnj: '',
  zwj: '',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  ccedil: 'ç',
  ntilde: 'ñ',
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Eacute: 'É',
  Ecirc: 'Ê',
  Iacute: 'Í',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Uacute: 'Ú',
  Ccedil: 'Ç',
}

/** Decodes the few named entities WordPress uses plus numeric (&#NNN; / &#xHH;) ones. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return whole
      if (code === 0xa0) return ' '
      return String.fromCodePoint(code)
    }
    const hit = NAMED_ENTITIES[body]
    return hit === undefined ? whole : hit
  })
}

// ---------------------------------------------------------------------------------------------
// Node builders (shapes pinned by tests/helpers/seed.ts lexicalParagraph)
// ---------------------------------------------------------------------------------------------

const BOLD = 1
const ITALIC = 2

function textNode(text: string, format: number): LexicalNode {
  return { type: 'text', text, format, detail: 0, mode: 'normal', style: '', version: 1 }
}
function lineBreakNode(): LexicalNode {
  return { type: 'linebreak', version: 1 }
}
function paragraphNode(children: LexicalNode[]): LexicalNode {
  return { type: 'paragraph', children, direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, textStyle: '' }
}
function headingNode(tag: 'h2' | 'h3', children: LexicalNode[]): LexicalNode {
  return { type: 'heading', tag, children, direction: 'ltr', format: '', indent: 0, version: 1 }
}
function listItemNode(value: number, children: LexicalNode[]): LexicalNode {
  return { type: 'listitem', value, children, direction: 'ltr', format: '', indent: 0, version: 1 }
}
function listNode(listType: 'bullet' | 'number', items: LexicalNode[]): LexicalNode {
  return {
    type: 'list',
    listType,
    tag: listType === 'bullet' ? 'ul' : 'ol',
    start: 1,
    children: items.map((item, idx) => ({ ...item, value: idx + 1 })),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

// ---------------------------------------------------------------------------------------------
// Pre-clean
// ---------------------------------------------------------------------------------------------

const DROP_WITH_CONTENT = 'script|style|iframe|noscript|form|button|svg|figure|video|audio|template|object|head|select|textarea'
const KNOWN_SINGLE_SHORTCODES = /^(caption|gallery|audio|video|embed|playlist|more|nextpage|elementor-template|contact-form-7|wpforms)\b/i

function preClean(html: string): string {
  let s = html.replace(/\r\n?/g, '\n')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
  s = s.replace(/<![A-Za-z][^>]*>/g, '')
  s = s.replace(/<\?[\s\S]*?\?>/g, '')
  const dropRe = new RegExp(`<(${DROP_WITH_CONTENT})\\b[^>]*>[\\s\\S]*?</\\1\\s*>`, 'gi')
  let previous: string
  do {
    previous = s
    s = s.replace(dropRe, '')
  } while (s !== previous)
  // an unclosed script/style swallows the rest (never keep executable text)
  s = s.replace(new RegExp(`<(?:script|style|iframe)\\b[\\s\\S]*$`, 'i'), '')
  // paired shortcodes with content: [caption ...]...[/caption]
  s = s.replace(/\[([A-Za-z][\w-]*)(?:\s[^\]]*)?\][\s\S]*?\[\/\1\]/g, '')
  // single shortcodes: only those with attributes or well-known names (keep "[risos]" text intact)
  s = s.replace(/\[\/?([A-Za-z][\w-]*)((?:\s[^\]]*)?)\]/g, (whole, name: string, rest: string) =>
    /=/.test(rest) || KNOWN_SINGLE_SHORTCODES.test(name) || whole.startsWith('[/') && KNOWN_SINGLE_SHORTCODES.test(name)
      ? ''
      : whole,
  )
  return s
}

// ---------------------------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------------------------

type Token =
  | { kind: 'text'; text: string }
  | { kind: 'open'; name: string }
  | { kind: 'close'; name: string }

const TAG_RE = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/y

function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let textStart = 0
  const pushText = (end: number) => {
    if (end > textStart) tokens.push({ kind: 'text', text: html.slice(textStart, end) })
  }
  while (i < html.length) {
    if (html[i] === '<' && /[A-Za-z/]/.test(html[i + 1] ?? '')) {
      TAG_RE.lastIndex = i
      const m = TAG_RE.exec(html)
      if (m) {
        pushText(i)
        const name = m[2]!.toLowerCase()
        if (m[1]) tokens.push({ kind: 'close', name })
        else {
          tokens.push({ kind: 'open', name })
          if (/\/\s*$/.test(m[3]!) && name !== 'br') tokens.push({ kind: 'close', name })
        }
        i = TAG_RE.lastIndex
        textStart = i
        continue
      }
    }
    i++
  }
  pushText(html.length)
  return tokens
}

// ---------------------------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------------------------

type Inline = { t: 'text'; text: string; format: number } | { t: 'br' }
type Kind = 'loose' | 'p' | 'h2' | 'h3' | 'li'

const LEAF_P = new Set(['p', 'blockquote', 'pre', 'dt', 'dd', 'td', 'th'])
const CONTAINER = new Set([
  'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'table', 'thead', 'tbody', 'tfoot', 'tr',
  'center', 'address', 'dl', 'hr', 'details', 'summary', 'fieldset', 'body', 'html',
])
const HEADINGS: Record<string, 'h2' | 'h3'> = { h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3' }

function inlinesToChildren(buffer: Inline[]): LexicalNode[] {
  const out: Inline[] = []
  let prevSpace = true
  for (const part of buffer) {
    if (part.t === 'br') {
      if (out.length === 0) continue
      const last = out[out.length - 1]!
      if (last.t === 'text') last.text = last.text.replace(/ +$/, '')
      out.push(part)
      prevSpace = true
      continue
    }
    let text = part.text
    if (prevSpace) text = text.replace(/^ +/, '')
    if (text === '') continue
    prevSpace = text.endsWith(' ')
    const last = out[out.length - 1]
    if (last && last.t === 'text' && last.format === part.format) last.text += text
    else out.push({ t: 'text', text, format: part.format })
  }
  while (out.length) {
    const last = out[out.length - 1]!
    if (last.t === 'br') {
      out.pop()
    } else {
      last.text = last.text.replace(/ +$/, '')
      if (last.text === '') out.pop()
      else break
    }
  }
  return out.map((p) => (p.t === 'br' ? lineBreakNode() : textNode(p.text, p.format)))
}

// ---------------------------------------------------------------------------------------------
// Paragraph shaping: <br><br> breaks and long-paragraph splitting
// ---------------------------------------------------------------------------------------------

/** Paragraphs longer than this are split into groups of whole sentences. */
export const LONG_PARAGRAPH_WORDS = 120

const SENTENCE_RE = /[^.!?…]*[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g

function wordsIn(text: string): number {
  const t = text.trim()
  return t === '' ? 0 : t.split(/\s+/).length
}

/** Splits inline children at runs of 2+ line breaks (blank text between them is ignored). */
function splitOnDoubleBreaks(children: LexicalNode[]): LexicalNode[][] {
  const groups: LexicalNode[][] = [[]]
  let i = 0
  while (i < children.length) {
    const node = children[i]!
    if (node.type === 'linebreak') {
      let j = i
      let breaks = 0
      while (j < children.length) {
        const c = children[j]!
        if (c.type === 'linebreak') breaks++
        else if (!(c.type === 'text' && String(c.text ?? '').trim() === '')) break
        j++
      }
      if (breaks >= 2) {
        groups.push([])
        i = j
        continue
      }
    }
    groups[groups.length - 1]!.push(node)
    i++
  }
  return groups.filter((g) => g.length > 0)
}

/** Splits one long run of inline children into groups of whole sentences (<= LONG_PARAGRAPH_WORDS). */
function splitLongChildren(children: LexicalNode[]): LexicalNode[][] {
  const total = children.reduce((n, c) => n + (c.type === 'text' ? wordsIn(String(c.text)) : 0), 0)
  if (total <= LONG_PARAGRAPH_WORDS) return [children]

  // sentence units: pieces (possibly spanning formatted nodes) up to a terminal punctuation
  const units: { nodes: LexicalNode[]; words: number }[] = []
  let current: { nodes: LexicalNode[]; words: number } = { nodes: [], words: 0 }
  const closeUnit = () => {
    if (current.nodes.length) units.push(current)
    current = { nodes: [], words: 0 }
  }
  for (const child of children) {
    if (child.type !== 'text') {
      current.nodes.push(child)
      continue
    }
    const text = String(child.text)
    const pieces = text.match(SENTENCE_RE) ?? [text]
    for (const piece of pieces) {
      if (piece === '') continue
      current.nodes.push({ ...child, text: piece })
      current.words += wordsIn(piece)
      if (/[.!?…]["'”’)\]]*\s*$/.test(piece)) closeUnit()
    }
  }
  closeUnit()

  const groups: LexicalNode[][] = []
  let group: LexicalNode[] = []
  let groupWords = 0
  for (const unit of units) {
    if (group.length > 0 && groupWords + unit.words > LONG_PARAGRAPH_WORDS) {
      groups.push(group)
      group = []
      groupWords = 0
    }
    group.push(...unit.nodes)
    groupWords += unit.words
  }
  if (group.length) groups.push(group)
  return groups
}

/** Trims edge spaces of a group and drops it when nothing is left. */
function tidy(children: LexicalNode[]): LexicalNode[] {
  const out = children.map((c) => ({ ...c }))
  while (out.length && out[0]!.type === 'linebreak') out.shift()
  while (out.length && out[out.length - 1]!.type === 'linebreak') out.pop()
  const first = out[0]
  if (first && first.type === 'text') first.text = String(first.text).replace(/^\s+/, '')
  const last = out[out.length - 1]
  if (last && last.type === 'text') last.text = String(last.text).replace(/\s+$/, '')
  return out.filter((c) => c.type !== 'text' || String(c.text) !== '')
}

function shapeParagraph(children: LexicalNode[]): LexicalNode[] {
  const nodes: LexicalNode[] = []
  for (const run of splitOnDoubleBreaks(children)) {
    for (const group of splitLongChildren(run)) {
      const kids = tidy(group)
      if (kids.length) nodes.push(paragraphNode(kids))
    }
  }
  return nodes
}

export function htmlToLexical(html: string): LexicalState {
  const tokens = tokenize(preClean(html))
  const output: LexicalNode[] = []
  const listStack: { listType: 'bullet' | 'number'; items: LexicalNode[] }[] = []
  let buffer: Inline[] = []
  let kind: Kind = 'loose'
  let bold = 0
  let italic = 0

  const emit = (node: LexicalNode) => {
    output.push(node)
  }

  const flush = () => {
    const children = inlinesToChildren(buffer)
    buffer = []
    if (children.length === 0) return
    if (kind === 'li' && listStack.length) {
      listStack[listStack.length - 1]!.items.push(listItemNode(0, children))
    } else if (kind === 'h2' || kind === 'h3') {
      emit(headingNode(kind, children))
    } else {
      for (const node of shapeParagraph(children)) emit(node)
    }
  }

  const closeList = () => {
    flush()
    const list = listStack.pop()
    if (!list || list.items.length === 0) return
    if (listStack.length) listStack[listStack.length - 1]!.items.push(...list.items)
    else emit(listNode(list.listType, list.items))
  }

  const addText = (raw: string) => {
    const format = (bold > 0 ? BOLD : 0) | (italic > 0 ? ITALIC : 0)
    const text = decodeEntities(raw)
    if (kind !== 'loose') {
      buffer.push({ t: 'text', text: text.replace(/\s+/g, ' '), format })
      return
    }
    const paragraphs = text.split(/\n[^\S\n]*\n(?:\s*\n)*/)
    paragraphs.forEach((part, pi) => {
      if (pi > 0) flush()
      part.split('\n').forEach((line, li) => {
        if (li > 0) buffer.push({ t: 'br' })
        buffer.push({ t: 'text', text: line.replace(/[^\S\n]+/g, ' '), format })
      })
    })
  }

  const inLi = () => kind === 'li'

  for (const token of tokens) {
    if (token.kind === 'text') {
      addText(token.text)
      continue
    }
    const { name } = token
    const opening = token.kind === 'open'
    if (name === 'strong' || name === 'b') {
      bold = Math.max(0, bold + (opening ? 1 : -1))
    } else if (name === 'em' || name === 'i') {
      italic = Math.max(0, italic + (opening ? 1 : -1))
    } else if (name === 'br') {
      if (opening) buffer.push({ t: 'br' })
    } else if (name === 'ul' || name === 'ol') {
      if (opening) {
        flush()
        listStack.push({ listType: name === 'ul' ? 'bullet' : 'number', items: [] })
        kind = 'loose'
      } else {
        closeList()
        kind = listStack.length ? 'li' : 'loose'
      }
    } else if (name === 'li') {
      if (!listStack.length) continue
      flush()
      kind = opening ? 'li' : 'loose'
    } else if (name in HEADINGS) {
      if (inLi()) continue
      flush()
      kind = opening ? HEADINGS[name]! : 'loose'
    } else if (LEAF_P.has(name)) {
      if (inLi()) continue
      flush()
      kind = opening ? 'p' : 'loose'
    } else if (CONTAINER.has(name)) {
      if (inLi()) continue
      flush()
      kind = 'loose'
    }
    // any other tag (span, a, u, font, img, ...): unwrapped, its text stays
  }
  while (listStack.length) closeList()
  flush()

  return { root: { type: 'root', children: output, direction: 'ltr', format: '', indent: 0, version: 1 } }
}
