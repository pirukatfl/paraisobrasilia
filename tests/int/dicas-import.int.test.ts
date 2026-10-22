import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { readWpTables } from '@/lib/contos/wp-dump'
import {
  attachCovers,
  buildDicaRecords,
  formatCovers,
  importDicas,
  loadDicasBundleIfPresent,
  readDicasBundle,
  writeDicasBundle,
  type DicaRecord,
} from '@/lib/dicas/import'
import { DICAS_TABLES, dicasRowFilter, extractDicas } from '@/lib/dicas/wp-dump'

import { getTestPayload, resetDatabase } from '../helpers/seed'
import { fixturePath, gzipDicasFixtureToTemp } from '../helpers/wp-dicas-fixture'

const root = path.resolve(__dirname, '../..')
const NOW = new Date('2026-10-22T12:00:00Z')

async function fixtureBuild() {
  const tables = await readWpTables(fixturePath(), { tables: DICAS_TABLES, rowFilter: dicasRowFilter })
  return buildDicaRecords(extractDicas(tables))
}

const count = async (payload: Payload, collection: 'dicas' | 'media' = 'dicas') =>
  (await payload.count({ collection, overrideAccess: true })).totalDocs

const bySlug = async (payload: Payload, slug: string) =>
  (
    await payload.find({ collection: 'dicas', where: { slug: { equals: slug } }, draft: true, depth: 0, limit: 1, overrideAccess: true })
  ).docs[0]!

describe('importDicas (DH-06)', () => {
  let payload: Payload
  beforeAll(async () => {
    payload = await getTestPayload()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })

  it('creates the dicas (published >= 60 words, draft otherwise), is idempotent and keeps staff edits', async () => {
    const { records } = await fixtureBuild()
    const first = await importDicas(payload, records, { now: NOW })
    expect(first.criados).toHaveLength(9)
    expect(first.existentes).toEqual([])
    expect(await count(payload)).toBe(9)

    const alfa = await bySlug(payload, 'dica-sentinela-alfa')
    expect(alfa).toMatchObject({
      wpId: 201,
      wpSlug: 'dica-sentinela-alfa',
      _status: 'published',
      revisar: false,
      capaConferida: true,
      resumo: 'Resumo sentinela da dica alfa.',
    })
    expect(alfa.importadoEm).toBe(NOW.toISOString())
    expect(await bySlug(payload, 'dica-curta')).toMatchObject({ _status: 'draft', revisar: true })
    expect(await bySlug(payload, 'dica-montada')).toMatchObject({ _status: 'published', revisar: true })

    // staff edit: title, status and text
    await payload.update({
      collection: 'dicas',
      id: alfa.id,
      overrideAccess: true,
      data: { title: 'Título editado pela equipe', _status: 'draft' } as never,
      draft: true,
    })

    const second = await importDicas(payload, records, { now: NOW })
    expect(second.criados).toEqual([])
    expect(second.existentes).toHaveLength(9)
    expect(await count(payload)).toBe(9)
    const after = await bySlug(payload, 'dica-sentinela-alfa')
    expect(after.title).toBe('Título editado pela equipe')
    expect(after._status).toBe('draft')
  })

  it('renames a slug that is taken by a doc with another wpId', async () => {
    const { records } = await fixtureBuild()
    await importDicas(payload, [records[0]!], { now: NOW })
    const clash: DicaRecord = { ...records[0]!, wpId: 99001, wpSlug: 'outro' }
    const res = await importDicas(payload, [clash], { now: NOW })
    expect(res.renomeados).toEqual([{ de: clash.slug, para: `${clash.slug}-2` }])
  })
})

describe('attachCovers (DH-07, I-1, T-DH-04)', () => {
  let payload: Payload
  let tmp: string
  let uploads: string
  let records: DicaRecord[]

  const withCapa = (wpId: number, capaWp: string): DicaRecord => {
    const r = records.find((x) => x.wpId === wpId)!
    return { ...r, capaWp }
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dicas-capas-'))
    uploads = path.join(tmp, 'uploads')
    fs.mkdirSync(path.join(uploads, '2024/05'), { recursive: true })
    fs.mkdirSync(path.join(uploads, 'x'), { recursive: true })
    fs.copyFileSync(path.join(root, 'tests/fixtures/flyer-square.jpg'), path.join(uploads, '2024/05/capa-dica.jpg'))
    fs.copyFileSync(path.join(root, 'tests/fixtures/flyer-square.jpg'), path.join(uploads, 'x/anim.gif'))
    fs.writeFileSync(path.join(uploads, 'x/falsa.jpg'), 'isto nao e uma imagem')
    // a real image OUTSIDE the folder, reachable through a symlink inside it
    fs.copyFileSync(path.join(root, 'tests/fixtures/flyer-portrait.jpg'), path.join(tmp, 'fora.jpg'))
    fs.symlinkSync(path.join(tmp, 'fora.jpg'), path.join(uploads, 'x/atalho.jpg'))
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))
  beforeEach(async () => {
    await resetDatabase(payload)
    records = (await fixtureBuild()).records
    await importDicas(payload, records, { now: NOW })
  })

  it('attaches a cover once, unconfirmed, keeping the status; a second run changes nothing', async () => {
    const alfa = await bySlug(payload, 'dica-sentinela-alfa')
    const first = await attachCovers(payload, records, { uploadsDir: uploads, now: NOW })
    expect(first).toMatchObject({ gravadas: 1, jaTinham: 0, semDica: 0 })
    expect(first.semCapa).toBe(records.length - 1)
    expect(formatCovers(first)).toContain('gravadas 1')

    const after = await bySlug(payload, 'dica-sentinela-alfa')
    expect(after.capa).toBeTruthy()
    expect(after.capaConferida).toBe(false)
    expect(after.capaImportadaEm).toBe(NOW.toISOString())
    expect(after._status).toBe('published')
    expect(after.id).toBe(alfa.id)
    expect(await count(payload, 'media')).toBe(1)

    const second = await attachCovers(payload, records, { uploadsDir: uploads, now: NOW })
    expect(second).toMatchObject({ gravadas: 0, jaTinham: 1 })
    expect(await count(payload, 'media')).toBe(1)
  })

  it('never re-attaches after staff removed the cover', async () => {
    await attachCovers(payload, records, { uploadsDir: uploads, now: NOW })
    const alfa = await bySlug(payload, 'dica-sentinela-alfa')
    await payload.update({ collection: 'dicas', id: alfa.id, overrideAccess: true, data: { capa: null } as never })
    expect((await bySlug(payload, 'dica-sentinela-alfa')).capa).toBeFalsy()
    const again = await attachCovers(payload, records, { uploadsDir: uploads, now: NOW })
    expect(again).toMatchObject({ gravadas: 0, jaTinham: 1 })
    expect((await bySlug(payload, 'dica-sentinela-alfa')).capa).toBeFalsy()
  })

  it('keeps a draft a draft', async () => {
    const draft = withCapa(206, '2024/05/capa-dica.jpg')
    const res = await attachCovers(payload, [draft], { uploadsDir: uploads, now: NOW })
    expect(res.gravadas).toBe(1)
    const doc = await bySlug(payload, 'dica-curta')
    expect(doc._status).toBe('draft')
    expect(doc.capaConferida).toBe(false)
  })

  it('refuses symlinks leaving the folder, traversal, wrong extensions and non-images; counts missing files', async () => {
    const batch: DicaRecord[] = [
      withCapa(203, 'x/atalho.jpg'), // symlink to a file outside the folder
      withCapa(207, 'x/anim.gif'), // extension not allowed
      withCapa(208, 'x/falsa.jpg'), // not an image
      withCapa(211, 'x/ausente.jpg'), // missing
      withCapa(212, '../fora.jpg'), // traversal
      { ...withCapa(201, '2024/05/capa-dica.jpg'), wpId: 99999 }, // no dica
    ]
    const res = await attachCovers(payload, batch, { uploadsDir: uploads, now: NOW })
    expect(res).toMatchObject({ gravadas: 0, foraDaPasta: 2, recusadas: 2, ausentes: 1, semDica: 1, jaTinham: 0, semCapa: 0 })
    expect(await count(payload, 'media')).toBe(0)
    for (const slug of ['titulo-real-da-terceira-dica', 'dica-com-contatos', 'dica-com-seo', 'dica-postdev', 'dica-capa-ruim']) {
      expect((await bySlug(payload, slug)).capa).toBeFalsy()
    }
  })

  it('fails with a generic message when the uploads folder does not exist', async () => {
    await expect(attachCovers(payload, records, { uploadsDir: path.join(tmp, 'nao-existe') })).rejects.toThrow()
  })
})

describe('dicas bundle (T-DH-07)', () => {
  let payload: Payload
  let dir: string
  beforeAll(async () => {
    payload = await getTestPayload()
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dicas-bundle-'))
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))
  beforeEach(async () => {
    await resetDatabase(payload)
  })

  it('round-trips records and legado', async () => {
    const { records, legado } = await fixtureBuild()
    const file = path.join(dir, 'dicas.json')
    writeDicasBundle(file, records, legado, NOW)
    const back = readDicasBundle(file)
    expect(back.records).toEqual(records)
    expect(back.legado).toEqual(legado)
    expect(back.legado).toHaveLength(11)
  })

  it('rejects a tampered bundle with a generic message', async () => {
    const { records, legado } = await fixtureBuild()
    const tamper = (mutate: (b: { dicas: Record<string, unknown>[]; legado: Record<string, unknown>[] }) => void) => {
      const file = path.join(dir, `bad-${Math.random().toString(36).slice(2)}.json`)
      writeDicasBundle(file, records, legado, NOW)
      const bundle = JSON.parse(fs.readFileSync(file, 'utf8'))
      mutate(bundle)
      fs.writeFileSync(file, JSON.stringify(bundle))
      return file
    }
    const bad = 'Arquivo de dicas inválido.'
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.slug = 'A B')))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.capaWp = '../x')))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.capaWp = '/etc/passwd')))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.resumo = 'x'.repeat(301))))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.publishedAt = 'ontem')))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.publicar = 'sim')))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.dicas[0]!.texto = { root: {} })))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => (b.legado[0]!.slug = 'A B')))).toThrow(bad)
    expect(() => readDicasBundle(tamper((b) => ((b as unknown as { version: number }).version = 2)))).toThrow(bad)
    const notJson = path.join(dir, 'lixo.json')
    fs.writeFileSync(notJson, 'nao e json')
    expect(() => readDicasBundle(notJson)).toThrow(bad)
  })

  it('loadDicasBundleIfPresent skips a missing file and loads a present one (idempotent)', async () => {
    expect(await loadDicasBundleIfPresent(payload, path.join(dir, 'nao-existe.json'))).toEqual({ skipped: true })
    const { records, legado } = await fixtureBuild()
    const file = path.join(dir, 'carga.json')
    writeDicasBundle(file, records, legado, NOW)
    const first = await loadDicasBundleIfPresent(payload, file)
    expect('criados' in first && first.criados.length).toBe(9)
    const second = await loadDicasBundleIfPresent(payload, file)
    expect('criados' in second && second.criados.length).toBe(0)
    expect(await count(payload)).toBe(9)
  })
})

describe('pnpm import:dicas (CLI, synthetic dump only)', () => {
  let payload: Payload
  let gz: string
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dicas-cli-'))

  const run = (args: string[], env: Record<string, string | undefined> = {}) => {
    const res = spawnSync('pnpm', ['import:dicas', '--', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, ...env },
    })
    return { code: res.status, out: res.stdout + res.stderr }
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    gz = await gzipDicasFixtureToTemp()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('--dry-run prints counts and slugs only and writes nothing', async () => {
    const r = run(['--dry-run'], { WP_DUMP_PATH: gz })
    expect(r.code, r.out).toBe(0)
    expect(r.out).toContain('Dicas encontradas: 11')
    expect(r.out).toContain('para conferir: 4')
    expect(r.out).toContain('dica-sentinela-alfa · 88 palavras · publicada · capa')
    expect(r.out).toContain('Nada foi gravado (simulação).')
    for (const forbidden of ['Dica sentinela alfa', 'Titulo real', 'Primeiro bloco', 'Resumo sentinela', 'Fulano', 'fulano', '99999']) {
      expect(r.out).not.toContain(forbidden)
    }
    expect(await count(payload)).toBe(0)
  })

  it('writes to the database, then a second run creates nothing', async () => {
    const first = run([], { WP_DUMP_PATH: gz })
    expect(first.code, first.out).toBe(0)
    expect(first.out).toContain('Criados: 9 · já existiam: 0')
    expect(await count(payload)).toBe(9)
    const second = run([], { WP_DUMP_PATH: gz })
    expect(second.code, second.out).toBe(0)
    expect(second.out).toContain('Criados: 0 · já existiam: 9')
    expect(await count(payload)).toBe(9)
  })

  it('--export writes the bundle outside the repository and refuses other paths inside it', async () => {
    const out = path.join(dir, 'dicas-wp.json')
    const ok = run(['--export', out], { WP_DUMP_PATH: gz })
    expect(ok.code, ok.out).toBe(0)
    expect(readDicasBundle(out).records).toHaveLength(9)
    expect(ok.out).not.toContain('Dica sentinela alfa')

    const refused = run(['--export', path.join(root, 'tmp-dicas-export.json')], { WP_DUMP_PATH: gz })
    expect(refused.code).toBe(1)
    expect(fs.existsSync(path.join(root, 'tmp-dicas-export.json'))).toBe(false)
  })

  it('--from-bundle needs no dump; --uploads attaches the cover once, unconfirmed', async () => {
    const bundle = path.join(dir, 'carga.json')
    expect(run(['--export', bundle], { WP_DUMP_PATH: gz }).code).toBe(0)
    const uploads = path.join(dir, 'uploads')
    fs.mkdirSync(path.join(uploads, '2024/05'), { recursive: true })
    fs.copyFileSync(path.join(root, 'tests/fixtures/flyer-square.jpg'), path.join(uploads, '2024/05/capa-dica.jpg'))

    const r = run(['--from-bundle', bundle, '--uploads', uploads], { WP_DUMP_PATH: undefined })
    expect(r.code, r.out).toBe(0)
    expect(r.out).toContain('Criados: 9')
    expect(r.out).toContain('Capas: gravadas 1 · ausentes 0 · recusadas 0 · fora da pasta 0 · já tinham 0 · sem dica 0 · sem capa no site antigo 8')
    expect((await bySlug(payload, 'dica-sentinela-alfa')).capaConferida).toBe(false)

    const again = run(['--from-bundle', bundle, '--uploads', uploads])
    expect(again.out).toContain('Criados: 0')
    expect(again.out).toContain('gravadas 0')
    expect(again.out).toContain('já tinham 1')
    expect(await count(payload, 'media')).toBe(1)
  })

  it('--uploads needs an existing folder and cannot be combined with --dry-run', async () => {
    expect(run(['--uploads', path.join(dir, 'nao-existe')], { WP_DUMP_PATH: gz }).code).toBe(1)
    expect(run(['--dry-run', '--uploads', dir], { WP_DUMP_PATH: gz }).code).toBe(1)
    expect(await count(payload)).toBe(0)
  })

  it('--listar-capas prints the cover paths and writes nothing', async () => {
    const r = run(['--listar-capas'], { WP_DUMP_PATH: gz })
    expect(r.code, r.out).toBe(0)
    expect(r.out).toContain('Capas referenciadas: 1')
    expect(r.out).toContain('2024/05/capa-dica.jpg')
    expect(await count(payload)).toBe(0)
  })

  it('fails without WP_DUMP_PATH and on unknown options', async () => {
    expect(run([], { WP_DUMP_PATH: undefined }).code).toBe(1)
    const unknown = run(['--nada'], { WP_DUMP_PATH: gz })
    expect(unknown.code).toBe(1)
    expect(unknown.out).toContain('Opção desconhecida')
  })
})
