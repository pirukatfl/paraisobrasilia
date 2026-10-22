/**
 * Extractor of the "Dicas Hot" posts from a WordPress dump (quick dicas-hot, DH-06).
 * Reuses the streaming reader and the posts/category logic of the Contos extractor.
 *
 * // DH-10: post_author, users and comments are never read; only the keys of DICAS_META_KEYS are kept.
 */
import { extractContos, type Row, type SqlValue, type WpConto, type WpTables } from '../contos/wp-dump'

export const DICAS_CATEGORY = 'dicas-hot'
export const DICAS_TABLES = ['posts', 'terms', 'term_taxonomy', 'term_relationships', 'postmeta']
export const DICAS_META_KEYS = [
  '_members_access_role',
  '_elementor_edit_mode',
  '_thumbnail_id',
  '_wp_attached_file',
  '_yoast_wpseo_metadesc',
  'rank_math_description',
] as const

export type WpDica = WpConto & {
  excerpt: string
  /** Yoast (`_yoast_wpseo_metadesc`) or Rank Math (`rank_math_description`) description; null when none */
  seoDescription: string | null
  /** Featured image path relative to the uploads folder (e.g. '2024/05/capa-dica.jpg'); null when none or unsafe */
  capaWp: string | null
}

/**
 * Row filter for readWpTables: only the meta keys we use (`_elementor_data` and friends are never kept)
 * and only real posts (attachments are not needed: `_wp_attached_file` sits in their postmeta).
 */
export function dicasRowFilter(table: string, row: Row): boolean {
  if (table === 'postmeta') return (DICAS_META_KEYS as readonly string[]).includes(String(row.meta_key))
  if (table === 'posts') return row.post_type === 'post'
  return true
}

/** A path relative to the uploads folder: not absolute, no '..' and no backslash. */
export function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) return false
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.includes('\\') || value.includes('..')) return false
  return true
}

const textOf = (value: SqlValue | undefined): string => (value === null || value === undefined ? '' : String(value))

/** Published `post` rows of the category 'dicas-hot' (also those in postdev), oldest first. */
export function extractDicas(tables: WpTables): WpDica[] {
  const base = extractContos(tables, { categorySlug: DICAS_CATEGORY })

  const excerptById = new Map<number, string>()
  for (const post of tables.posts ?? []) excerptById.set(Number(post.ID), textOf(post.post_excerpt))

  const metaByPost = new Map<number, Map<string, string>>()
  for (const m of tables.postmeta ?? []) {
    const key = String(m.meta_key)
    if (!(DICAS_META_KEYS as readonly string[]).includes(key)) continue
    const id = Number(m.post_id)
    const map = metaByPost.get(id) ?? new Map<string, string>()
    if (!map.has(key)) map.set(key, textOf(m.meta_value))
    metaByPost.set(id, map)
  }

  return base.map((conto) => {
    const meta = metaByPost.get(conto.wpId)
    const seo = meta?.get('_yoast_wpseo_metadesc')?.trim() || meta?.get('rank_math_description')?.trim() || null
    const thumb = Number(meta?.get('_thumbnail_id'))
    const attached = Number.isFinite(thumb) && thumb > 0 ? metaByPost.get(thumb)?.get('_wp_attached_file')?.trim() : undefined
    return {
      ...conto,
      excerpt: excerptById.get(conto.wpId) ?? '',
      seoDescription: seo,
      capaWp: isSafeRelativePath(attached) ? attached : null,
    }
  })
}
