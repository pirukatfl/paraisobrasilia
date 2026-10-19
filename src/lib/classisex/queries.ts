import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { findMemberAd, findMemberAds, type BoardFilters, type BoardPage } from './board'
import type { MemberAdDTO, OwnerAdDTO, OwnerMediaDTO } from './dto'
import { getOwnAdFormValues, getOwnAdMedia, listOwnAds, type OwnAdFormValues } from './service'

/**
 * Members-area reads for the ClassiSex. Subscriber-specific: never cached (T-03-05 pattern);
 * callers run the DAL guard (requireAssinante / requireActiveSubscription) first.
 */
export async function getOwnAds(assinanteId: number): Promise<OwnerAdDTO[]> {
  const payload = await getPayload({ config })
  return listOwnAds(payload, assinanteId, new Date())
}

export async function getOwnAdForEdit(
  assinanteId: number,
  id: string,
): Promise<(OwnAdFormValues & { media: OwnerMediaDTO }) | null> {
  const payload = await getPayload({ config })
  const [values, media] = await Promise.all([
    getOwnAdFormValues(payload, assinanteId, id),
    getOwnAdMedia(payload, assinanteId, id),
  ])
  return values && media ? { ...values, media } : null
}

export type CategoryOption = { id: number; name: string }

/** Active Eu sou options, in staff order. */
export async function getActiveAdCategories(): Promise<CategoryOption[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'ad-categories',
    where: { active: { equals: true } },
    sort: 'order',
    depth: 0,
    limit: 50,
    overrideAccess: true,
  })
  return docs.map((d) => ({ id: d.id, name: d.name }))
}

/**
 * Members board (CLAS-01, CLAS-02). T-04-05: entitlement of the viewer is checked by the page
 * (requireActiveSubscription) and the visibility of each ad is computed per request here.
 */
export async function listMemberAds(filters: BoardFilters): Promise<BoardPage<MemberAdDTO>> {
  const payload = await getPayload({ config })
  return findMemberAds(payload, filters, new Date())
}

export async function getMemberAd(id: string | number): Promise<MemberAdDTO | null> {
  const payload = await getPayload({ config })
  return findMemberAd(payload, id, new Date())
}

/** True when the ad belongs to the subscriber (hides "Denunciar" on their own ad). */
export async function isOwnAd(assinanteId: number, id: string | number): Promise<boolean> {
  const payload = await getPayload({ config })
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) return false
  const { totalDocs } = await payload.count({
    collection: 'ads',
    where: { and: [{ id: { equals: numericId } }, { author: { equals: assinanteId } }] },
    overrideAccess: true,
  })
  return totalDocs > 0
}
