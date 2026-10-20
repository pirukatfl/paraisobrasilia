/**
 * CLI for the WordPress contos import (D-03). Developer/orchestrator machine only: scripts/ is not
 * part of the Docker image (the VPS gets the contos through the contos_wp_bundle migration).
 *
 *   WP_DUMP_PATH=/caminho/fora/do/repositorio/backup.sql.gz pnpm import:contos -- --dry-run
 *   WP_DUMP_PATH=… pnpm import:contos                       # grava no banco do DATABASE_URI
 *   WP_DUMP_PATH=… pnpm import:contos -- --export <arquivo>   # só gera o pacote revisável
 *   pnpm import:contos -- --from-bundle <arquivo>            # grava a partir de um pacote
 *
 * // T-05-15: prints counts and slugs only, never titles or story text.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildImportRecords,
  formatLoad,
  formatReport,
  importContos,
  readBundle,
  writeBundle,
} from '../../src/lib/contos/import'
import { extractContos, readWpTables, WP_META_KEYS } from '../../src/lib/contos/wp-dump'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BUNDLE_PATH = path.join(repoRoot, 'src/migrations/seed/contos-wp.json')

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function parseArgs(argv: string[]) {
  const out: { dryRun: boolean; exportFile?: string; fromBundle?: string } = { dryRun: false }
  const args = argv.filter((a) => a !== '--')
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--export') out.exportFile = args[++i] ?? fail('Informe o arquivo depois de --export.')
    else if (a === '--from-bundle') out.fromBundle = args[++i] ?? fail('Informe o arquivo depois de --from-bundle.')
    else fail(`Opção desconhecida: ${a}`)
  }
  return out
}

function insideRepo(file: string): boolean {
  const rel = path.relative(repoRoot, path.resolve(file))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

async function writeToDatabase(records: Parameters<typeof importContos>[1]) {
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../../src/payload.config')])
  const payload = await getPayload({ config })
  try {
    return await importContos(payload, records)
  } finally {
    await payload.destroy()
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.exportFile && insideRepo(opts.exportFile) && path.resolve(opts.exportFile) !== BUNDLE_PATH) {
    fail('Grave o arquivo fora do repositório (ou em src/migrations/seed/contos-wp.json depois de revisado).')
  }

  if (opts.fromBundle) {
    const records = readBundle(opts.fromBundle)
    console.log(`Contos no arquivo: ${records.length}`)
    console.log(formatLoad(await writeToDatabase(records)))
    return
  }

  const dumpPath = process.env.WP_DUMP_PATH
  if (!dumpPath) fail('Defina WP_DUMP_PATH com o caminho do dump (.sql.gz).')
  const tables = await readWpTables(dumpPath, {
    prefix: process.env.WP_TABLE_PREFIX || 'wp26_',
    tables: ['posts', 'terms', 'term_taxonomy', 'term_relationships', 'postmeta'],
    // memory: keep only the two meta keys we use (T-05-16)
    rowFilter: (table, row) => table !== 'postmeta' || (WP_META_KEYS as readonly string[]).includes(String(row.meta_key)),
  })
  const { records, report } = buildImportRecords(extractContos(tables))

  if (opts.dryRun) {
    console.log(formatReport(report))
    console.log('Nada foi gravado (simulação).')
    return
  }
  if (opts.exportFile) {
    writeBundle(opts.exportFile, records, new Date())
    console.log(formatReport(report))
    console.log(`Pacote gravado com ${records.length} contos.`)
    return
  }
  const load = await writeToDatabase(records)
  console.log(formatReport(report, load))
}

// Top-level await: `payload run` exits the process as soon as the imported module settles
try {
  await main()
} catch (err: unknown) {
  console.error(`Falha na importação: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}
