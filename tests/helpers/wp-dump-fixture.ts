/**
 * Helpers for the synthetic WordPress dump (tests/fixtures/wp-contos-mini.sql).
 * The fixture is plain text in git (the project mount rewrites binaries); gzip is produced at test time.
 * Never point these helpers at the real dump.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export function fixturePath(): string {
  return path.resolve(here, '../fixtures/wp-contos-mini.sql')
}

export function fixtureText(): string {
  return fs.readFileSync(fixturePath(), 'utf8')
}

/** Gzips the fixture into a fresh directory under os.tmpdir() and returns the .sql.gz path. */
export async function gzipFixtureToTemp(): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wp-dump-'))
  const file = path.join(dir, 'wp-contos-mini.sql.gz')
  await fs.promises.writeFile(file, zlib.gzipSync(fs.readFileSync(fixturePath())))
  return file
}

/** Emits the UTF-8 bytes of `text` in `size`-byte Buffers (splits multi-byte characters on purpose). */
export function chunkedStream(text: string, size = 7): Readable {
  const bytes = Buffer.from(text, 'utf8')
  const chunks: Buffer[] = []
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.subarray(i, i + size))
  return Readable.from(chunks, { objectMode: false })
}
