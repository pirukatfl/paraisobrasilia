import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseOldUrls } from '@/lib/redirects/build'
import { readDicasBundle } from '@/lib/dicas/import'

const root = path.resolve(__dirname, '../..')
const bundleFile = path.join(root, 'src/migrations/seed/dicas-wp.json')
const migrationFile = path.join(root, 'src/migrations')
const markdown = fs.readFileSync(path.join(root, '.planning/phases/06-migra-o-do-wordpress/06-OLD-URLS.md'), 'utf8')

const loaderMigrations = () => fs.readdirSync(migrationFile).filter((f) => /_dicas_wp_bundle\.ts$/.test(f))

describe('dicas-wp bundle', () => {
  it('ships the bundle and its loader migration together (both or neither)', () => {
    expect(fs.existsSync(bundleFile)).toBe(loaderMigrations().length === 1)
  })

  it('is valid and covers every old dicas-hot slug', () => {
    const { records, legado } = readDicasBundle(bundleFile)
    const old = parseOldUrls(markdown)
      .filter((u) => u.kind === 'post' && u.categorias.includes('dicas-hot'))
      .map((u) => u.path.replace(/^\/+|\/+$/g, ''))
    expect(old).toHaveLength(30)
    expect(legado.map((l) => l.wpSlug).sort()).toEqual([...old].sort())
    const published = new Set(records.filter((r) => r.publicar).map((r) => r.slug))
    for (const l of legado) if (l.slug !== null) expect(published.has(l.slug)).toBe(true)
  })

  it('registers the loader migration after the dicas schema migration', () => {
    // It used to be the last migration; later schema migrations (e.g. classisex_sem_conta) may follow it
    const index = fs.readFileSync(path.join(migrationFile, 'index.ts'), 'utf8')
    const names = [...index.matchAll(/name: '([^']+)'/g)].map((m) => m[1])
    const loader = names.findIndex((n) => /_dicas_wp_bundle$/.test(n))
    expect(loader).toBeGreaterThan(-1)
    expect(names[loader]! > '20261022_102706_dicas').toBe(true)
    expect(loader).toBeGreaterThan(names.indexOf('20261022_102706_dicas'))
  })
})
