import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Plan } from '../../payload-types'
import { cached } from '../cache/cached'
import { formatBRL } from '../format/money'

export type PlanDTO = {
  id: number
  name: string
  durationDays: number
  durationLabel: string
  price: number
  promoPrice: number | null
  priceLabel: string
  promoLabel: string | null
  paymentUrl: string | null
  description: string | null
}

const PLANS_LIMIT = 20

export function durationLabel(days: number): string {
  return days === 1 ? '1 dia' : `${days} dias`
}

type PlanLike = Pick<Plan, 'id' | 'name' | 'durationDays' | 'price'> &
  Partial<Pick<Plan, 'promoPrice' | 'paymentUrl' | 'description'>>

export function toPlanDTO(doc: PlanLike): PlanDTO {
  const promo = typeof doc.promoPrice === 'number' && doc.promoPrice > 0 ? doc.promoPrice : null
  return {
    id: doc.id,
    name: doc.name.trim(),
    durationDays: doc.durationDays,
    durationLabel: durationLabel(doc.durationDays),
    price: doc.price,
    promoPrice: promo,
    priceLabel: formatBRL(doc.price),
    promoLabel: promo === null ? null : formatBRL(promo),
    paymentUrl: doc.paymentUrl?.trim() || null,
    description: doc.description?.trim() || null,
  }
}

async function fetchActivePlans(): Promise<PlanDTO[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'plans',
    where: { active: { equals: true } },
    sort: ['order', 'durationDays'],
    depth: 0,
    limit: PLANS_LIMIT,
  })
  return docs.map(toPlanDTO)
}

/** Active plans for /assine-ja, cached with tag 'plans' (expired by the collection hooks). */
export const getActivePlans = cached(fetchActivePlans, ['assinantes:plans'], () => ['plans'])
