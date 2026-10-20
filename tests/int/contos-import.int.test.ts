import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { plainTextOf } from '@/lib/contos/excerpt'
import {
  buildImportRecords,
  importContos,
  loadBundleIfPresent,
  readBundle,
  writeBundle,
} from '@/lib/contos/import'
import { extractContos, readWpTables, WP_META_KEYS } from '@/lib/contos/wp-dump'

import { gzipFixtureToTemp } from '../helpers/wp-dump-fixture'
import { getTestPayload, resetDatabase, seedConto } from '../helpers/seed'

const TABLES = ['posts', 'terms', 'term_taxonomy', 'term_relationships', 'postmeta']
const root = path.resolve(__dirname, '../..')

async function fixtureRecords() {
  const tables = await readWpTables(path.join(root, 'tests/fixtures/wp-contos-mini.sql'), {
    tables: TABLES,
    rowFilter: (t, row) => t !== 'postmeta' || (WP_META_KEYS as readonly string[]).includes(String(row.meta_key)),
  })
  return buildImportRecords(extractContos(tables)).records
}

const count = async (payload: Payload) =>
  (await payload.count({ collection: 'contos', overrideAccess: true })).totalDocs

describe('importContos (D-03, T-05-23)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })

  it('creates the published contos, is idempotent and keeps staff edits', async () => {
    const records = await fixtureRecords()
    const first = await importContos(payload, records, { now: new Date('2026-10-20T12:00:00Z') })
    expect(first.criados).toHaveLength(5)
    expect(first.existentes).toEqual([])

    const docs = await payload.find({ collection: 'contos', overrideAccess: true, draft: false, limit: 20, sort: 'wpId' })
    expect(docs.totalDocs).toBe(5)
    const classico = docs.docs.find((d) => d.wpId === 101)!
    expect(classico).toMatchObject({
      slug: 'conto-da-maca',
      wpSlug: 'conto-da-ma%c3%a7a',
      wpRestrito: false,
      paragrafosAbertos: 3,
      _status: 'published',
    })
    expect(classico.importadoEm).toBe('2026-10-20T12:00:00.000Z')
    expect(classico.publishedAt).toBe('2025-01-10T13:00:00.000Z')
    // A5: the hand-built Lexical state was accepted and holds the story text
    expect(plainTextOf(classico.texto)).toContain('Primeiro parágrafo com aspas "duplas"')
    expect(docs.docs.find((d) => d.wpId === 103)!.wpRestrito).toBe(true)

    const second = await importContos(payload, records)
    expect(second.criados).toEqual([])
    expect(second.existentes).toHaveLength(5)
    expect(await count(payload)).toBe(5)

    await payload.update({
      collection: 'contos',
      id: classico.id,
      data: { title: 'Título editado pela equipe', _status: 'published' },
      overrideAccess: true,
    })
    await importContos(payload, records)
    const after = await payload.findByID({ collection: 'contos', id: classico.id, overrideAccess: true })
    expect(after.title).toBe('Título editado pela equipe')
    expect(await count(payload)).toBe(5)
  })

  it('renames the imported slug when a staff conto already uses it', async () => {
    await seedConto(payload, { title: 'Conto da equipe', slug: 'conto-da-maca' })
    const result = await importContos(payload, await fixtureRecords())
    expect(result.renomeados).toEqual([{ de: 'conto-da-maca', para: 'conto-da-maca-2' }])
    expect(result.criados).toContain('conto-da-maca-2')
  })
})

describe('bundle loader (migration contos_wp_bundle)', () => {
  let payload: Payload
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contos-bundle-'))

  beforeAll(async () => {
    payload = await getTestPayload()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('loads a bundle once and skips a missing file without writes', async () => {
    const file = path.join(dir, 'contos-wp.json')
    writeBundle(file, await fixtureRecords(), new Date())
    expect(readBundle(file)).toHaveLength(5)
    const first = await loadBundleIfPresent(payload, file)
    expect('criados' in first && first.criados).toHaveLength(5)
    const second = await loadBundleIfPresent(payload, file)
    expect('criados' in second && second.criados).toHaveLength(0)
    expect(await count(payload)).toBe(5)

    await resetDatabase(payload)
    expect(await loadBundleIfPresent(payload, path.join(dir, 'nao-existe.json'))).toEqual({ skipped: true })
    expect(await count(payload)).toBe(0)
  })
})

describe('CLI scripts/import/contos.ts', () => {
  let payload: Payload
  let gz: string
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contos-cli-'))

  const run = (args: string[], env: Record<string, string | undefined> = {}) => {
    const res = spawnSync('pnpm', ['import:contos', '--', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, ...env },
    })
    return { code: res.status, out: res.stdout + res.stderr }
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    gz = await gzipFixtureToTemp()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('--dry-run prints the report and writes nothing', async () => {
    const r = run(['--dry-run'], { WP_DUMP_PATH: gz })
    expect(r.code, r.out).toBe(0)
    expect(r.out).toContain('Contos encontrados: 5')
    expect(r.out).toContain('Nada foi gravado (simulação).')
    expect(r.out).not.toContain('Primeiro parágrafo')
    expect(await count(payload)).toBe(0)
  })

  it('--export writes a sanitized bundle outside the repo and refuses paths inside it', () => {
    const file = path.join(dir, 'b.json')
    const r = run(['--export', file], { WP_DUMP_PATH: gz })
    expect(r.code, r.out).toBe(0)
    expect(readBundle(file)).toHaveLength(5)
    const raw = fs.readFileSync(file, 'utf8')
    for (const secret of ['Fulano Sentinela', 'fulano.sentinela@exemplo.test', 'post_author']) expect(raw).not.toContain(secret)

    const inside = run(['--export', './contos.json'], { WP_DUMP_PATH: gz })
    expect(inside.code).toBe(1)
    expect(inside.out).toContain('Grave o arquivo fora do repositório (ou em src/migrations/seed/contos-wp.json depois de revisado).')
    expect(fs.existsSync(path.join(root, 'contos.json'))).toBe(false)
  })

  it('fails with a clear message without WP_DUMP_PATH', () => {
    const r = run([], { WP_DUMP_PATH: '' })
    expect(r.code).toBe(1)
    expect(r.out).toContain('Defina WP_DUMP_PATH com o caminho do dump (.sql.gz).')
  })

  it('writes the contos, then creates nothing the second time; --from-bundle is idempotent too', async () => {
    const first = run([], { WP_DUMP_PATH: gz })
    expect(first.code, first.out).toBe(0)
    expect(await count(payload)).toBe(5)
    const second = run([], { WP_DUMP_PATH: gz })
    expect(second.code, second.out).toBe(0)
    expect(second.out).toContain('Criados: 0 · já existiam: 5')

    await resetDatabase(payload)
    const file = path.join(dir, 'again.json')
    writeBundle(file, await fixtureRecords(), new Date())
    const viaBundle = run(['--from-bundle', file])
    expect(viaBundle.code, viaBundle.out).toBe(0)
    expect(await count(payload)).toBe(5)
    expect(run(['--from-bundle', file]).out).toContain('Criados: 0 · já existiam: 5')
  })
})
