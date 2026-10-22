/**
 * Helpers for the synthetic migration dump (tests/fixtures/wp-migracao-mini.sql).
 * Plain text in git; gzip is produced at test time. Never point these at the real dump.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

import { MIGRACAO_TABLES, migracaoRowFilter } from '@/lib/migracao/wp-accounts'
import { readWpTables, type WpTables } from '@/lib/contos/wp-dump'

const here = path.dirname(fileURLToPath(import.meta.url))

export const MIGRACAO_PREFIX = 'wp26_'
export const CLASSISEX_POST = 2894
export const MURAL_POST = 749
export const FIXTURE_NOW = new Date('2026-10-21T12:00:00Z')

export function migracaoFixturePath(): string {
  return path.resolve(here, '../fixtures/wp-migracao-mini.sql')
}

export async function gzipMigracaoFixtureToTemp(): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wp-migracao-'))
  const file = path.join(dir, 'wp-migracao-mini.sql.gz')
  await fs.promises.writeFile(file, zlib.gzipSync(fs.readFileSync(migracaoFixturePath())))
  return file
}

export async function readMigracaoFixture(source: string = migracaoFixturePath()): Promise<WpTables> {
  return readWpTables(source, {
    prefix: MIGRACAO_PREFIX,
    tables: [...MIGRACAO_TABLES],
    rowFilter: migracaoRowFilter(MIGRACAO_PREFIX, [CLASSISEX_POST, MURAL_POST]),
  })
}

const MEMBER_EMAILS = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13].map((n) => `membro${n}.sentinela@paraiso-sintetico.test`)

/** Every personal-looking string of the fixture: none may appear in any report. */
export const SENTINELS: string[] = [
  ...MEMBER_EMAILS,
  'teste.sentinela@example.com',
  'sem-arroba-sentinela',
  'visitante.sentinela@paraiso-sintetico.test',
  ...[1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13].map((n) => `membro${n}_sentinela`),
  'admin_sentinela',
  'teste_sentinela',
  'Membro Dois Sentinela',
  'Membro Tres Sentinela',
  'Ana Sentinela',
  'Sentinela',
  'sentinela',
  '$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica',
  '$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.',
  '5f4dcc3b5aa765d61d8327deb882cf99',
  '61 98888-7777',
  'Brasília',
  'Taguatinga',
  'Asa Norte',
  'Gama',
  'foto-sentinela',
  'foto-mural-sentinela',
  'gif-mural-sentinela',
  'mural_sentinela',
  '61 97777-6666',
  '61 96666-5555',
]
