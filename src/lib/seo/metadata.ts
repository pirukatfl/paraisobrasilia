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
