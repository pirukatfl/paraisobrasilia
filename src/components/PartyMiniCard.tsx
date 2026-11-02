import Link from 'next/link'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { formatCardDate } from '@/lib/format/date'
import type { PartyCardDTO } from '@/lib/parties/types'

/**
 * Small card of the home row under the carousel: flyer thumbnail (whole, never cropped), date and title.
 * The whole card is ONE link to the party page (the carousel above keeps the enlarge-flyer button).
 */
export function PartyMiniCard({ party }: { party: PartyCardDTO }) {
  return (
    <Link
      href={`/festas/${party.slug}`}
      aria-label={`Ver detalhes da festa ${party.title}`}
      data-mini-party
      className="group press card-lift flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface focus-visible:border-accent focus-visible:outline-none"
    >
      <FlyerFrame
        flyer={party.flyer}
        sizes="(max-width: 640px) 50vw, 320px"
        minRatio={0.7}
        maxHeightClass="max-h-56"
        imageClassName="transition-transform duration-[400ms] ease-out-expo group-hover:scale-[1.03]"
      />
      <span className="flex flex-col gap-1 p-3 sm:p-4">
        <span className="type-label text-gold">
          <time dateTime={party.startsAt}>{formatCardDate(party.startsAt)}</time>
        </span>
        <span className="type-label line-clamp-2 font-semibold text-text transition-colors duration-[var(--duration-fast)] group-hover:text-accent">
          {party.title}
        </span>
      </span>
    </Link>
  )
}
