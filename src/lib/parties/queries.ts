import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Media, Party } from '../../payload-types'
import type { FlyerFormat, FlyerImage, PartyCardDTO } from './types'

const UPCOMING_LIMIT = 50 // T-01-11: bounded list

function toFlyerImage(flyer: Party['flyer'], format: FlyerFormat, title: string): FlyerImage {
  const media = (typeof flyer === 'object' && flyer ? flyer : null) as Media | null
  const size = media?.sizes?.[format]
  const alt = media?.alt?.trim() || `Flyer da festa ${title}`
  if (size?.url && size.width && size.height) {
    return { url: size.url, width: size.width, height: size.height, alt }
  }
  return {
    url: media?.url ?? '',
    width: media?.width ?? 1080,
    height: media?.height ?? (format === 'square' ? 1080 : 1350),
    alt,
  }
}

export function toPartyCard(doc: Party): PartyCardDTO {
  const flyerFormat = (doc.flyerFormat ?? 'portrait') as FlyerFormat
  return {
    id: String(doc.id),
    slug: doc.slug,
    title: doc.title,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt ?? doc.startsAt,
    flyerFormat,
    flyer: toFlyerImage(doc.flyer, flyerFormat, doc.title),
  }
}

/** Parties that have not ended yet, soonest first (FEST-01, FEST-04). */
export async function getUpcomingParties(now: Date = new Date()): Promise<PartyCardDTO[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'parties',
    where: { endsAt: { greater_than: now.toISOString() } },
    sort: 'startsAt',
    depth: 1,
    limit: UPCOMING_LIMIT,
  })
  return docs.map(toPartyCard)
}
