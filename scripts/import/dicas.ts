/**
 * CLI for the WordPress "Dicas Hot" import (quick dicas-hot). Developer/orchestrator machine only:
 * scripts/ is not part of the Docker image (the VPS gets the dicas through the dicas_wp_bundle migration).
 *
 *   WP_DUMP_PATH=/caminho/fora/do/repositorio/backup.sql.gz pnpm import:dicas -- --dry-run
 *   WP_DUMP_PATH=… pnpm import:dicas                          # grava no banco do DATABASE_URI
 *   WP_DUMP_PATH=… pnpm import:dicas -- --export <arquivo>      # só gera o pacote revisável
 *   WP_DUMP_PATH=… pnpm import:dicas -- --listar-capas          # lista as capas usadas (nada é gravado)
 *   pnpm import:dicas -- --from-bundle <arquivo>               # grava a partir de um pacote
 *   pnpm import:dicas -- --from-bundle <arquivo> --uploads <pasta-uploads>   # e anexa as capas (sem conferir)
 *   WP_DUMP_PATH=… pnpm import:dicas -- --uploads <pasta-uploads>             # grava e anexa as capas
 *
 * Capas anexadas chegam com "Capa conferida" desmarcada: só aparecem no site depois que a equipe olhar.
 *
 * // DH-10: prints counts and slugs only, never titles or text.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  attachCovers,
  buildDicaRecords,
  formatCovers,
  formatDicasLoad,
  formatDicasReport,
  importDicas,
  readDicasBundle,
  writeDicasBundle,
  type DicaRecord,
} from '../../src/lib/dicas/import'
import { readWpTables } from '../../src/lib/contos/wp-dump'
import { DICAS_TABLES, dicasRowFilter, extractDicas } from '../../src/lib/dicas/wp-dump'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BUNDLE_PATH = path.join(repoRoot, 'src/migrations/seed/dicas-wp.json')

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

type Options = {
  dryRun: boolean
  listarCapas: boolean
  exportFile?: string
  fromBundle?: string
  uploads?: string
}

function parseArgs(argv: string[]): Options {
  const out: Options = { dryRun: false, listarCapas: false }
  const args = argv.filter((a) => a !== '--')
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--listar-capas') out.listarCapas = true
    else if (a === '--export') out.exportFile = args[++i] ?? fail('Informe o arquivo depois de --export.')
    else if (a === '--from-bundle') out.fromBundle = args[++i] ?? fail('Informe o arquivo depois de --from-bundle.')
    else if (a === '--uploads') out.uploads = args[++i] ?? fail('Informe a pasta depois de --uploads.')
    else fail(`Opção desconhecida: ${a}`)
  }
  return out
}

function insideRepo(file: string): boolean {
  const rel = path.relative(repoRoot, path.resolve(file))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

async function writeToDatabase(records: DicaRecord[], uploadsDir?: string) {
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../../src/payload.config')])
  const payload = await getPayload({ config })
  try {
    const load = await importDicas(payload, records)
    const covers = uploadsDir ? await attachCovers(payload, records, { uploadsDir }) : undefined
    return { load, covers }
  } finally {
    await payload.destroy()
  }
}

function listCovers(records: DicaRecord[]): string {
  const paths = [...new Set(records.map((r) => r.capaWp).filter((p): p is string => p !== null))].sort()
  return [`Capas referenciadas: ${paths.length}`, ...paths].join('\n')
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.exportFile && insideRepo(opts.exportFile) && path.resolve(opts.exportFile) !== BUNDLE_PATH) {
    fail('Grave o arquivo fora do repositório (ou em src/migrations/seed/dicas-wp.json depois de revisado).')
  }
  if (opts.uploads) {
    if (opts.dryRun || opts.exportFile || opts.listarCapas) fail('Use --uploads só quando for gravar no banco.')
    if (!fs.existsSync(opts.uploads) || !fs.statSync(opts.uploads).isDirectory()) fail('A pasta de --uploads não existe.')
  }

  if (opts.fromBundle) {
    const { records } = readDicasBundle(opts.fromBundle)
    if (opts.listarCapas) {
      console.log(listCovers(records))
      return
    }
    console.log(`Dicas no arquivo: ${records.length}`)
    const { load, covers } = await writeToDatabase(records, opts.uploads)
    console.log(formatDicasLoad(load))
    if (covers) console.log(formatCovers(covers))
    return
  }

  const dumpPath = process.env.WP_DUMP_PATH
  if (!dumpPath) fail('Defina WP_DUMP_PATH com o caminho do dump (.sql.gz).')
  const tables = await readWpTables(dumpPath, {
    prefix: process.env.WP_TABLE_PREFIX || 'wp26_',
    tables: DICAS_TABLES,
    // memory: keep only the meta keys we use and real posts
    rowFilter: dicasRowFilter,
  })
  const { records, legado, report } = buildDicaRecords(extractDicas(tables))

  if (opts.listarCapas) {
    console.log(listCovers(records))
    return
  }
  if (opts.dryRun) {
    console.log(formatDicasReport(report))
    console.log('Nada foi gravado (simulação).')
    return
  }
  if (opts.exportFile) {
    writeDicasBundle(opts.exportFile, records, legado, new Date())
    console.log(formatDicasReport(report))
    console.log(`Pacote gravado com ${records.length} dicas (${legado.length} links antigos).`)
    return
  }
  const { load, covers } = await writeToDatabase(records, opts.uploads)
  console.log(formatDicasReport(report, load, covers))
}

// Top-level await: `payload run` exits the process as soon as the imported module settles
try {
  await main()
} catch (err: unknown) {
  // Only plain Errors from our own modules carry generic messages; anything else could echo content
  const generic = err instanceof Error && err.constructor === Error
  console.error(`Falha na importação: ${generic ? (err as Error).message : 'erro inesperado (veja o código de saída).'}`)
  process.exit(1)
}
