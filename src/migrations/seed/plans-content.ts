import type { Payload, PayloadRequest } from 'payload'

/**
 * D-03 prices confirmed by the client 2026-10-19 — seeded as data, staff edit in the panel;
 * paymentUrl stays empty until the client sends the new PagBank links (old links carry old
 * prices, D-02); the page hides Pagar while it is empty.
 */
export const PLANS_SEED = [
  { name: 'Mensal', durationDays: 30, price: 30, order: 1 },
  { name: 'Trimestral', durationDays: 90, price: 75, order: 2 },
  { name: 'Semestral', durationDays: 180, price: 135, order: 3 },
  { name: 'Anual', durationDays: 365, price: 240, order: 4 },
] as const

/** Creates the four plans only when the collection is empty (redeploys never overwrite staff edits). */
export async function seedPlansIfEmpty(payload: Payload, req?: Partial<PayloadRequest>): Promise<number> {
  const { totalDocs } = await payload.count({ collection: 'plans', overrideAccess: true, req })
  if (totalDocs > 0) return 0
  for (const plan of PLANS_SEED) {
    await payload.create({
      collection: 'plans',
      data: { ...plan, paymentUrl: '', active: true },
      overrideAccess: true,
      req,
    })
  }
  return PLANS_SEED.length
}
