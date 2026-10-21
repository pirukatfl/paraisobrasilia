import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, seedAdCategories } from '../helpers/seed'
import { SENTINELS, gzipMigracaoFixtureToTemp } from '../helpers/wp-migracao-fixture'

const root = path.resolve(__dirname, '../..')

describe('CLI scripts/import/wordpress.ts (06-08)', () => {
  let payload: Payload
  let gz: string
  let uploads: string
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-cli-'))

  const run = (args: string[], env: Record<string, string | undefined> = {}) => {
    const res = spawnSync('pnpm', ['import:wordpress', '--', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, WP_DUMP_PATH: gz, ...env },
    })
    // the pnpm banner line names the package (paraiso-site@1.0.0); everything else is the CLI's own output
    const out = ((res.stdout ?? '') + (res.stderr ?? '')).replace(/^> .*$/gm, '')
    // LEAK: nothing personal, no hash, no dump ids in any mode (T-06-31)
    for (const s of SENTINELS) expect(out).not.toContain(s)
    expect(out).not.toContain('@')
    // --inspect legitimately prints the 4-char hash PREFIXES with counts; a full hash never appears
    expect(out).not.toMatch(/\$wp\$2y\$\d+\$\S|\$P\$\S{5}/)
    expect(out).not.toMatch(/\b(101|102|103|104|108|501)\b/)
    return { code: res.status, out, stderr: res.stderr ?? '' }
  }

  const assinantes = async () => (await payload.count({ collection: 'assinantes', overrideAccess: true })).totalDocs
  const ads = async () => (await payload.count({ collection: 'ads', overrideAccess: true })).totalDocs

  beforeAll(async () => {
    payload = await getTestPayload()
    gz = await gzipMigracaoFixtureToTemp()
    uploads = path.join(dir, 'uploads')
    const jpeg = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#33a' } }).jpeg().toBuffer()
    // every relPath the fixture references gets a file, so exactly the existing ones are stored
    const { readMigracaoFixture, CLASSISEX_POST, MIGRACAO_PREFIX } = await import('../helpers/wp-migracao-fixture')
    const { extractLegacyAds, resolveFieldKeys } = await import('../../src/lib/migracao/wp-classisex')
    const tables = await readMigracaoFixture()
    const keys = resolveFieldKeys(tables, { postId: CLASSISEX_POST })
    void MIGRACAO_PREFIX
    for (const p of extractLegacyAds(tables, { postId: CLASSISEX_POST, keys }).ads.flatMap((a) => a.photos)) {
      if (!p.relPath) continue
      fs.mkdirSync(path.dirname(path.join(uploads, p.relPath)), { recursive: true })
      fs.writeFileSync(path.join(uploads, p.relPath), jpeg)
    }
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))
  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
  })

  it('needs WP_DUMP_PATH', () => {
    const r = run([], { WP_DUMP_PATH: '' })
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('Defina WP_DUMP_PATH com o caminho do dump (.sql.gz).')
  })

  it('rejects unknown flags', () => {
    const r = run(['--nada'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('Opção desconhecida: --nada')
  })

  it('--inspect prints structure only and writes nothing', async () => {
    const r = run(['--inspect'])
    expect(r.code).toBe(0)
    for (const s of ['custom_field_61a0e5b2c9f01', 'Eu Sou', 'Cidade', 'wmu_attachments', 'Nada foi gravado (inspeção).']) {
      expect(r.out).toContain(s)
    }
    expect(await assinantes()).toBe(0)
  })

  it('--dry-run prints the report without any database', async () => {
    const r = run(['--dry-run'], { DATABASE_URI: 'postgres://x:y@127.0.0.1:1/none' })
    expect(r.code).toBe(0)
    expect(r.out).toContain('Contas lidas: 13')
    expect(r.out).toContain('Pagantes (data futura): 4')
    expect(r.out).toContain('Nada foi gravado (simulação).')
    expect(await assinantes()).toBe(0)
  })

  it('--dry-run fails with the pt message when the field key does not exist', () => {
    const r = run(['--dry-run', '--chave-eu-sou', 'nao_existe'])
    expect(r.code).toBe(1)
    expect(r.out).toContain('Falha na importação: A chave informada em --chave-eu-sou')
  })

  it('--excluir-ids removes accounts from the import', () => {
    const file = path.join(dir, 'excluir.txt')
    fs.writeFileSync(file, '7\n# comentário\n')
    const r = run(['--dry-run', '--excluir-ids', file])
    expect(r.code).toBe(0)
    expect(r.out).toContain('excluídas pela equipe 1')
  })

  it('writes accounts, periods, drafts and photos, then is idempotent', async () => {
    const first = run(['--uploads', uploads])
    expect(first.code).toBe(0)
    expect(first.out).toMatch(/Contas: criadas 9 /)
    expect(first.out).toMatch(/Anúncios: rascunhos criados 5 /)
    expect(first.out).toContain('da equipe (rascunho para revisar) 1')
    expect(first.out).toMatch(/Fotos: gravadas [1-9]/)
    expect(await assinantes()).toBe(10) // 9 imported + the team placeholder
    expect(await ads()).toBe(5)

    const second = run(['--uploads', uploads])
    expect(second.code).toBe(0)
    expect(second.out).toMatch(/Contas: criadas 0 /)
    expect(second.out).toMatch(/rascunhos criados 0 · já existiam 5 · da equipe \(rascunho para revisar\) 0/)
    expect(await assinantes()).toBe(10)
    expect(await ads()).toBe(5)
  })

  it('refuses a missing uploads folder without echoing the path', () => {
    const r = run(['--uploads', '/nao/existe'])
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('A pasta de uploads não existe: confira o caminho.')
    expect(r.out).not.toContain('/nao/existe')
  })

  it('reports a corrupted dump generically', () => {
    const bad = path.join(dir, 'ruim.sql.gz')
    fs.writeFileSync(bad, fs.readFileSync(gz).subarray(0, 120))
    const r = run(['--dry-run'], { WP_DUMP_PATH: bad })
    expect(r.code).toBe(1)
    expect(r.out).toContain('Falha na importação:')
  })
})
