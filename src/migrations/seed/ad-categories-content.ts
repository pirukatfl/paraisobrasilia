import type { Payload, PayloadRequest } from 'payload'

/** D-01 (revisão 2026-10-20): "Eu sou" options by type: Casal, Mulher, Homem, Trans; staff edit the list in the panel. */
export const AD_CATEGORIES_SEED = [
  { name: 'Casal', order: 0 },
  { name: 'Mulher', order: 1 },
  { name: 'Homem', order: 2 },
  { name: 'Trans', order: 3 },
] as const

/** Creates the options only when the collection is empty (redeploys never overwrite staff edits). */
export async function seedAdCategoriesIfEmpty(payload: Payload, req?: Partial<PayloadRequest>): Promise<number> {
  const { totalDocs } = await payload.count({ collection: 'ad-categories', overrideAccess: true, req })
  if (totalDocs > 0) return 0
  for (const category of AD_CATEGORIES_SEED) {
    await payload.create({
      collection: 'ad-categories',
      data: { ...category, active: true },
      overrideAccess: true,
      req,
    })
  }
  return AD_CATEGORIES_SEED.length
}
