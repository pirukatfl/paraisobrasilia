/**
 * Streaming reader for a WordPress (MariaDB/MySQL `mysqldump`) SQL dump, plus the Contos extractor.
 * Pure Node: no database, no Payload, no Next. Only the tables asked for are ever buffered.
 */
// T-05-14: users/usermeta are never requested; post_author is dropped.
// T-05-16: memory is bounded to one INSERT statement of a wanted table at a time.
import fs from 'node:fs'
import { StringDecoder } from 'node:string_decoder'
import zlib from 'node:zlib'

import { decodeEntities } from './html-to-lexical'

export type SqlValue = string | number | null
export type Row = Record<string, SqlValue>
/** Keys WITHOUT the table prefix: 'posts', 'terms', 'term_taxonomy', 'term_relationships', 'postmeta'. */
export type WpTables = Record<string, Row[]>

export type WpConto = {
  wpId: number
  wpSlug: string
  title: string
  html: string
  /** ISO UTC */
  publishedAt: string
  restricted: boolean
  builder: boolean
}

export const WP_META_KEYS = ['_members_access_role', '_elementor_edit_mode'] as const

export const DEFAULT_WP_PREFIX = 'wp26_'
const NO_CONTOS_CATEGORY = 'Categoria "contos" não encontrada no dump.'

// ---------------------------------------------------------------------------------------------
// VALUES parser
// ---------------------------------------------------------------------------------------------

function unescapeChar(c: string): string {
  switch (c) {
    case '0':
      return '\0'
    case 'b':
      return '\b'
    case 'n':
      return '\n'
    case 'r':
      return '\r'
    case 't':
      return '\t'
    case 'Z':
      return '\x1a'
    case '%':
      return '\\%'
    case '_':
      return '\\_'
    default:
      // \' \" \\ and any other escaped character: the character itself
      return c
  }
}

/** Parses the text after VALUES (up to the final ';', which is tolerated) into rows of values. */
export function parseInsertValues(valuesSql: string): SqlValue[][] {
  const s = valuesSql
  const n = s.length
  let i = 0
  const rows: SqlValue[][] = []

  const fail = (msg: string): never => {
    throw new Error(`Dump inválido (${msg} na posição ${i}).`)
  }
  const skipWs = () => {
    while (i < n && /\s/.test(s[i]!)) i++
  }

  const readString = (): string => {
    const quote = s[i]!
    i++
    let out = ''
    let start = i
    for (;;) {
      if (i >= n) return fail('texto sem fechamento')
      const c = s[i]!
      if (c === '\\') {
        out += s.slice(start, i)
        i++
        if (i >= n) return fail('escape incompleto')
        out += unescapeChar(s[i]!)
        i++
        start = i
      } else if (c === quote) {
        if (s[i + 1] === quote) {
          out += s.slice(start, i + 1)
          i += 2
          start = i
        } else {
          out += s.slice(start, i)
          i++
          return out
        }
      } else {
        i++
      }
    }
  }

  const readValue = (): SqlValue => {
    skipWs()
    const c = s[i]
    if (c === "'" || c === '"') return readString()
    // charset introducer: _binary 'x', _utf8mb4 'x'
    if (c === '_') {
      const m = /^_[A-Za-z0-9]+\s*/.exec(s.slice(i, i + 40))
      if (m) {
        i += m[0].length
        return readValue()
      }
    }
    // hex literal 0x41...
    const hex = /^0x([0-9A-Fa-f]*)/.exec(s.slice(i, i + 4))
    if (hex) {
      let j = i + 2
      while (j < n && /[0-9A-Fa-f]/.test(s[j]!)) j++
      const digits = s.slice(i + 2, j)
      i = j
      return Buffer.from(digits.length % 2 ? `0${digits}` : digits, 'hex').toString('utf8')
    }
    // bare token: NULL, number, TRUE/FALSE, anything else up to ',' or ')'
    let j = i
    while (j < n && s[j] !== ',' && s[j] !== ')') j++
    const token = s.slice(i, j).trim()
    i = j
    if (/^null$/i.test(token)) return null
    if (/^true$/i.test(token)) return 1
    if (/^false$/i.test(token)) return 0
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(token)) return Number(token)
    return token
  }

  for (;;) {
    skipWs()
    while (s[i] === ',') {
      i++
      skipWs()
    }
    if (i >= n || s[i] === ';') break
    if (s[i] !== '(') fail('esperava "("')
    i++
    const row: SqlValue[] = []
    skipWs()
    if (s[i] === ')') {
      i++
      rows.push(row)
      continue
    }
    for (;;) {
      row.push(readValue())
      skipWs()
      if (s[i] === ',') {
        i++
        continue
      }
      if (s[i] === ')') {
        i++
        break
      }
      fail('esperava "," ou ")"')
    }
    rows.push(row)
  }
  return rows
}

// ---------------------------------------------------------------------------------------------
// CREATE TABLE columns
// ---------------------------------------------------------------------------------------------

/** Column names, in order, from a CREATE TABLE statement. Key/constraint lines are ignored. */
export function parseCreateTableColumns(statement: string): string[] {
  const head = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?[A-Za-z0-9_$]+`?/i.exec(statement)
  const open = statement.indexOf('(', head ? head[0].length : 0)
  if (open < 0) return []
  const items: string[] = []
  let depth = 0
  let quote: string | null = null
  let buf = ''
  for (let i = open + 1; i < statement.length; i++) {
    const c = statement[i]!
    if (quote) {
      buf += c
      if (c === '\\' && quote !== '`') {
        buf += statement[++i] ?? ''
      } else if (c === quote) {
        quote = null
      }
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c
      buf += c
    } else if (c === '(') {
      depth++
      buf += c
    } else if (c === ')') {
      if (depth === 0) {
        items.push(buf)
        break
      }
      depth--
      buf += c
    } else if (c === ',' && depth === 0) {
      items.push(buf)
      buf = ''
    } else {
      buf += c
    }
  }
  const columns: string[] = []
  for (const raw of items) {
    const m = /^\s*`([^`]+)`/.exec(raw)
    if (m) columns.push(m[1]!)
  }
  return columns
}

// ---------------------------------------------------------------------------------------------
// Streaming reader
// ---------------------------------------------------------------------------------------------

type Mode = 'undecided' | 'keep' | 'skip'
type St = 'normal' | 'slash' | 'dash' | 'dash2' | 'block' | 'blockstar' | 'line' | 'string' | 'stringesc' | 'ident'

const HEAD_RE =
  /^\s*(INSERT\s+(?:IGNORE\s+)?INTO|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+`?([A-Za-z0-9_$]+)`?/i

export type ReadWpTablesOptions = {
  prefix?: string
  /** Table names WITHOUT the prefix. */
  tables: string[]
  rowFilter?: (table: string, row: Row) => boolean
}

async function openSource(source: string | NodeJS.ReadableStream): Promise<AsyncIterable<string | Buffer>> {
  if (typeof source !== 'string') return source as AsyncIterable<string | Buffer>
  const fh = await fs.promises.open(source, 'r')
  const magic = Buffer.alloc(2)
  try {
    await fh.read(magic, 0, 2, 0)
  } finally {
    await fh.close()
  }
  const file = fs.createReadStream(source)
  if (magic[0] === 0x1f && magic[1] === 0x8b) {
    const gunzip = zlib.createGunzip()
    file.on('error', (err) => gunzip.destroy(err))
    return file.pipe(gunzip)
  }
  return file
}

export async function readWpTables(
  source: string | NodeJS.ReadableStream,
  opts: ReadWpTablesOptions,
): Promise<WpTables> {
  const prefix = opts.prefix ?? DEFAULT_WP_PREFIX
  const wanted = new Map<string, string>() // full name -> short name
  for (const t of opts.tables) wanted.set(prefix + t, t)
  const result: WpTables = {}
  for (const t of opts.tables) result[t] = []
  const columnsByTable = new Map<string, string[]>()

  let state: St = 'normal'
  let quoteChar = "'"
  let mode: Mode = 'undecided'
  let stmt = ''
  let backticks = 0

  const resetStatement = () => {
    stmt = ''
    mode = 'undecided'
    backticks = 0
  }

  const handleStatement = (text: string) => {
    const head = HEAD_RE.exec(text)
    if (!head) return
    const full = head[2]!
    const short = wanted.get(full)
    if (!short) return
    if (/^CREATE/i.test(head[1]!)) {
      columnsByTable.set(short, parseCreateTableColumns(text))
      return
    }
    // INSERT INTO `t` [(`c1`,...)] VALUES (...),(...)
    const afterHead = text.slice(head[0].length)
    let columns: string[] | undefined
    let rest = afterHead
    const listMatch = /^\s*\(([^)]*)\)\s*/.exec(afterHead)
    if (listMatch && /^\s*\(\s*`/.test(afterHead)) {
      columns = [...listMatch[1]!.matchAll(/`([^`]+)`/g)].map((m) => m[1]!)
      rest = afterHead.slice(listMatch[0].length)
    }
    const valuesMatch = /^\s*VALUES?\s*/i.exec(rest)
    if (!valuesMatch) return // INSERT ... SELECT or something we do not read
    const cols = columns ?? columnsByTable.get(short)
    if (!cols) throw new Error(`Dump sem CREATE TABLE para "${full}"; não dá para saber as colunas.`)
    for (const values of parseInsertValues(rest.slice(valuesMatch[0].length))) {
      if (values.length !== cols.length) {
        throw new Error(`Linha com ${values.length} valores para ${cols.length} colunas em "${full}".`)
      }
      const row: Row = {}
      cols.forEach((c, idx) => {
        row[c] = values[idx]!
      })
      if (!opts.rowFilter || opts.rowFilter(short, row)) result[short]!.push(row)
    }
  }

  const endStatement = () => {
    if (mode !== 'skip') handleStatement(stmt)
    resetStatement()
  }

  const decide = () => {
    if (mode !== 'undecided') return
    const head = HEAD_RE.exec(stmt)
    mode = head && wanted.has(head[2]!) ? 'keep' : 'skip'
    if (mode === 'skip') stmt = ''
  }

  const append = (text: string) => {
    if (mode === 'skip') return
    if (mode === 'undecided' && stmt.length === 0 && /^\s*$/.test(text)) return
    stmt += text
    if (mode === 'undecided') {
      const last = text[text.length - 1]!
      if (last === '`') backticks++
      if (backticks >= 2 || last === '(' || stmt.length > 200) decide()
    }
  }

  const feed = (chunk: string) => {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i]!
      switch (state) {
        case 'normal':
          if (c === '/') state = 'slash'
          else if (c === '-') state = 'dash'
          else if (c === "'" || c === '"') {
            state = 'string'
            quoteChar = c
            append(c)
          } else if (c === '`') {
            state = 'ident'
            append(c)
          } else if (c === ';') {
            endStatement()
          } else append(c)
          break
        case 'slash':
          if (c === '*') state = 'block'
          else {
            state = 'normal'
            append('/')
            i--
          }
          break
        case 'dash':
          if (c === '-') state = 'dash2'
          else {
            state = 'normal'
            append('-')
            i--
          }
          break
        case 'dash2':
          if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
            state = c === '\n' ? 'normal' : 'line'
          } else {
            state = 'normal'
            append('--')
            i--
          }
          break
        case 'block':
          if (c === '*') state = 'blockstar'
          break
        case 'blockstar':
          if (c === '/') {
            state = 'normal'
            append(' ')
          } else if (c !== '*') state = 'block'
          break
        case 'line':
          if (c === '\n') state = 'normal'
          break
        case 'string':
          if (c === '\\') {
            state = 'stringesc'
            append(c)
          } else {
            if (c === quoteChar) state = 'normal'
            append(c)
          }
          break
        case 'stringesc':
          state = 'string'
          append(c)
          break
        case 'ident':
          if (c === '`') state = 'normal'
          append(c)
          break
      }
    }
  }

  const stream = await openSource(source)
  const decoder = new StringDecoder('utf8')
  for await (const chunk of stream) {
    feed(typeof chunk === 'string' ? chunk : decoder.write(chunk))
  }
  const tail = decoder.end()
  if (tail) feed(tail)
  if ((mode as Mode) === 'keep' && stmt.trim()) endStatement()
  return result
}

// ---------------------------------------------------------------------------------------------
// Contos extractor
// ---------------------------------------------------------------------------------------------

const ZERO_DATE = '0000-00-00 00:00:00'

function parseDbDate(value: SqlValue | undefined): { y: number; mo: number; d: number; h: number; mi: number; s: number } | null {
  if (typeof value !== 'string' || value === ZERO_DATE) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number) as [number, number, number, number, number, number]
  if (y === 0 || mo === 0 || d === 0) return null
  return { y, mo, d, h, mi, s }
}

const SP_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

function spOffsetMs(utcMs: number): number {
  const parts = Object.fromEntries(SP_FORMAT.formatToParts(new Date(utcMs)).map((p) => [p.type, Number(p.value)]))
  const asUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!)
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** Interprets a wall-clock time as America/Sao_Paulo and returns the UTC instant. */
function saoPauloLocalToUtc(p: { y: number; mo: number; d: number; h: number; mi: number; s: number }): number {
  const naive = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s)
  let guess = naive - spOffsetMs(naive)
  guess = naive - spOffsetMs(guess)
  return guess
}

function publishedAtOf(post: Row): string {
  const gmt = parseDbDate(post.post_date_gmt)
  if (gmt) return new Date(Date.UTC(gmt.y, gmt.mo - 1, gmt.d, gmt.h, gmt.mi, gmt.s)).toISOString()
  const local = parseDbDate(post.post_date)
  if (local) return new Date(saoPauloLocalToUtc(local)).toISOString()
  const modified = parseDbDate(post.post_modified_gmt)
  if (modified) return new Date(Date.UTC(modified.y, modified.mo - 1, modified.d, modified.h, modified.mi, modified.s)).toISOString()
  return new Date(0).toISOString()
}

/**
 * Published posts of the category `categorySlug` (default 'contos'), oldest first.
 * T-05-14: post_author (and everything else not listed in WpConto) is never copied.
 */
export function extractContos(tables: WpTables, opts: { categorySlug?: string } = {}): WpConto[] {
  const categorySlug = opts.categorySlug ?? 'contos'
  const termIds = new Set((tables.terms ?? []).filter((t) => t.slug === categorySlug).map((t) => Number(t.term_id)))
  const taxonomyIds = new Set(
    (tables.term_taxonomy ?? [])
      .filter((tt) => tt.taxonomy === 'category' && termIds.has(Number(tt.term_id)))
      .map((tt) => Number(tt.term_taxonomy_id)),
  )
  if (taxonomyIds.size === 0) throw new Error(NO_CONTOS_CATEGORY.replace('contos', categorySlug))

  const postIds = new Set(
    (tables.term_relationships ?? [])
      .filter((r) => taxonomyIds.has(Number(r.term_taxonomy_id)))
      .map((r) => Number(r.object_id)),
  )

  const metaByPost = new Map<number, Row[]>()
  for (const m of tables.postmeta ?? []) {
    if (!(WP_META_KEYS as readonly string[]).includes(String(m.meta_key))) continue
    const id = Number(m.post_id)
    const list = metaByPost.get(id) ?? []
    list.push(m)
    metaByPost.set(id, list)
  }

  const contos: WpConto[] = []
  for (const post of tables.posts ?? []) {
    const id = Number(post.ID)
    if (!postIds.has(id) || post.post_type !== 'post' || post.post_status !== 'publish') continue
    const meta = metaByPost.get(id) ?? []
    contos.push({
      wpId: id,
      wpSlug: String(post.post_name ?? ''),
      title: decodeEntities(String(post.post_title ?? '')).trim(),
      html: String(post.post_content ?? ''),
      publishedAt: publishedAtOf(post),
      restricted: meta.some((m) => m.meta_key === '_members_access_role'),
      builder: meta.some((m) => m.meta_key === '_elementor_edit_mode' && m.meta_value === 'builder'),
    })
  }
  contos.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.wpId - b.wpId)
  return contos
}
