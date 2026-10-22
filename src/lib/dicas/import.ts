/**
 * Import of the WordPress "Dicas Hot" (quick dicas-hot, DH-06..DH-10): record building with a review
 * report, an idempotent Local API loader, cover attachment and the reviewed bundle format.
 * Pure Node: no Next imports, so the bundle migration on the VPS runs this module too.
 *
 * // DH-10 / T-DH-02: nothing about authors is imported; the report prints counts and slugs only,
 * // never titles or text.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { Payload, PayloadRequest } from 'payload'

import { REDACTED_LABEL, redactContacts } from '../classisex/redact'
import {
  plainTextOf,
  SLUG_MAX,
  SLUG_RE,
  slugify,
  wordCount,
} from '../contos/excerpt'
import { htmlToLexical, decodeEntities, type LexicalNode, type LexicalState } from '../contos/html-to-lexical'
import {
  baseSlugOf,
  dedupeKey,
  firstWords,
  redactTextNodes,
  stripShortcodes,
  TITLE_MAX,
  withSuffix,
} from '../contos/import'
import { cutText } from './dto'
import { isSafeRelativePath, type WpDica } from './wp-dump'

export const DICAS_BUNDLE_VERSION = 1
export const RESUMO_MAX = 300
/** Texts with fewer words than this are imported as drafts (I-3). */
export const PUBLISH_MIN_WORDS = 60

export type DicaFlag =
  | 'builder'
  | 'shortcode-restante'
  | 'imagens-removidas'
  | 'contatos-removidos'
  | 'mojibake'
  | 'sem-titulo'
  | 'curto'
  | 'vazio'
  | 'resumo-do-texto'
  | `duplicado-de:${string}`

export type DicaRecord = {
  wpId: number
  wpSlug: string
  slug: string
  title: string
  publishedAt: string
  resumo: string | null
  texto: LexicalState
  publicar: boolean
  revisar: boolean
  capaWp: string | null
}

export type DicaLegado = { wpSlug: string; slug: string | null }

export type DicaStatus = 'publicada' | 'rascunho' | 'ignorada' | 'duplicada'
export type DicaReportRow = { slug: string; words: number; status: DicaStatus; capa: boolean; flags: string[] }

export type DicasReport = {
  encontradas: number
  builder: number
  comCapa: number
  restritas: number
  rascunhos: number
  ignoradas: number
  duplicadas: number
  paraConferir: number
  rows: DicaReportRow[]
}

export type DicasLoad = { criados: string[]; existentes: string[]; renomeados: { de: string; para: string }[] }

const NUMERIC_SLUG = /^\d+(?:-\d+)*$/
const EMPTY_TITLE = /^(?:\d+|sem t[ií]tulo|untitled|auto[- ]draft|rascunho autom[aá]tico)$/i
const TITLE_WORDS = 8
const SLUG_WORDS = 6
const MOJIBAKE = /Ã.|â€/
const IMG_TAG = /<img\b/i
const SHORTCODE_ANY = /\[\/?[A-Za-z][^\]]*\]/g
const TAGS = /<[^>]*>/g

/**
 * Removes every redaction label from the text nodes (I-7: the label makes no sense in an open text)
 * and drops what became empty. Returns false when the node itself became empty and must go.
 */
function scrubLabels(node: LexicalNode): boolean {
  if (node.type === 'text' && typeof node.text === 'string') {
    if (!node.text.includes(REDACTED_LABEL)) return true
    const cleaned = node.text
      .split(REDACTED_LABEL)
      .join('')
      .replace(/ {2,}/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
    node.text = cleaned
    return cleaned.trim() !== ''
  }
  if (Array.isArray(node.children)) {
    const before = (node.children as LexicalNode[]).length
    const kept = (node.children as LexicalNode[]).filter((child) => scrubLabels(child))
    node.children = kept
    // A container emptied by the removal goes away; untouched empty ones (line breaks) stay
    return !(kept.length < before && kept.length === 0)
  }
  return true
}

/** Resumo candidate: entities decoded, tags/shortcodes stripped, contacts removed, cut to RESUMO_MAX. */
function cleanResumo(raw: string | null | undefined): { text: string | null; contacts: boolean } {
  if (!raw) return { text: null, contacts: false }
  const decoded = decodeEntities(raw.replace(TAGS, ' ').replace(SHORTCODE_ANY, ' ')).replace(/\s+/g, ' ').trim()
  if (decoded === '') return { text: null, contacts: false }
  const redacted = redactContacts(decoded)
  const text = redacted.text
    .split(REDACTED_LABEL)
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
  return { text: text === '' ? null : cutText(text, RESUMO_MAX), contacts: redacted.removed > 0 }
}

/** SEO plugin description first (it is what Google showed), then the post excerpt (I-2). */
export function pickResumo(dica: Pick<WpDica, 'seoDescription' | 'excerpt'>): { resumo: string | null; contacts: boolean } {
  let contacts = false
  for (const candidate of [dica.seoDescription, dica.excerpt]) {
    const cleaned = cleanResumo(candidate)
    contacts ||= cleaned.contacts
    if (cleaned.text) return { resumo: cleaned.text, contacts }
  }
  return { resumo: null, contacts }
}

type Prepared = {
  dica: WpDica
  texto: LexicalState
  flags: DicaFlag[]
  plain: string
  totalWords: number
  key: string
}

function prepare(dica: WpDica): Prepared {
  const flags: DicaFlag[] = []
  const texto = htmlToLexical(dica.html)
  const blocks = texto.root.children as LexicalNode[]

  if (IMG_TAG.test(dica.html)) flags.push('imagens-removidas')

  let shortcodes = 0
  for (const block of blocks) shortcodes += stripShortcodes(block)
  if (shortcodes > 0) flags.push('shortcode-restante')

  // I-4: no byline removal here ("Por isso, ..." is editorial text, not a signature)
  let removed = 0
  for (const block of blocks) removed += redactTextNodes(block)
  if (removed > 0) flags.push('contatos-removidos')
  texto.root.children = blocks.filter((block) => scrubLabels(block)) as typeof texto.root.children

  const plain = plainTextOf(texto)
  return { dica, texto, flags, plain, totalWords: wordCount(plain), key: dedupeKey(plain) }
}

const REVISAR_FLAGS: DicaFlag[] = [
  'builder',
  'shortcode-restante',
  'imagens-removidas',
  'contatos-removidos',
  'mojibake',
  'sem-titulo',
  'curto',
]

export function buildDicaRecords(dicas: WpDica[]): {
  records: DicaRecord[]
  legado: DicaLegado[]
  report: DicasReport
} {
  const records: DicaRecord[] = []
  const rows: DicaReportRow[] = []
  const legadoBySource = new Map<WpDica, DicaLegado>()
  const used = new Set<string>()
  let ignoradas = 0
  let duplicadas = 0

  const prepared = dicas.map(prepare)
  // The oldest dica of each identical text is kept (ties: the first one read)
  const keeper = new Map<string, Prepared>()
  for (const item of prepared) {
    if (item.totalWords === 0) continue
    const current = keeper.get(item.key)
    if (!current || Date.parse(item.dica.publishedAt) < Date.parse(current.dica.publishedAt)) keeper.set(item.key, item)
  }
  const slugOf = new Map<Prepared, string>()
  const publishedOf = new Map<Prepared, boolean>()
  const pendingDupes: { row: ReportRow; item: Prepared; of: Prepared }[] = []
  type ReportRow = DicaReportRow

  for (const item of prepared) {
    const { dica, texto, flags, plain, totalWords } = item
    const hasCapa = dica.capaWp !== null

    if (totalWords > 0 && keeper.get(item.key) !== item) {
      duplicadas++
      const row: ReportRow = { slug: baseSlugOf(dica), words: totalWords, status: 'duplicada', capa: hasCapa, flags: [...flags] }
      pendingDupes.push({ row, item, of: keeper.get(item.key)! })
      rows.push(row)
      continue
    }

    let title = dica.title.trim()
    const untitled = title === '' || EMPTY_TITLE.test(title)
    let base = baseSlugOf(dica)
    if (untitled && totalWords > 0) {
      const derived = firstWords(plain, TITLE_WORDS).replace(/[,;:\s-]+$/, '')
      title = derived.charAt(0).toUpperCase() + derived.slice(1)
      flags.push('sem-titulo')
      if (NUMERIC_SLUG.test(base)) base = slugify(firstWords(plain, SLUG_WORDS)) || base
    } else if (NUMERIC_SLUG.test(base) && slugify(title)) {
      base = slugify(title)
    }
    if (title === '') title = base

    if (totalWords === 0) {
      ignoradas++
      flags.push('vazio')
      rows.push({ slug: base, words: 0, status: 'ignorada', capa: hasCapa, flags })
      legadoBySource.set(dica, { wpSlug: dica.wpSlug, slug: null })
      continue
    }

    let slug = base
    for (let n = 2; used.has(slug); n++) slug = withSuffix(base, n)
    used.add(slug)

    if (MOJIBAKE.test(dica.title) || MOJIBAKE.test(plain.slice(0, 500))) flags.push('mojibake')
    if (dica.builder) flags.push('builder')
    const publicar = totalWords >= PUBLISH_MIN_WORDS
    if (!publicar) flags.push('curto')

    const picked = pickResumo(dica)
    if (picked.contacts && !flags.includes('contatos-removidos')) flags.push('contatos-removidos')
    if (picked.resumo === null) flags.push('resumo-do-texto')

    slugOf.set(item, slug)
    publishedOf.set(item, publicar)
    records.push({
      wpId: dica.wpId,
      wpSlug: dica.wpSlug,
      slug,
      title: title.slice(0, TITLE_MAX),
      publishedAt: dica.publishedAt,
      resumo: picked.resumo,
      texto,
      publicar,
      revisar: flags.some((f) => REVISAR_FLAGS.includes(f)),
      capaWp: dica.capaWp,
    })
    rows.push({ slug, words: totalWords, status: publicar ? 'publicada' : 'rascunho', capa: hasCapa, flags })
    legadoBySource.set(dica, { wpSlug: dica.wpSlug, slug: publicar ? slug : null })
  }

  for (const { row, item, of } of pendingDupes) {
    const keptSlug = slugOf.get(of)
    row.flags.push(`duplicado-de:${keptSlug ?? '?'}`)
    legadoBySource.set(item.dica, { wpSlug: item.dica.wpSlug, slug: keptSlug && publishedOf.get(of) ? keptSlug : null })
  }

  return {
    records,
    legado: dicas.map((d) => legadoBySource.get(d)!),
    report: {
      encontradas: dicas.length,
      builder: dicas.filter((d) => d.builder).length,
      comCapa: dicas.filter((d) => d.capaWp !== null).length,
      restritas: dicas.filter((d) => d.restricted).length,
      rascunhos: records.filter((r) => !r.publicar).length,
      ignoradas,
      duplicadas,
      paraConferir: records.filter((r) => r.revisar).length,
      rows,
    },
  }
}

/** Counts and one line per slug. NEVER titles or text (DH-10). */
export function formatDicasReport(report: DicasReport, load?: DicasLoad, covers?: CoverLoad): string {
  const lines = [
    `Dicas encontradas: ${report.encontradas} · montadas no Elementor: ${report.builder} · com capa: ${report.comCapa} · restritas no site antigo: ${report.restritas} · rascunhos: ${report.rascunhos} · ignoradas: ${report.ignoradas} · duplicadas: ${report.duplicadas} · para conferir: ${report.paraConferir}`,
  ]
  for (const row of report.rows) {
    const flags = row.flags.length ? ` · ${row.flags.join(', ')}` : ''
    lines.push(`${row.slug} · ${row.words} palavras · ${row.status} · ${row.capa ? 'capa' : 'sem capa'}${flags}`)
  }
  if (load) lines.push(formatDicasLoad(load))
  if (covers) lines.push(formatCovers(covers))
  return lines.join('\n')
}

export function formatDicasLoad(load: DicasLoad): string {
  return `Criados: ${load.criados.length} · já existiam: ${load.existentes.length} · endereços renomeados: ${load.renomeados.length}`
}

// ---------------------------------------------------------------------------------------------
// Covers (--uploads)
// ---------------------------------------------------------------------------------------------

export type CoverLoad = {
  gravadas: number
  ausentes: number
  recusadas: number
  foraDaPasta: number
  jaTinham: number
  semDica: number
  semCapa: number
}

export const emptyCoverLoad = (): CoverLoad => ({
  gravadas: 0,
  ausentes: 0,
  recusadas: 0,
  foraDaPasta: 0,
  jaTinham: 0,
  semDica: 0,
  semCapa: 0,
})

export function formatCovers(c: CoverLoad): string {
  return `Capas: gravadas ${c.gravadas} · ausentes ${c.ausentes} · recusadas ${c.recusadas} · fora da pasta ${c.foraDaPasta} · já tinham ${c.jaTinham} · sem dica ${c.semDica} · sem capa no site antigo ${c.semCapa}`
}

const COVER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MIME_BY_FORMAT: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const ALT_MAX = 120

/**
 * Attaches each featured image once, UNCONFIRMED (I-1): the dica gets `capaConferida: false`, so the
 * cover shows neither on the site nor in share previews until staff look at it and tick the box.
 * Never re-attaches (a dica that has a cover, or had one imported, is left alone) and never reads
 * outside the uploads folder (T-DH-04: containment before and after symlink resolution, extension and
 * image-format allow-lists, Media size cap).
 */
export async function attachCovers(
  payload: Payload,
  records: DicaRecord[],
  opts: { uploadsDir: string; now?: Date; req?: Partial<PayloadRequest> },
): Promise<CoverLoad> {
  const counters = emptyCoverLoad()
  const uploadsReal = await fsp.realpath(opts.uploadsDir)
  const now = opts.now ?? new Date()
  const reqArg = opts.req ? { req: opts.req as PayloadRequest } : {}

  for (const record of records) {
    if (!record.capaWp) {
      counters.semCapa++
      continue
    }
    const found = await payload.find({
      collection: 'dicas',
      where: { wpId: { equals: record.wpId } },
      draft: true,
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      ...reqArg,
    })
    const dica = found.docs[0]
    if (!dica) {
      counters.semDica++
      continue
    }
    if (dica.capa || dica.capaImportadaEm) {
      counters.jaTinham++
      continue
    }

    if (!isSafeRelativePath(record.capaWp)) {
      counters.foraDaPasta++
      continue
    }
    const resolved = path.resolve(uploadsReal, record.capaWp)
    if (!resolved.startsWith(uploadsReal + path.sep)) {
      counters.foraDaPasta++
      continue
    }
    if (!COVER_EXTENSIONS.has(path.extname(record.capaWp).toLowerCase())) {
      counters.recusadas++
      continue
    }
    let real: string
    try {
      real = await fsp.realpath(resolved)
    } catch {
      counters.ausentes++
      continue
    }
    // A symlink inside the folder pointing outside of it is refused too
    if (!real.startsWith(uploadsReal + path.sep)) {
      counters.foraDaPasta++
      continue
    }

    let mediaId: number | null = null
    try {
      const data = await fsp.readFile(real)
      const meta = await sharp(data).metadata()
      const mimetype = MIME_BY_FORMAT[String(meta.format)]
      if (!mimetype) {
        counters.recusadas++
        continue
      }
      const media = await payload.create({
        collection: 'media',
        data: { alt: dica.title.slice(0, ALT_MAX) } as never,
        file: { data, mimetype, name: path.basename(record.capaWp), size: data.length },
        depth: 0,
        overrideAccess: true,
        ...reqArg,
      })
      mediaId = media.id
      await payload.update({
        collection: 'dicas',
        id: dica.id,
        data: {
          capa: media.id,
          capaConferida: false,
          capaImportadaEm: now.toISOString(),
          // keep the status the dica had (a draft stays a draft, a published one stays published)
          _status: dica._status ?? 'draft',
        } as never,
        draft: false,
        depth: 0,
        overrideAccess: true,
        ...reqArg,
      })
      counters.gravadas++
    } catch {
      if (mediaId !== null) await payload.delete({ collection: 'media', id: mediaId, overrideAccess: true, ...reqArg }).catch(() => undefined)
      counters.recusadas++
    }
  }
  return counters
}

// ---------------------------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------------------------

async function freeSlug(payload: Payload, wanted: string, req?: Partial<PayloadRequest>): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? wanted : withSuffix(wanted, n)
    const clash = await payload.find({
      collection: 'dicas',
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

/** Creates the dicas that do not exist yet (by wpId). Existing dicas are never touched (staff edits are safe). */
export async function importDicas(
  payload: Payload,
  records: DicaRecord[],
  opts: { req?: Partial<PayloadRequest>; now?: Date } = {},
): Promise<DicasLoad> {
  const result: DicasLoad = { criados: [], existentes: [], renomeados: [] }
  const now = opts.now ?? new Date()
  const reqArg = opts.req ? { req: opts.req as PayloadRequest } : {}
  for (const record of records) {
    const found = await payload.find({
      collection: 'dicas',
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
      collection: 'dicas',
      data: {
        title: record.title,
        slug,
        publishedAt: record.publishedAt,
        ...(record.resumo ? { resumo: record.resumo } : {}),
        texto: record.texto as never,
        revisar: record.revisar,
        wpId: record.wpId,
        wpSlug: record.wpSlug,
        importadoEm: now.toISOString(),
        _status: record.publicar ? 'published' : 'draft',
      },
      overrideAccess: true,
      draft: !record.publicar,
      ...reqArg,
    })
    result.criados.push(slug)
  }
  return result
}

// ---------------------------------------------------------------------------------------------
// Bundle
// ---------------------------------------------------------------------------------------------

const BUNDLE_ERROR = 'Arquivo de dicas inválido.'

export function writeDicasBundle(file: string, records: DicaRecord[], legado: DicaLegado[], now: Date): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `${JSON.stringify({ version: DICAS_BUNDLE_VERSION, generatedAt: now.toISOString(), dicas: records, legado }, null, 1)}\n`,
    'utf8',
  )
}

function isRecord(value: unknown): value is DicaRecord {
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
    r.title.trim().length > 0 &&
    typeof r.publishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.publishedAt)) &&
    typeof r.publicar === 'boolean' &&
    typeof r.revisar === 'boolean' &&
    (r.resumo === null || (typeof r.resumo === 'string' && r.resumo.length <= RESUMO_MAX)) &&
    (r.capaWp === null || isSafeRelativePath(r.capaWp)) &&
    Array.isArray(root?.children)
  )
}

function isLegado(value: unknown): value is DicaLegado {
  if (!value || typeof value !== 'object') return false
  const l = value as Record<string, unknown>
  return (
    typeof l.wpSlug === 'string' &&
    (l.slug === null || (typeof l.slug === 'string' && l.slug.length <= SLUG_MAX && SLUG_RE.test(l.slug)))
  )
}

export function readDicasBundle(file: string): { records: DicaRecord[]; legado: DicaLegado[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    throw new Error(BUNDLE_ERROR)
  }
  const bundle = parsed as { version?: unknown; dicas?: unknown; legado?: unknown } | null
  if (!bundle || bundle.version !== DICAS_BUNDLE_VERSION || !Array.isArray(bundle.dicas) || !Array.isArray(bundle.legado)) {
    throw new Error(BUNDLE_ERROR)
  }
  if (!bundle.dicas.every(isRecord) || !bundle.legado.every(isLegado)) throw new Error(BUNDLE_ERROR)
  return { records: bundle.dicas as DicaRecord[], legado: bundle.legado as DicaLegado[] }
}

/** Used by the dicas_wp_bundle migration: a missing file is a no-op. */
export async function loadDicasBundleIfPresent(
  payload: Payload,
  file: string,
  opts: { req?: Partial<PayloadRequest> } = {},
): Promise<DicasLoad | { skipped: true }> {
  if (!fs.existsSync(file)) return { skipped: true }
  return importDicas(payload, readDicasBundle(file).records, opts)
}
