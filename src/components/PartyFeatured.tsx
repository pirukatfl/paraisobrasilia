import Link from 'next/link'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { formatCardDate } from '@/lib/format/date'
import type { PartyCardDTO } from '@/lib/parties/types'

/**
 * The next party, large: full content width (up to 1000 px), flyer whole at its own proportions.
 * Tall flyers are capped in height and letterboxed on the brand background.
 */
export function PartyFeatured({ party }: { party: PartyCardDTO }) {
  return (
    <Link
      href={`/festas/${party.slug}`}
      aria-label={`Ver detalhes da festa ${party.title}`}
      data-featured-party
      className="group mx-auto flex w-full max-w-[1000px] flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200 hover:border-accent focus-visible:border-accent"
    >
      <FlyerFrame
        flyer={party.flyer}
        sizes="(max-width: 1000px) 100vw, 1000px"
        priority
        minRatio={0}
        maxHeightClass="max-h-[80vh]"
      />
      <div className="flex flex-col gap-2 p-4 sm:p-6">
        <p className="type-label text-gold">
          <time dateTime={party.startsAt}>{formatCardDate(party.startsAt)}</time>
        </p>
        <h2 className="type-heading">{party.title}</h2>
      </div>
    </Link>
  )
}
