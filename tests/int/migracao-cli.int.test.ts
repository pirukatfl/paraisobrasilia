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
    expect(out).not.toMatch(/\b(101|102|103|104|108|110|107|112|113|116|501|503|504|506)\b/)
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
    const { readMigracaoFixture, CLASSISEX_POST, MURAL_POST, MIGRACAO_PREFIX } = await import('../helpers/wp-migracao-fixture')
    const { extractLegacyAds, resolveFieldKeys } = await import('../../src/lib/migracao/wp-classisex')
    const tables = await readMigracaoFixture()
    void MIGRACAO_PREFIX
    const all = [CLASSISEX_POST, MURAL_POST].flatMap(
      (postId) => extractLegacyAds(tables, { postId, keys: resolveFieldKeys(tables, { postId }) }).ads,
    )
    for (const p of all.flatMap((a) => a.photos)) {
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

  it('--dry-run reports both boards, and --post narrows the source posts', () => {
    const both = run(['--dry-run'])
    expect(both.out).toContain('ClassiSex: 6 anúncios · de visitantes (publicados pela equipe) 1')
    expect(both.out).toContain('Mural: 4 anúncios · de visitantes (publicados pela equipe) 1')
    const only = run(['--dry-run', '--post', '749'])
    expect(only.out).toContain('Mural: 4 anúncios · de visitantes (publicados pela equipe) 1')
    expect(only.out).toContain('ClassiSex: 0 anúncios')
    const list = run(['--dry-run', '--post', '2894,749'])
    expect(list.out).toContain('Mural: 4 anúncios · de visitantes (publicados pela equipe) 1')
    const bad = run(['--dry-run', '--post', '12'])
    expect(bad.code).toBe(1)
    expect(bad.out).toContain('--post só aceita os posts conhecidos')
  })

  it('writes accounts, periods, published ads and photos, then is idempotent', async () => {
    const first = run(['--uploads', uploads])
    expect(first.code).toBe(0)
    expect(first.out).toMatch(/Contas: criadas 9 /)
    expect(first.out).toContain('Anúncios: publicados 10 · promovidos de rascunho 0 · já existiam 0 · da equipe 4')
    expect(first.out).toContain('ClassiSex: publicados 6 · promovidos de rascunho 0 · já existiam 0 · da equipe 2')
    expect(first.out).toContain('Mural: publicados 4 · promovidos de rascunho 0 · já existiam 0 · da equipe 2')
    expect(first.out).toMatch(/Fotos: gravadas [1-9]/)
    expect(first.out).toContain('Mural: gravadas 2 · ausentes 1 · recusadas 1 · fora da pasta 0')
    expect(await assinantes()).toBe(10) // 9 imported + the team placeholder
    expect(await ads()).toBe(10)
    const published = await payload.count({ collection: 'ads', where: { status: { equals: 'aprovado' } }, overrideAccess: true })
    expect(published.totalDocs).toBe(10)

    // the visitor comment (116) is a published ad of the team placeholder, with the sanitised typed name and its photo
    const { docs: visitorAds } = await payload.find({
      collection: 'ads',
      where: { wpCommentId: { equals: 116 } },
      depth: 1,
      overrideAccess: true,
    })
    expect(visitorAds).toHaveLength(1)
    const va = visitorAds[0] as unknown as { status: string; apelido: string; origemLegado: string; fonteLegado: string; id: number; author: { email: string } }
    expect(va.status).toBe('aprovado')
    expect(va.apelido).toBe('Zé Sentinela')
    expect(va.origemLegado).toBe('equipe')
    expect(va.fonteLegado).toBe('mural')
    expect(va.author.email).toBe('equipe-legado@invalid.paraiso.local')
    expect(JSON.stringify(visitorAds)).not.toMatch(/98888-1234|zesentinela|visitante\.sentinela|192\.0\.2\.1/)
    const photos = await payload.count({ collection: 'ad-media', where: { ad: { equals: va.id } }, overrideAccess: true })
    expect(photos.totalDocs).toBe(1)

    const second = run(['--uploads', uploads])
    expect(second.code).toBe(0)
    expect(second.out).toMatch(/Contas: criadas 0 /)
    expect(second.out).toContain('Anúncios: publicados 0 · promovidos de rascunho 0 · já existiam 10 · da equipe 0')
    expect(await assinantes()).toBe(10)
    expect(await ads()).toBe(10)
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
