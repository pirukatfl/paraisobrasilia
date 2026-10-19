import type { Metadata } from 'next'

import { formatPartyDate, formatPartyTime } from '../format/date'
import type { PartyDetailDTO } from '../parties/types'

export interface PartySeoFields {
  meta?: { title?: string | null; description?: string | null } | null
}

/** Per-party metadata for search and share previews (FEST-03, INST-05). */
export function buildPartyMetadata(party: PartyDetailDTO & PartySeoFields): Metadata {
  const title = party.meta?.title?.trim() || party.title
  const description =
    party.meta?.description?.trim() ||
    party.summary ||
    `${party.title} — ${formatPartyDate(party.startsAt)}, a partir das ${formatPartyTime(party.startsAt)}. Veja valores, dress code e atrações.`

  // ?v= busts WhatsApp/Instagram preview caches when staff edit the party
  const images = party.flyerOgUrl
    ? [{ url: `${party.flyerOgUrl}?v=${Date.parse(party.updatedAt)}`, width: 1200, height: 630, alt: party.title }]
    : undefined

  return {
    title,
    description,
    alternates: { canonical: `/festas/${party.slug}` },
    openGraph: {
      type: 'website',
      url: `/festas/${party.slug}`,
      title,
      description,
      siteName: 'Paraíso Brasília',
      locale: 'pt_BR',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  }
}

const DEFAULT_OG_IMAGE = { url: '/og-default.jpg', width: 1200, height: 630, alt: 'Paraíso Brasília' }

/**
 * Metadata for the open-area pages (Quem somos, legal pages, Espaço, Modelos, Contato):
 * title (layout template adds " · Paraíso Brasília"), description, canonical and a share preview.
 * A page-level `openGraph` replaces the layout's, so site name, locale and image are repeated here.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string
  description?: string | null
  path: string
  image?: { url: string; width: number; height: number; alt: string }
}): Metadata {
  const desc = description?.trim() || undefined
  const og = image ?? DEFAULT_OG_IMAGE
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title,
      description: desc,
      siteName: 'Paraíso Brasília',
      locale: 'pt_BR',
      images: [og],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [og.url],
    },
  }
}
