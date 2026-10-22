/**
 * Old ClassiSex ads (wpDiscuz comments on one WordPress post) -> neutral records (M-04).
 * Pure: no database, no Payload, no Next.
 */
// T-06-04: only comments of the ad post and their meta are used; contacts in the text are NOT extracted (M-04)
import { REDACTED_LABEL, redactContacts } from '../classisex/redact'
import { APELIDO_MAX, apelidoError, cidadeError } from '../classisex/rules'
import { decodeEntities } from '../contos/html-to-lexical'
import type { Row, WpTables } from '../contos/wp-dump'
import { serializedFieldLabels, serializedIntegers, serializedKeys } from './php-serialized'

export const CLASSISEX_POST_ID = 2894
/** Client decision 2026-10-22: the old MURAL (wpDiscuz comments on post 749, slug `mural`) comes in too. */
export const MURAL_POST_ID = 749
export type Fonte = 'classisex' | 'mural'
export const FONTES: Fonte[] = ['classisex', 'mural']
export const FONTE_LABELS: Record<Fonte, string> = { classisex: 'ClassiSex', mural: 'Mural' }
/** Default source posts: both boards. `--post` replaces the list. */
export const DEFAULT_POST_IDS: number[] = [CLASSISEX_POST_ID, MURAL_POST_ID]
export const FONTE_BY_POST: Record<number, Fonte> = { [CLASSISEX_POST_ID]: 'classisex', [MURAL_POST_ID]: 'mural' }
export const EU_SOU_MAP = { Casal: 'Casal', Solteiro: 'Homem', Solteira: 'Mulher' } as const
const EU_SOU_VALUES = new Set(Object.keys(EU_SOU_MAP))
const AUTO_DETECT_SHARE = 0.9
const MAX_PHOTOS = 10
const TEXTO_MAX = 600

export type FieldKeys = { euSou: string; cidade: string | null }
export type AdFlag = 'cidade-descartada' | 'texto-longo' | 'foto-sem-arquivo'
export type AdSkip = 'resposta' | 'nao-aprovado' | 'eu-sou-desconhecido' | 'texto-vazio' | 'outro-tipo'

export type WpLegacyAd = {
  wpCommentId: number
  wpUserId: number
  /** ISO UTC */
  createdAt: string
  texto: string
  euSou: 'Casal' | 'Homem' | 'Mulher'
  cidade: string | null
  photos: { attachmentId: number; relPath: string | null }[]
  flags: AdFlag[]
  /** Posted by a visitor (not logged in, user_id 0): imported as published, owned by the team placeholder */
  visitante: boolean
  /** Visitor only: the name typed on the old site, sanitised (no contacts, max 40, else "Anônimo") */
  apelidoVisitante: string | null
  /** Which old board the comment came from (reporting, admin filter) */
  fonte: Fonte
}

export type InspectReport = {
  tabelas: Record<string, number>
  prefixosHash: Record<string, number>
  papeis: Record<string, number>
  metaAnuncios: { chave: string; linhas: number; valoresDistintos: number; fracaoEuSou: number }[]
  rotulosFormulario: Record<string, string>
}

const normLabel = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Meta rows of the comments that are on the ad post, grouped by key. */
function adMeta(tables: WpTables, postId: number | number[]): Map<string, Row[]> {
  const posts = new Set(Array.isArray(postId) ? postId : [postId])
  const ids = new Set(
    (tables.comments ?? []).filter((c) => posts.has(Number(c.comment_post_ID))).map((c) => Number(c.comment_ID)),
  )
  const byKey = new Map<string, Row[]>()
  for (const m of tables.commentmeta ?? []) {
    if (!ids.has(Number(m.comment_id))) continue
    const key = String(m.meta_key ?? '')
    const list = byKey.get(key) ?? []
    list.push(m)
    byKey.set(key, list)
  }
  return byKey
}

const euSouShare = (rows: Row[]) =>
  rows.length === 0 ? 0 : rows.filter((r) => EU_SOU_VALUES.has(String(r.meta_value ?? '').trim())).length / rows.length

function formLabels(tables: WpTables): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const m of tables.postmeta ?? []) {
    if (!String(m.meta_key ?? '').startsWith('wpdiscuz')) continue
    Object.assign(labels, serializedFieldLabels(String(m.meta_value ?? '')))
  }
  return labels
}

export function resolveFieldKeys(
  tables: WpTables,
  opts: { postId: number | number[]; euSou?: string; cidade?: string },
): FieldKeys {
  const meta = adMeta(tables, opts.postId)
  let euSou = opts.euSou
  if (euSou && !meta.has(euSou)) {
    throw new Error('A chave informada em --chave-eu-sou não existe nos anúncios. Rode com --inspect para ver as chaves.')
  }
  if (!euSou) {
    let best: { key: string; share: number; rows: number } | null = null
    for (const [key, rows] of meta) {
      const share = euSouShare(rows)
      if (share < AUTO_DETECT_SHARE) continue
      if (!best || share > best.share || (share === best.share && rows.length > best.rows)) {
        best = { key, share, rows: rows.length }
      }
    }
    euSou = best?.key
  }
  if (!euSou) {
    throw new Error('Não encontrei o campo "Eu Sou" dos anúncios. Rode com --inspect e informe --chave-eu-sou.')
  }
  let cidade: string | null = opts.cidade ?? null
  if (!cidade) {
    const labels = formLabels(tables)
    cidade = Object.entries(labels).find(([, label]) => normLabel(label) === 'cidade')?.[0] ?? null
  }
  return { euSou, cidade }
}

function cleanText(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
  const stripped = decodeEntities(withBreaks.replace(/<[^>]*>/g, ''))
  return stripped
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Public nickname of a visitor ad: what they typed, minus any contact, link or "@"; never e-mail or IP. */
export function apelidoVisitante(raw: string): string {
  const typed = raw.replace(/\s+/g, ' ').trim()
  const cleaned = redactContacts(typed)
    .text.split(REDACTED_LABEL)
    .join(' ')
    .replace(/@/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, APELIDO_MAX)
    .trim()
  return cleaned && apelidoError(cleaned) === null ? cleaned : 'Anônimo'
}

function isoUtc(c: Row): string {
  for (const col of ['comment_date_gmt', 'comment_date']) {
    const v = c[col]
    const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(v) : null
    if (m && m[1] !== '0000') {
      return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!)).toISOString()
    }
  }
  return new Date(0).toISOString()
}

export function extractLegacyAds(
  tables: WpTables,
  opts: { postId: number; keys: FieldKeys; fonte?: Fonte },
): { ads: WpLegacyAd[]; skipped: Record<AdSkip, number> } {
  const skipped: Record<AdSkip, number> = {
    resposta: 0,
    'nao-aprovado': 0,
    'eu-sou-desconhecido': 0,
    'texto-vazio': 0,
    'outro-tipo': 0,
  }
  const metaOf = new Map<number, Map<string, string>>()
  for (const m of tables.commentmeta ?? []) {
    const id = Number(m.comment_id)
    const map = metaOf.get(id) ?? new Map<string, string>()
    map.set(String(m.meta_key ?? ''), String(m.meta_value ?? ''))
    metaOf.set(id, map)
  }
  const attached = new Map<number, string>()
  for (const m of tables.postmeta ?? []) {
    if (m.meta_key === '_wp_attached_file' && typeof m.meta_value === 'string' && m.meta_value) {
      attached.set(Number(m.post_id), m.meta_value)
    }
  }

  const comments = [...(tables.comments ?? [])]
    .filter((c) => Number(c.comment_post_ID) === opts.postId)
    .sort((a, b) => Number(a.comment_ID) - Number(b.comment_ID))

  const fonte: Fonte = opts.fonte ?? FONTE_BY_POST[opts.postId] ?? 'classisex'
  const ads: WpLegacyAd[] = []
  for (const c of comments) {
    const type = String(c.comment_type ?? '')
    if (type !== '' && type !== 'comment') {
      skipped['outro-tipo']++
      continue
    }
    if (Number(c.comment_parent) !== 0) {
      skipped.resposta++
      continue
    }
    if (String(c.comment_approved) !== '1') {
      skipped['nao-aprovado']++
      continue
    }
    // Visitors (user_id 0) come in too (client, 2026-10-22: "traz todas"); the e-mail/IP columns are never read
    const visitante = !(Number(c.user_id) > 0)
    const id = Number(c.comment_ID)
    const meta = metaOf.get(id) ?? new Map<string, string>()
    const euRaw = (meta.get(opts.keys.euSou) ?? '').trim()
    if (!(euRaw in EU_SOU_MAP)) {
      skipped['eu-sou-desconhecido']++
      continue
    }
    const texto = cleanText(String(c.comment_content ?? ''))
    if (!texto) {
      skipped['texto-vazio']++
      continue
    }
    const flags: AdFlag[] = []
    let cidade: string | null = null
    const cidadeRaw = opts.keys.cidade ? (meta.get(opts.keys.cidade) ?? '').replace(/\s+/g, ' ').trim() : ''
    if (cidadeRaw) {
      if (cidadeError(cidadeRaw) === null) cidade = cidadeRaw
      else flags.push('cidade-descartada')
    }
    if (texto.length > TEXTO_MAX) flags.push('texto-longo')
    const photos = serializedIntegers(meta.get('wmu_attachments') ?? '')
      .slice(0, MAX_PHOTOS)
      .map((attachmentId) => ({ attachmentId, relPath: attached.get(attachmentId) ?? null }))
    if (photos.some((p) => p.relPath === null)) flags.push('foto-sem-arquivo')
    ads.push({
      wpCommentId: id,
      wpUserId: Number(c.user_id),
      createdAt: isoUtc(c),
      texto,
      euSou: EU_SOU_MAP[euRaw as keyof typeof EU_SOU_MAP],
      cidade,
      photos,
      flags,
      visitante,
      apelidoVisitante: visitante ? apelidoVisitante(String(c.comment_author ?? '')) : null,
      fonte,
    })
  }
  return { ads, skipped }
}

export function inspectDump(tables: WpTables, opts: { prefix: string; postId: number | number[] }): InspectReport {
  const tabelas: Record<string, number> = {}
  for (const [name, rows] of Object.entries(tables)) tabelas[name] = rows.length

  const prefixosHash: Record<string, number> = {}
  for (const u of tables.users ?? []) {
    const h = String(u.user_pass ?? '')
    const bucket = h.startsWith('$wp$') ? '$wp$' : /^\$P\$[./A-Za-z0-9]{31}$/.test(h) ? h.slice(0, 4) : '(outro)'
    prefixosHash[bucket] = (prefixosHash[bucket] ?? 0) + 1
  }

  const papeis: Record<string, number> = {}
  const capKey = `${opts.prefix}capabilities`
  for (const m of tables.usermeta ?? []) {
    if (m.meta_key !== capKey) continue
    // roles are counted by name only
    for (const role of serializedKeys(String(m.meta_value ?? ''))) papeis[role] = (papeis[role] ?? 0) + 1
  }

  const metaAnuncios = [...adMeta(tables, opts.postId)]
    .map(([chave, rows]) => ({
      chave,
      linhas: rows.length,
      valoresDistintos: new Set(rows.map((r) => String(r.meta_value ?? ''))).size,
      fracaoEuSou: Math.round(euSouShare(rows) * 100) / 100,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave))

  return { tabelas, prefixosHash, papeis, metaAnuncios, rotulosFormulario: formLabels(tables) }
}
