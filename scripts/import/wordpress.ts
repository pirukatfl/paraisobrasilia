/**
 * CLI for the WordPress account + old-ad migration (Phase 6). Runs from the repo (and from the staging
 * `migrate` image, where scripts/ and node_modules exist).
 *
 *   WP_DUMP_PATH=/caminho/backup.sql.gz pnpm import:wordpress -- --inspect     # descobre chaves e formulário
 *   WP_DUMP_PATH=… pnpm import:wordpress -- --dry-run                          # relatório, sem banco
 *   WP_DUMP_PATH=… pnpm import:wordpress                                       # grava no banco do DATABASE_URI
 *   WP_DUMP_PATH=… pnpm import:wordpress -- --uploads /caminho/wp-content/uploads
 *   opções: --chave-eu-sou <meta_key> --chave-cidade <meta_key> --excluir-ids <arquivo>
 *           --post <id>[,<id>…]   posts de origem dos anúncios (padrão: 2894 ClassiSex e 749 Mural)
 *
 * // T-06-31: prints counts only
 */
import fs from 'node:fs'

import { formatLoadLines, importAccounts, importLegacyAds } from '../../src/lib/migracao/load'
import { buildMigrationReport, formatInspect, formatMigrationReport } from '../../src/lib/migracao/report'
import { MIGRACAO_TABLES, extractAccounts, migracaoRowFilter } from '../../src/lib/migracao/wp-accounts'
import {
  DEFAULT_POST_IDS,
  FONTE_BY_POST,
  extractLegacyAds,
  inspectDump,
  resolveFieldKeys,
  type AdSkip,
  type WpLegacyAd,
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
  posts: number[]
}

function parseArgs(argv: string[]): Opts {
  const out: Opts = { inspect: false, dryRun: false, posts: DEFAULT_POST_IDS }
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
      const ids = value()
        .split(',')
        .map((t) => Number(t.trim()))
      if (ids.length === 0 || ids.some((n) => !Number.isInteger(n) || n <= 0)) {
        fail('O valor de --post deve ser um número inteiro ou uma lista separada por vírgulas (ex.: 2894,749).')
      }
      const unknown = ids.filter((n) => !(n in FONTE_BY_POST))
      if (unknown.length > 0) fail('--post só aceita os posts conhecidos: 2894 (ClassiSex) e 749 (Mural).')
      out.posts = [...new Set(ids)]
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
    rowFilter: migracaoRowFilter(prefix, opts.posts),
  })

  if (opts.inspect) {
    console.log(formatInspect(inspectDump(tables, { prefix, postId: opts.posts })))
    console.log('Nada foi gravado (inspeção).')
    return
  }

  const now = new Date()
  const decisions = extractAccounts(tables, { prefix, now, excluirIds })
  // One extraction per source post: ClassiSex and Mural share the two custom fields (Eu Sou, Cidade)
  const adsResult: { ads: WpLegacyAd[]; skipped: Record<AdSkip, number> } = {
    ads: [],
    skipped: { resposta: 0, 'nao-aprovado': 0, visitante: 0, 'eu-sou-desconhecido': 0, 'texto-vazio': 0, 'outro-tipo': 0 },
  }
  for (const postId of opts.posts) {
    if (!(tables.comments ?? []).some((c) => Number(c.comment_post_ID) === postId)) {
      console.log(`Aviso: o dump não tem comentários no post ${postId}; origem ignorada.`)
      continue
    }
    const keys = resolveFieldKeys(tables, { postId, euSou: opts.chaveEuSou, cidade: opts.chaveCidade })
    const one = extractLegacyAds(tables, { postId, keys })
    adsResult.ads.push(...one.ads)
    for (const k of Object.keys(one.skipped) as AdSkip[]) adsResult.skipped[k] += one.skipped[k]
  }

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
