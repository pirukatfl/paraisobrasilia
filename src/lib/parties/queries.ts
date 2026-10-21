import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Media, Party } from '../../payload-types'
import { cached } from '../cache/cached'
import type { FlyerImage, PartyCardDTO, PartyDetailDTO, RichTextState } from './types'
import { isUpcoming } from './visibility'

const UPCOMING_LIMIT = 50 // T-01-11: bounded list

/**
 * The flyer is shown whole, at its own proportions (square, 4:5, 9:16, 16:9...): use the
 * non-cropping `gallery` derivative (long side up to 1600 px) and fall back to the original.
 */
function toFlyerImage(flyer: Party['flyer'], title: string): FlyerImage {
  const media = (typeof flyer === 'object' && flyer ? flyer : null) as Media | null
  const size = media?.sizes?.gallery
  const alt = media?.alt?.trim() || `Flyer da festa ${title}`
  if (size?.url && size.width && size.height) {
    return { url: size.url, width: size.width, height: size.height, alt }
  }
  return {
    url: media?.url ?? '',
    width: media?.width ?? 1080,
    height: media?.height ?? 1350,
    alt,
  }
}

export function toPartyCard(doc: Party): PartyCardDTO {
  return {
    id: String(doc.id),
    slug: doc.slug,
    title: doc.title,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt ?? doc.startsAt,
    flyer: toFlyerImage(doc.flyer, doc.title),
    updatedAt: doc.updatedAt,
  }
}

async function fetchUpcomingParties(nowIso: string): Promise<PartyCardDTO[]> {
  const now = new Date(nowIso)
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'parties',
    where: {
      and: [{ _status: { equals: 'published' } }, { endsAt: { greater_than: now.toISOString() } }],
    },
    draft: false,
    sort: 'startsAt',
    depth: 1,
    limit: UPCOMING_LIMIT,
  })
  return docs.map(toPartyCard)
}

const cachedUpcomingParties = cached(fetchUpcomingParties, ['parties:upcoming'], () => ['parties'])

/** Published parties that have not ended yet, soonest first (FEST-01, FEST-04). */
export async function getUpcomingParties(now: Date = new Date()): Promise<PartyCardDTO[]> {
  // Rounded to the minute so cache entries roll over instead of one entry per request
  const minute = new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString()
  const parties = await cachedUpcomingParties(minute)
  return parties.filter((p) => isUpcoming(p, now))
}

/** Absolute URL (crawlers need it) of the og derivative; null when the flyer has none. */
function toAbsoluteOgUrl(flyer: Party['flyer']): string | null {
  const media = (typeof flyer === 'object' && flyer ? flyer : null) as Media | null
  const url = media?.sizes?.og?.url
  if (!url) return null
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return url.startsWith('http') ? url : `${base}${url}`
}

export function toPartyDetail(doc: Party, now: Date = new Date()): PartyDetailDTO {
  const card = toPartyCard(doc)
  return {
    ...card,
    summary: doc.summary?.trim() || null,
    details: (doc.details as RichTextState | null | undefined) ?? null,
    prices: (doc.prices ?? [])
      .filter((row) => row.label && row.value)
      .map((row) => ({ label: row.label, value: row.value as string })),
    dressCode: doc.dressCode?.trim() || null,
    attractions: (doc.attractions ?? []).map((a) => ({ kind: a.kind, name: a.name })),
    isPast: !isUpcoming(card, now),
    flyerOgUrl: toAbsoluteOgUrl(doc.flyer),
    meta: doc.meta ? { title: doc.meta.title ?? null, description: doc.meta.description ?? null } : null,
  }
}

async function fetchPartyBySlug(slug: string): Promise<PartyDetailDTO | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'parties',
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    draft: false,
    depth: 1,
    limit: 1,
  })
  return docs[0] ? toPartyDetail(docs[0]) : null
}

const cachedPartyBySlug = cached(fetchPartyBySlug, ['parties:by-slug'], (slug) => [`party:${slug}`])

/** One published party by its page address, or null (→ 404). Past parties stay reachable (shared links). */
export async function getPartyBySlug(slug: string, now: Date = new Date()): Promise<PartyDetailDTO | null> {
  const party = await cachedPartyBySlug(slug)
  // isPast depends on the clock, not on the cached data
  return party ? { ...party, isPast: !isUpcoming(party, now) } : null
}

async function fetchAllPartySlugs(): Promise<string[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'parties',
    where: { _status: { equals: 'published' } },
    draft: false,
    depth: 0,
    limit: 200,
    select: { slug: true },
  })
  return docs.map((d) => d.slug)
}

/** All published slugs (not used at build time: party pages are generated on first request). */
export const getAllPartySlugs = cached(fetchAllPartySlugs, ['parties:slugs'], () => ['parties'])
