import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { OwnerAdDTO } from './dto'
import { getOwnAdFormValues, listOwnAds, type OwnAdFormValues } from './service'

/**
 * Members-area reads for the ClassiSex. Subscriber-specific: never cached (T-03-05 pattern);
 * callers run the DAL guard (requireAssinante / requireActiveSubscription) first.
 */
export async function getOwnAds(assinanteId: number): Promise<OwnerAdDTO[]> {
  const payload = await getPayload({ config })
  return listOwnAds(payload, assinanteId, new Date())
}

export async function getOwnAdForEdit(assinanteId: number, id: string): Promise<OwnAdFormValues | null> {
  const payload = await getPayload({ config })
  return getOwnAdFormValues(payload, assinanteId, id)
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
