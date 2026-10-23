import { sql } from '@payloadcms/db-postgres'

import { slugify } from '../contos/excerpt'

/**
 * Slug helpers for models (06.1, G-04). Plain-Node safe: no next/* or @payload-config imports,
 * because the `models_pagina` migration runs this outside the app.
 */

/** `base`, then `base-2`, `base-3`… the first one not in `taken`. Empty base becomes 'modelo'. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || 'modelo'
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${n}`)) n += 1
  return `${root}-${n}`
}

type Db = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> }

/**
 * Fills `models.slug` from the name for rows created before the slug existed (suffix -2, -3 on
 * clashes) and copies it to the version rows. Returns how many models were updated; a second
 * run finds nothing and returns 0.
 */
export async function backfillModelSlugs(db: Db): Promise<number> {
  const pending = (await db.execute(sql`SELECT id, name FROM models WHERE slug IS NULL ORDER BY id`)).rows as {
    id: number
    name: string | null
  }[]
  if (pending.length === 0) return 0
  const existing = (await db.execute(sql`SELECT slug FROM models WHERE slug IS NOT NULL`)).rows as { slug: string }[]
  const taken = new Set(existing.map((r) => r.slug))
  for (const row of pending) {
    const slug = uniqueSlug(slugify(row.name ?? ''), taken)
    taken.add(slug)
    await db.execute(sql`UPDATE models SET slug = ${slug} WHERE id = ${row.id}`)
  }
  await db.execute(
    sql`UPDATE _models_v SET version_slug = m.slug FROM models m WHERE _models_v.parent_id = m.id AND _models_v.version_slug IS NULL`,
  )
  return pending.length
}
