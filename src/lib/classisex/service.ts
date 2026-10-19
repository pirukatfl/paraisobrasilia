/**
 * ClassiSex domain service. Owner operations (this plan) run after the members-area DAL check in
 * src/lib/classisex/actions.ts; staff operations are added by later plans.
 * No 'server-only' import: reachable from collection endpoints loaded by the Payload config.
 *
 * T-04-04: ownership is checked here on every write; author and status never come from the form.
 */
import type { Payload } from 'payload'

import { accessStatusFor } from '../assinantes/status'
import { relId, toOwnerAdDTO, type AdDocLike, type OwnerAdDTO } from './dto'
import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  AD_MESSAGES,
  validateAdInput,
  type AdErrors,
  type AdInput,
  type AdStatus,
} from './rules'

export class ServiceError extends Error {
  code: string
  status: number
  errors?: AdErrors
  constructor(code: string, message: string, status = 400, errors?: AdErrors) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
    this.errors = errors
  }
}

const notFound = () => new ServiceError('nao-encontrado', 'Anúncio não encontrado.', 404)

type AdDoc = AdDocLike & { author: unknown }

async function loadOwnedAd(payload: Payload, assinanteId: number, id: number | string): Promise<AdDoc> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) throw notFound()
  const ad = (await payload.findByID({
    collection: 'ads',
    id: numericId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as AdDoc | null
  if (!ad || relId(ad.author) !== Number(assinanteId)) throw notFound()
  return ad
}

async function countActive(payload: Payload, assinanteId: number, excludeId?: number): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'ads',
    where: {
      and: [
        { author: { equals: assinanteId } },
        { status: { in: ACTIVE_STATUSES } },
        ...(excludeId ? [{ id: { not_equals: excludeId } }] : []),
      ],
    },
    overrideAccess: true,
  })
  return totalDocs
}

function validated(input: AdInput) {
  const result = validateAdInput(input)
  if (!result.ok) throw new ServiceError('invalido', 'Confira os campos destacados.', 400, result.errors)
  return result.value
}

async function assertActiveCategory(payload: Payload, euSou: number) {
  const category = await payload.findByID({
    collection: 'ad-categories',
    id: euSou,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!category || category.active === false) {
    throw new ServiceError('invalido', AD_MESSAGES.euSou, 400, { euSou: AD_MESSAGES.euSou })
  }
}

const limitError = () => new ServiceError('limite', AD_MESSAGES.limite, 409)

/** D-02/D-03: new ad, status 'pendente'; at most ACTIVE_LIMIT active ads per author. */
export async function createAd(
  payload: Payload,
  { assinanteId, input, now }: { assinanteId: number; input: AdInput; now: Date },
): Promise<{ id: number }> {
  const value = validated(input)
  await assertActiveCategory(payload, value.euSou)
  if ((await countActive(payload, assinanteId)) >= ACTIVE_LIMIT) throw limitError()
  const doc = await payload.create({
    collection: 'ads',
    data: {
      author: assinanteId,
      euSou: value.euSou,
      cidade: value.cidade,
      texto: value.texto,
      contato: value.contato,
      status: 'pendente',
      submittedAt: now.toISOString(),
      consentAt: now.toISOString(),
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })
  return { id: doc.id }
}

/** D-03: any owner edit goes back to 'pendente' and clears a previous reason. */
export async function updateAd(
  payload: Payload,
  { assinanteId, id, input, now }: { assinanteId: number; id: number | string; input: AdInput; now: Date },
): Promise<void> {
  const ad = await loadOwnedAd(payload, assinanteId, id)
  const value = validated(input)
  await assertActiveCategory(payload, value.euSou)
  if (!ACTIVE_STATUSES.includes(ad.status) && (await countActive(payload, assinanteId, ad.id)) >= ACTIVE_LIMIT) {
    throw limitError()
  }
  await payload.update({
    collection: 'ads',
    id: ad.id,
    data: {
      euSou: value.euSou,
      cidade: value.cidade,
      texto: value.texto,
      contato: value.contato,
      status: 'pendente',
      submittedAt: now.toISOString(),
      consentAt: now.toISOString(),
      motivo: null,
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })
}

/** Owner deletion (also allowed after access ends: LGPD). Hard delete; cascades run in hooks. */
export async function deleteAd(
  payload: Payload,
  { assinanteId, id }: { assinanteId: number; id: number | string },
): Promise<void> {
  const ad = await loadOwnedAd(payload, assinanteId, id)
  await payload.delete({ collection: 'ads', id: ad.id, overrideAccess: true, context: { ownerEdit: true } })
}

/** Id → label of every Eu sou option (small list). */
export async function categoryLabels(payload: Payload): Promise<Map<number, string>> {
  const { docs } = await payload.find({
    collection: 'ad-categories',
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
  })
  return new Map(docs.map((d) => [d.id, d.name]))
}

/** Owner list (Meus anúncios): newest change first, at most 50. */
export async function listOwnAds(payload: Payload, assinanteId: number, now: Date = new Date()): Promise<OwnerAdDTO[]> {
  const [{ docs }, labels, access] = await Promise.all([
    payload.find({
      collection: 'ads',
      where: { author: { equals: assinanteId } },
      sort: '-updatedAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    }),
    categoryLabels(payload),
    accessStatusFor(payload, assinanteId, now),
  ])
  const authorActive = access.state === 'ativa'
  return (docs as unknown as AdDocLike[]).map((doc) =>
    toOwnerAdDTO(doc, { authorActive, euSouLabel: labels.get(relId(doc.euSou) ?? -1) ?? '' }),
  )
}

export type OwnAdFormValues = {
  id: number
  status: AdStatus
  euSou: number | null
  cidade: string
  texto: string
  whatsapp: string
  telegram: string
  email: string
}

/** Values for the edit form, or null when the ad is not the owner's. */
export async function getOwnAdFormValues(
  payload: Payload,
  assinanteId: number,
  id: number | string,
): Promise<OwnAdFormValues | null> {
  try {
    const ad = await loadOwnedAd(payload, assinanteId, id)
    return {
      id: ad.id,
      status: ad.status,
      euSou: relId(ad.euSou),
      cidade: ad.cidade ?? '',
      texto: ad.texto,
      whatsapp: ad.contato?.whatsapp ?? '',
      telegram: ad.contato?.telegram ? `@${ad.contato.telegram}` : '',
      email: ad.contato?.email ?? '',
    }
  } catch (err) {
    if (err instanceof ServiceError && err.code === 'nao-encontrado') return null
    throw err
  }
}
