/**
 * CLI for the WordPress account + old-ad migration (Phase 6). Runs from the repo (and from the staging
 * `migrate` image, where scripts/ and node_modules exist).
 *
 *   WP_DUMP_PATH=/caminho/backup.sql.gz pnpm import:wordpress -- --inspect     # descobre chaves e formulário
 *   WP_DUMP_PATH=… pnpm import:wordpress -- --dry-run                          # relatório, sem banco
 *   WP_DUMP_PATH=… pnpm import:wordpress                                       # grava no banco do DATABASE_URI
 *   WP_DUMP_PATH=… pnpm import:wordpress -- --uploads /caminho/wp-content/uploads
 *   opções: --chave-eu-sou <meta_key> --chave-cidade <meta_key> --excluir-ids <arquivo> --post <id>
 *
 * // T-06-31: prints counts only
 */
import fs from 'node:fs'

import { formatLoadLines, importAccounts, importLegacyAds } from '../../src/lib/migracao/load'
import { buildMigrationReport, formatInspect, formatMigrationReport } from '../../src/lib/migracao/report'
import { MIGRACAO_TABLES, extractAccounts, migracaoRowFilter } from '../../src/lib/migracao/wp-accounts'
import {
  CLASSISEX_POST_ID,
  extractLegacyAds,
  inspectDump,
  resolveFieldKeys,
} from '../../src/lib/migracao/wp-classisex'
import { DEFAULT_WP_PREFIX, readWpTables } from '../../src/lib/contos/wp-dump'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

type Opts = {
  inspect: boolean
  dryRun: boolean
  uploads?: string
  chaveEuSou?: string
  chaveCidade?: string
  excluirIds?: string
  post: number
}

function parseArgs(argv: string[]): Opts {
  const out: Opts = { inspect: false, dryRun: false, post: CLASSISEX_POST_ID }
  const args = argv.filter((a) => a !== '--')
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    const value = () => args[++i] ?? fail(`Informe o valor depois de ${a}.`)
    if (a === '--inspect') out.inspect = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--uploads') out.uploads = value()
    else if (a === '--chave-eu-sou') out.chaveEuSou = value()
    else if (a === '--chave-cidade') out.chaveCidade = value()
    else if (a === '--excluir-ids') out.excluirIds = value()
    else if (a === '--post') {
      const n = Number(value())
      if (!Number.isInteger(n) || n <= 0) fail('O valor de --post deve ser um número inteiro.')
      out.post = n
    } else fail(`Opção desconhecida: ${a}`)
  }
  return out
}

function readExcludedIds(file: string): Set<number> {
  let text: string
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    fail('Não foi possível ler o arquivo de --excluir-ids.')
  }
  const ids = new Set<number>()
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (/^\d+$/.test(t)) ids.add(Number(t))
  }
  return ids
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const dumpPath = process.env.WP_DUMP_PATH
  if (!dumpPath) fail('Defina WP_DUMP_PATH com o caminho do dump (.sql.gz).')
  const prefix = process.env.WP_TABLE_PREFIX || DEFAULT_WP_PREFIX

  const excluirIds = opts.excluirIds ? readExcludedIds(opts.excluirIds) : undefined
  if (opts.uploads && !opts.inspect && !opts.dryRun) {
    const ok = await fs.promises.stat(opts.uploads).then((s) => s.isDirectory(), () => false)
    if (!ok) fail('A pasta de uploads não existe: confira o caminho.')
  }

  const tables = await readWpTables(dumpPath, {
    prefix,
    tables: [...MIGRACAO_TABLES],
    rowFilter: migracaoRowFilter(prefix, opts.post),
  })

  if (opts.inspect) {
    console.log(formatInspect(inspectDump(tables, { prefix, postId: opts.post })))
    console.log('Nada foi gravado (inspeção).')
    return
  }

  const keys = resolveFieldKeys(tables, { postId: opts.post, euSou: opts.chaveEuSou, cidade: opts.chaveCidade })
  const now = new Date()
  const decisions = extractAccounts(tables, { prefix, now, excluirIds })
  const adsResult = extractLegacyAds(tables, { postId: opts.post, keys })

  if (opts.dryRun) {
    console.log(formatMigrationReport(buildMigrationReport(decisions, adsResult)))
    console.log('Nada foi gravado (simulação).')
    return
  }

  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../../src/payload.config')])
  const payload = await getPayload({ config })
  try {
    const { result, idsByWpUser } = await importAccounts(payload, decisions, { now })
    const ads = await importLegacyAds(payload, adsResult.ads, { now, uploadsDir: opts.uploads ?? null })
    const report = buildMigrationReport(decisions, adsResult, new Set(idsByWpUser.keys()))
    console.log(formatMigrationReport(report, formatLoadLines(result, ads)))
  } finally {
    await payload.destroy()
  }
}

// Top-level await: `payload run` exits the process as soon as the imported module settles
try {
  await main()
} catch (err: unknown) {
  // Only plain Errors from our own modules carry generic messages; anything else could echo row content (T-06-31)
  const generic = err instanceof Error && err.constructor === Error
  console.error(`Falha na importação: ${generic ? (err as Error).message : 'erro inesperado (veja o código de saída).'}`)
  process.exit(1)
}
