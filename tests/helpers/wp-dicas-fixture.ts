/**
 * Helpers for the synthetic WordPress dump (tests/fixtures/wp-dicas-mini.sql, all data invented).
 * The fixture is plain text in git; gzip is produced at test time.
 * Never point these helpers at the real dump.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export function fixturePath(): string {
  return path.resolve(here, '../fixtures/wp-dicas-mini.sql')
}

/** Gzips the fixture into a fresh directory under os.tmpdir() and returns the .sql.gz path. */
export async function gzipDicasFixtureToTemp(): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wp-dicas-'))
  const file = path.join(dir, 'wp-dicas-mini.sql.gz')
  await fs.promises.writeFile(file, zlib.gzipSync(fs.readFileSync(fixturePath())))
  return file
}
