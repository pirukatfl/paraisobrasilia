/**
 * Idempotent loader of the WordPress migration (Local API, overrideAccess). Pure input = the records of
 * wp-accounts / wp-classisex; the CLI (scripts/import/wordpress.ts) only wires dump -> extract -> load.
 * No Next imports: usable from `payload run` and from tests.
 */
// T-06-26: never logs personal data; counts only
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, type Payload } from 'payload'
import sharp from 'sharp'

import { writeAudit } from '../assinantes/audit'
import { formatShortDate } from '../format/date'
import type { AccountDecision, WpAccount } from './wp-accounts'
import type { WpLegacyAd } from './wp-classisex'

export const MIGRATION_PLAN_NAME = 'Migrado do site antigo'
const MAX_PHOTOS = 10
const PHOTO_EXTENSIONS: Record<string, true> = { '.jpg': true, '.jpeg': true, '.png': true, '.webp': true }
const MIME_BY_FORMAT: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export async function ensureMigrationPlan(payload: Payload): Promise<number> {
  const { docs } = await payload.find({
    collection: 'plans',
    where: { name: { equals: MIGRATION_PLAN_NAME } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (docs[0]) return docs[0].id
  const created = await payload.create({
    collection: 'plans',
    data: {
      name: MIGRATION_PLAN_NAME,
      durationDays: 30,
      price: 0,
      active: false,
      description: 'Usado só pela importação do site antigo. Não aparece no Assine Já.',
    },
    overrideAccess: true,
  })
  return created.id
}

export type AccountsLoad = {
  criadas: number
  vinculadas: number
  jaImportadas: number
  senhaAntigaAtualizada: number
  conflitoEmail: number
  periodosCriados: number
  periodosEstendidos: number
  periodosMantidos: number
  revisarMarcadas: number
  erros: number
}

type AccountRow = {
  id: number
  name: string
  email: string
  apelido?: string | null
  wpUserId?: number | null
  legacyPasswordHash?: string | null
  _verified?: boolean | null
}

const emptyAccountsLoad = (): AccountsLoad => ({
  criadas: 0,
  vinculadas: 0,
  jaImportadas: 0,
  senhaAntigaAtualizada: 0,
  conflitoEmail: 0,
  periodosCriados: 0,
  periodosEstendidos: 0,
  periodosMantidos: 0,
  revisarMarcadas: 0,
  erros: 0,
})

const lastDayLabel = (endsAt: string) => formatShortDate(new Date(new Date(endsAt).getTime() - 1).toISOString())

async function auditImport(
  payload: Payload,
  account: AccountRow,
  summary: string,
  assinatura: WpAccount['assinatura'],
): Promise<void> {
  const req = await createLocalReq({}, payload)
  await writeAudit(req, {
    action: 'conta-importada',
    assinante: { id: account.id, name: account.name, email: account.email },
    summary,
    details: { assinatura },
  })
}

async function createAccount(payload: Payload, a: WpAccount, now: Date): Promise<AccountRow> {
  const base = {
    email: a.email,
    // unknown to anyone: Payload's own login can never succeed until the old password is converted (M-03)
    password: randomBytes(32).toString('base64url'),
    name: a.name,
    origem: 'site-antigo',
    importadoEm: now.toISOString(),
    wpUserId: a.wpUserId,
    revisarAssinaturaAntiga: a.assinatura === 'revisar',
  }
  const make = (apelido: string | null) =>
    payload.create({
      collection: 'assinantes',
      data: { ...base, ...(apelido ? { apelido } : {}) } as never,
      overrideAccess: true,
      context: { trustedCreate: true, skipAudit: true },
    })
  let created
  try {
    created = await make(a.apelido)
  } catch (err) {
    if (!a.apelido) throw err
    created = await make(null) // the nickname failed the collection validation: come in without it
  }
  const row = created as unknown as AccountRow
  if (a.hash) {
    // A separate write: guardOperations erases the old hash on any write that carries a password
    await payload.update({
      collection: 'assinantes',
      id: row.id,
      data: { legacyPasswordHash: a.hash } as never,
      overrideAccess: true,
      context: { skipAudit: true },
    })
  }
  return row
}

async function ensurePeriod(
  payload: Payload,
  planId: number,
  accountId: number,
  a: WpAccount,
  now: Date,
  result: AccountsLoad,
): Promise<void> {
  if (a.assinatura !== 'pagante' || !a.endsAt || new Date(a.endsAt).getTime() <= now.getTime()) return
  const { docs } = await payload.find({
    collection: 'subscriptions',
    where: { and: [{ assinante: { equals: accountId } }, { plan: { equals: planId } }, { status: { equals: 'ativa' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const existing = docs[0]
  if (!existing) {
    await payload.create({
      collection: 'subscriptions',
      data: {
        assinante: accountId,
        plan: planId,
        startsAt: now.toISOString(),
        endsAt: a.endsAt,
        status: 'ativa',
        payment: { method: 'outro', amount: 0, note: 'Importado do site antigo' },
      } as never,
      overrideAccess: true,
      context: { skipAudit: true },
    })
    result.periodosCriados++
  } else if (new Date(a.endsAt).getTime() > new Date(existing.endsAt as string).getTime()) {
    await payload.update({
      collection: 'subscriptions',
      id: existing.id,
      data: { endsAt: a.endsAt } as never,
      overrideAccess: true,
      context: { skipAudit: true },
    })
    result.periodosEstendidos++
  } else {
    result.periodosMantidos++
  }
}

const SELECT_ACCOUNT = { name: true, email: true, apelido: true, wpUserId: true, _verified: true } as const

async function findOne(payload: Payload, where: Record<string, unknown>): Promise<AccountRow | null> {
  const { docs } = await payload.find({
    collection: 'assinantes',
    where: where as never,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    select: { ...SELECT_ACCOUNT, legacyPasswordHash: true } as never,
  })
  return (docs[0] as unknown as AccountRow | undefined) ?? null
}

export async function importAccounts(
  payload: Payload,
  decisions: AccountDecision[],
  opts: { now: Date },
): Promise<{ result: AccountsLoad; idsByWpUser: Map<number, number> }> {
  const result = emptyAccountsLoad()
  const idsByWpUser = new Map<number, number>()
  const planId = await ensureMigrationPlan(payload)
  const importable = decisions.filter((d): d is Extract<AccountDecision, { kind: 'importar' }> => d.kind === 'importar')

  for (const { account: a } of importable) {
    try {
      const byWp = await findOne(payload, { wpUserId: { equals: a.wpUserId } })
      let row: AccountRow
      if (byWp) {
        row = byWp
        result.jaImportadas++
        // Cutover re-run: only a still-pending old hash is refreshed when the WordPress hash changed
        if (byWp.legacyPasswordHash && a.hash && byWp.legacyPasswordHash !== a.hash) {
          await payload.update({
            collection: 'assinantes',
            id: byWp.id,
            data: { legacyPasswordHash: a.hash } as never,
            overrideAccess: true,
            context: { skipAudit: true },
          })
          result.senhaAntigaAtualizada++
        }
      } else {
        const byEmail = await findOne(payload, { email: { equals: a.email } })
        if (byEmail) {
          if (byEmail._verified !== true || (byEmail.wpUserId ?? null) !== null) {
            // Someone who cannot read that inbox must never inherit paid time (T-06-27)
            result.conflitoEmail++
            continue
          }
          await payload.update({
            collection: 'assinantes',
            id: byEmail.id,
            data: {
              wpUserId: a.wpUserId,
              importadoEm: opts.now.toISOString(),
              ...(a.assinatura === 'revisar' ? { revisarAssinaturaAntiga: true } : {}),
            } as never,
            overrideAccess: true,
            context: { skipAudit: true },
          })
          result.vinculadas++
          if (a.assinatura === 'revisar') result.revisarMarcadas++
          await auditImport(payload, byEmail, 'Conta já existente vinculada ao site antigo', a.assinatura)
          row = byEmail
        } else {
          row = await createAccount(payload, a, opts.now)
          result.criadas++
          if (a.assinatura === 'revisar') result.revisarMarcadas++
          const until = a.assinatura === 'pagante' && a.endsAt ? ` (assinatura até ${lastDayLabel(a.endsAt)})` : ''
          await auditImport(payload, row, `Conta importada do site antigo${until}`, a.assinatura)
        }
      }
      idsByWpUser.set(a.wpUserId, row.id)
      await ensurePeriod(payload, planId, row.id, a, opts.now, result)
    } catch {
      // generic on purpose: no e-mail, name or id in the output (T-06-26)
      result.erros++
    }
  }
  return { result, idsByWpUser }
}

// ---------------------------------------------------------------------------------------------
// Old ads as drafts (M-04)
// ---------------------------------------------------------------------------------------------

export type AdsLoad = {
  criados: number
  jaExistiam: number
  autorAusente: number
  fotosGravadas: number
  fotosAusentes: number
  fotosRecusadas: number
  fotosForaDaPasta: number
}

type PhotoCounters = Pick<AdsLoad, 'fotosGravadas' | 'fotosAusentes' | 'fotosRecusadas' | 'fotosForaDaPasta'>

async function addPhotos(
  payload: Payload,
  adId: number,
  photos: WpLegacyAd['photos'],
  uploadsReal: string,
  counters: PhotoCounters,
): Promise<void> {
  let order = 0
  for (const photo of photos.slice(0, MAX_PHOTOS)) {
    if (!photo.relPath) {
      counters.fotosAusentes++
      continue
    }
    const resolved = path.resolve(uploadsReal, photo.relPath)
    if (!resolved.startsWith(uploadsReal + path.sep)) {
      counters.fotosForaDaPasta++
      continue
    }
    if (!PHOTO_EXTENSIONS[path.extname(photo.relPath).toLowerCase()]) {
      counters.fotosRecusadas++
      continue
    }
    let real: string
    try {
      real = await fs.realpath(resolved)
    } catch {
      counters.fotosAusentes++
      continue
    }
    // A symlink inside the folder pointing outside of it is refused too
    if (!real.startsWith(uploadsReal + path.sep)) {
      counters.fotosForaDaPasta++
      continue
    }
    try {
      const data = await fs.readFile(real)
      const meta = await sharp(data).metadata()
      const mimetype = MIME_BY_FORMAT[String(meta.format)]
      if (!mimetype) {
        counters.fotosRecusadas++
        continue
      }
      await payload.create({
        collection: 'ad-media',
        data: { ad: adId, order } as never,
        file: { data, mimetype, name: path.basename(photo.relPath), size: data.length },
        depth: 0,
        overrideAccess: true,
        // T-06-23: server-only flag, skips only the tier photo count
        context: { legacyImport: true },
      })
      order++
      counters.fotosGravadas++
    } catch {
      counters.fotosRecusadas++
    }
  }
}

export async function importLegacyAds(
  payload: Payload,
  ads: WpLegacyAd[],
  opts: { now: Date; uploadsDir?: string | null },
): Promise<AdsLoad> {
  const result: AdsLoad = {
    criados: 0,
    jaExistiam: 0,
    autorAusente: 0,
    fotosGravadas: 0,
    fotosAusentes: 0,
    fotosRecusadas: 0,
    fotosForaDaPasta: 0,
  }
  if (ads.length === 0) return result

  // Categories first: fail before any write when an "Eu sou" option is missing
  const { docs: categories } = await payload.find({
    collection: 'ad-categories',
    limit: 100,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const categoryId = new Map(categories.map((c) => [c.name, c.id]))
  for (const name of [...new Set(ads.map((a) => a.euSou))]) {
    if (!categoryId.has(name)) {
      throw new Error(`Opção "Eu sou" não encontrada: ${name}. Confira as opções no painel antes de importar.`)
    }
  }

  const uploadsReal = opts.uploadsDir ? await fs.realpath(opts.uploadsDir) : null

  const wpUserIds = [...new Set(ads.map((a) => a.wpUserId))]
  const { docs: authors } = await payload.find({
    collection: 'assinantes',
    where: { wpUserId: { in: wpUserIds } },
    limit: wpUserIds.length,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { apelido: true, wpUserId: true } as never,
  })
  const authorByWp = new Map(
    authors.map((u) => [Number((u as unknown as AccountRow).wpUserId), u as unknown as AccountRow]),
  )

  const commentIds = ads.map((a) => a.wpCommentId)
  const { docs: existingAds } = await payload.find({
    collection: 'ads',
    where: { wpCommentId: { in: commentIds } },
    limit: commentIds.length,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { wpCommentId: true, status: true } as never,
  })
  const existingByComment = new Map(
    existingAds.map((d) => [Number((d as unknown as { wpCommentId: number }).wpCommentId), d as unknown as { id: number; status: string }]),
  )

  for (const ad of ads) {
    const author = authorByWp.get(ad.wpUserId)
    if (!author) {
      result.autorAusente++
      continue
    }
    const existing = existingByComment.get(ad.wpCommentId)
    if (existing) {
      result.jaExistiam++
      // Photos are added later, once, and only to a draft that still has none (the author may have changed it)
      if (uploadsReal && existing.status === 'rascunho' && ad.photos.length > 0) {
        const { totalDocs } = await payload.count({
          collection: 'ad-media',
          where: { ad: { equals: existing.id } },
          overrideAccess: true,
        })
        if (totalDocs === 0) await addPhotos(payload, existing.id, ad.photos, uploadsReal, result)
      }
      continue
    }
    try {
      const created = await payload.create({
        collection: 'ads',
        data: {
          author: author.id,
          apelido: author.apelido || 'Anônimo',
          euSou: categoryId.get(ad.euSou),
          cidade: ad.cidade,
          texto: ad.texto,
          status: 'rascunho',
          wpCommentId: ad.wpCommentId,
          importadoEm: opts.now.toISOString(),
          criadoNoSiteAntigoEm: ad.createdAt,
        } as never,
        overrideAccess: true,
        context: { legacyImport: true },
      })
      result.criados++
      if (uploadsReal && ad.photos.length > 0) await addPhotos(payload, created.id, ad.photos, uploadsReal, result)
    } catch {
      // generic on purpose (T-06-26): the ad text and author are never printed
      throw new Error('Não foi possível gravar um anúncio antigo. Confira o banco e rode de novo (é seguro repetir).')
    }
  }
  return result
}

export function formatLoadLines(accounts: AccountsLoad, ads?: AdsLoad): string[] {
  const lines = [
    `Contas: criadas ${accounts.criadas} · vinculadas ${accounts.vinculadas} · já importadas ${accounts.jaImportadas} · conflito de e-mail ${accounts.conflitoEmail} · senha antiga atualizada ${accounts.senhaAntigaAtualizada} · erros ${accounts.erros}`,
    `Assinaturas: períodos criados ${accounts.periodosCriados} · estendidos ${accounts.periodosEstendidos} · mantidos ${accounts.periodosMantidos} · revisar marcadas ${accounts.revisarMarcadas}`,
  ]
  if (ads) {
    lines.push(
      `Anúncios: rascunhos criados ${ads.criados} · já existiam ${ads.jaExistiam} · autor não importado ${ads.autorAusente}`,
      `Fotos: gravadas ${ads.fotosGravadas} · ausentes ${ads.fotosAusentes} · recusadas ${ads.fotosRecusadas} · fora da pasta ${ads.fotosForaDaPasta}`,
    )
  }
  return lines
}
