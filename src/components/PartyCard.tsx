import Link from 'next/link'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { formatCardDate } from '@/lib/format/date'
import type { PartyCardDTO } from '@/lib/parties/types'

interface Props {
  party: PartyCardDTO
  priority?: boolean
  /** Click on the flyer: the grid opens it in the lightbox (receives the button to return focus to) */
  onOpenFlyer: (opener: HTMLElement) => void
}

/**
 * Smaller grid card of the home list (under the carousel): the flyer at its own proportions (very tall ones letterboxed), aligned by the top.
 * Two sibling targets, never nested: the flyer button (enlarge) and the title/date link (party page).
 */
export function PartyCard({ party, priority = false, onOpenFlyer }: Props) {
  return (
    <div className="group card-lift flex flex-col overflow-hidden rounded-lg border border-line bg-surface focus-within:border-primary-hover">
      <button
        type="button"
        aria-label={`Ampliar flyer da festa ${party.title}`}
        onClick={(event) => onOpenFlyer(event.currentTarget)}
        className="press block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <FlyerFrame
          flyer={party.flyer}
          sizes="(max-width: 640px) 50vw, 360px"
          priority={priority}
          minRatio={0.7}
          maxHeightClass="max-h-72"
          imageClassName="transition-transform duration-[400ms] ease-out-expo group-hover:scale-[1.03]"
        />
      </button>
      <Link
        href={`/festas/${party.slug}`}
        aria-label={`Ver detalhes da festa ${party.title}`}
        className="flex flex-col gap-1.5 p-3 sm:p-4"
      >
        <p className="type-label flex items-center gap-1 text-gold">
          <CalendarIcon />
          <time dateTime={party.startsAt}>{formatCardDate(party.startsAt)}</time>
        </p>
        <h3 className="type-label line-clamp-2 font-semibold text-text transition-colors duration-[var(--duration-fast)] group-hover:text-accent">{party.title}</h3>
      </Link>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
    </svg>
  )
}
