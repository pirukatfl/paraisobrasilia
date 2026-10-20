/**
 * Import of the WordPress contos (D-03): record building with a review report, an idempotent
 * Local API loader and the sanitized bundle format. Pure Node: no Next imports, so the
 * bundle migration on the VPS runs this module too.
 *
 * // T-05-14: nothing about authors is imported (WpConto carries no author data).
 * // T-05-15: the report prints counts and slugs only, never titles or story text.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Payload, PayloadRequest } from 'payload'

import { redactContacts } from '../classisex/redact'
import { htmlToLexical, type LexicalNode, type LexicalState } from './html-to-lexical'
import {
  DEFAULT_OPEN_BLOCKS,
  MAX_OPEN_BLOCKS,
  plainTextOf,
  SLUG_MAX,
  SLUG_RE,
  slugify,
  splitConto,
  wordCount,
  type LexicalStateLike,
} from './excerpt'
import type { WpConto } from './wp-dump'

export const BUNDLE_VERSION = 1
export const TITLE_MAX = 160

export type ImportFlag =
  | 'assinatura-removida'
  | 'contatos-removidos'
  | 'slug-alterado'
  | 'curto'
  | 'aberto-demais'
  | 'sem-paragrafos'
  | 'shortcode-restante'
  | 'builder'
  | 'mojibake'
  | 'vazio'

export type ContoRecord = {
  wpId: number
  wpSlug: string
  slug: string
  title: string
  publishedAt: string
  wpRestrito: boolean
  paragrafosAbertos: number
  texto: LexicalState
}

export type ReportRow = { slug: string; words: number; openWords: number; restrito: boolean; flags: string[] }

export type ImportReport = {
  lidos: number
  contos: number
  restritos: number
  builder: number
  ignorados: number
  rows: ReportRow[]
}

export type LoadResult = { criados: string[]; existentes: string[]; renomeados: { de: string; para: string }[] }

const BYLINE_START = /^(?:por|autor|autora|enviado por|escrito por)\b|^[—–-]\s*\S/i
const BYLINE_MAX_WORDS = 12
const LEFTOVER_SHORTCODE = /\[\/?[A-Za-z][\w-]*\s[^\]]*\]/
const MOJIBAKE = /Ã.|â€/
const OPEN_TOO_MUCH = 0.4
const OPEN_TOO_SHORT_WORDS = 60

/** Applies redactContacts to every text node, returns how many contacts were replaced. */
function redactTextNodes(node: LexicalNode): number {
  let removed = 0
  if (node.type === 'text' && typeof node.text === 'string') {
    const result = redactContacts(node.text)
    if (result.removed > 0) {
      node.text = result.text
      removed += result.removed
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children as LexicalNode[]) removed += redactTextNodes(child)
  }
  return removed
}

function baseSlugOf(conto: WpConto): string {
  let decoded = conto.wpSlug
  try {
    decoded = decodeURIComponent(conto.wpSlug)
  } catch {
    // malformed percent-encoding: keep the raw slug
  }
  return slugify(decoded) || slugify(conto.wpSlug) || slugify(conto.title) || 'conto'
}

function withSuffix(base: string, n: number): string {
  const suffix = `-${n}`
  return `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, '')}${suffix}`
}

export function buildImportRecords(contos: WpConto[]): { records: ContoRecord[]; report: ImportReport } {
  const records: ContoRecord[] = []
  const rows: ReportRow[] = []
  const used = new Set<string>()
  let ignorados = 0

  for (const conto of contos) {
    const flags: ImportFlag[] = []
    const texto = htmlToLexical(conto.html)
    const blocks = texto.root.children

    // Trailing byline ("Por Fulana"): authors are personal data (T-05-14)
    const last = blocks[blocks.length - 1]
    if (last) {
      const lastText = plainTextOf(last).trim()
      if (BYLINE_START.test(lastText) && wordCount(lastText) <= BYLINE_MAX_WORDS) {
        blocks.pop()
        flags.push('assinatura-removida')
      }
    }

    let removed = 0
    for (const block of blocks) removed += redactTextNodes(block)
    if (removed > 0) flags.push('contatos-removidos')

    const plain = plainTextOf(texto)
    const totalWords = wordCount(plain)

    const base = baseSlugOf(conto)
    let slug = base
    for (let n = 2; used.has(slug); n++) slug = withSuffix(base, n)
    if (slug !== conto.wpSlug) flags.push('slug-alterado')

    if (MOJIBAKE.test(conto.title) || MOJIBAKE.test(plain.slice(0, 500))) flags.push('mojibake')
    if (LEFTOVER_SHORTCODE.test(plain)) flags.push('shortcode-restante')
    if (conto.builder) flags.push('builder')

    if (totalWords === 0) {
      ignorados++
      flags.push('vazio')
      rows.push({ slug, words: 0, openWords: 0, restrito: conto.restricted, flags })
      continue
    }
    used.add(slug)

    const split = splitConto(texto as unknown as LexicalStateLike, DEFAULT_OPEN_BLOCKS)
    if (split.totalBlocks === 1) flags.push('sem-paragrafos')
    if (split.openWords < OPEN_TOO_SHORT_WORDS) flags.push('curto')
    if (split.openWords / split.totalWords > OPEN_TOO_MUCH) flags.push('aberto-demais')

    records.push({
      wpId: conto.wpId,
      wpSlug: conto.wpSlug,
      slug,
      title: conto.title.slice(0, TITLE_MAX),
      publishedAt: conto.publishedAt,
      wpRestrito: conto.restricted,
      paragrafosAbertos: DEFAULT_OPEN_BLOCKS,
      texto,
    })
    rows.push({ slug, words: split.totalWords, openWords: split.openWords, restrito: conto.restricted, flags })
  }

  return {
    records,
    report: {
      lidos: contos.length,
      contos: contos.length,
      restritos: contos.filter((c) => c.restricted).length,
      builder: contos.filter((c) => c.builder).length,
      ignorados,
      rows,
    },
  }
}

/** Counts and one line per slug. NEVER titles or text (T-05-15). */
export function formatReport(report: ImportReport, load?: LoadResult): string {
  const lines = [
    `Contos encontrados: ${report.contos} · restritos no site antigo: ${report.restritos} · montados no Elementor: ${report.builder} · ignorados: ${report.ignorados}`,
  ]
  for (const row of report.rows) {
    const flags = row.flags.length ? ` · ${row.flags.join(', ')}` : ''
    lines.push(
      `${row.slug} · ${row.words} palavras (abertas: ${row.openWords}) · ${row.restrito ? 'restrito' : 'aberto'}${flags}`,
    )
  }
  if (load) lines.push(formatLoad(load))
  return lines.join('\n')
}

export function formatLoad(load: LoadResult): string {
  return `Criados: ${load.criados.length} · já existiam: ${load.existentes.length} · endereços renomeados: ${load.renomeados.length}`
}

// ---------------------------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------------------------

async function freeSlug(payload: Payload, wanted: string, req?: Partial<PayloadRequest>): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? wanted : withSuffix(wanted, n)
    const clash = await payload.find({
      collection: 'contos',
      where: { slug: { equals: candidate } },
      draft: true,
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      ...(req ? { req: req as PayloadRequest } : {}),
    })
    if (clash.docs.length === 0) return candidate
  }
}

/** Creates the contos that do not exist yet (by wpId). Existing contos are never touched. */
export async function importContos(
  payload: Payload,
  records: ContoRecord[],
  opts: { req?: Partial<PayloadRequest>; now?: Date } = {},
): Promise<LoadResult> {
  const result: LoadResult = { criados: [], existentes: [], renomeados: [] }
  const now = opts.now ?? new Date()
  const reqArg = opts.req ? { req: opts.req as PayloadRequest } : {}
  for (const record of records) {
    const found = await payload.find({
      collection: 'contos',
      where: { wpId: { equals: record.wpId } },
      draft: true,
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      ...reqArg,
    })
    if (found.docs[0]) {
      result.existentes.push(found.docs[0].slug)
      continue
    }
    const slug = await freeSlug(payload, record.slug, opts.req)
    if (slug !== record.slug) result.renomeados.push({ de: record.slug, para: slug })
    await payload.create({
      collection: 'contos',
      data: {
        title: record.title,
        slug,
        publishedAt: record.publishedAt,
        texto: record.texto as never,
        paragrafosAbertos: record.paragrafosAbertos,
        wpId: record.wpId,
        wpSlug: record.wpSlug,
        wpRestrito: record.wpRestrito,
        importadoEm: now.toISOString(),
        _status: 'published',
      },
      overrideAccess: true,
      draft: false,
      ...reqArg,
    })
    result.criados.push(slug)
  }
  return result
}

// ---------------------------------------------------------------------------------------------
// Bundle
// ---------------------------------------------------------------------------------------------

const BUNDLE_ERROR = 'Arquivo de contos inválido.'

export function writeBundle(file: string, records: ContoRecord[], now: Date): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `${JSON.stringify({ version: BUNDLE_VERSION, generatedAt: now.toISOString(), contos: records }, null, 1)}\n`,
    'utf8',
  )
}

function isRecord(value: unknown): value is ContoRecord {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  const root = (r.texto as { root?: { children?: unknown } } | undefined)?.root
  return (
    typeof r.wpId === 'number' &&
    typeof r.wpSlug === 'string' &&
    typeof r.slug === 'string' &&
    r.slug.length <= SLUG_MAX &&
    SLUG_RE.test(r.slug) &&
    typeof r.title === 'string' &&
    r.title.length > 0 &&
    typeof r.publishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.publishedAt)) &&
    typeof r.wpRestrito === 'boolean' &&
    typeof r.paragrafosAbertos === 'number' &&
    Number.isInteger(r.paragrafosAbertos) &&
    r.paragrafosAbertos >= 1 &&
    r.paragrafosAbertos <= MAX_OPEN_BLOCKS &&
    Array.isArray(root?.children)
  )
}

export function readBundle(file: string): ContoRecord[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    throw new Error(BUNDLE_ERROR)
  }
  const bundle = parsed as { version?: unknown; contos?: unknown }
  if (!bundle || bundle.version !== BUNDLE_VERSION || !Array.isArray(bundle.contos)) throw new Error(BUNDLE_ERROR)
  if (!bundle.contos.every(isRecord)) throw new Error(BUNDLE_ERROR)
  return bundle.contos as ContoRecord[]
}

/** Used by the contos_wp_bundle migration: a missing file is a no-op. */
export async function loadBundleIfPresent(
  payload: Payload,
  file: string,
  opts: { req?: Partial<PayloadRequest> } = {},
): Promise<LoadResult | { skipped: true }> {
  if (!fs.existsSync(file)) return { skipped: true }
  return importContos(payload, readBundle(file), opts)
}
