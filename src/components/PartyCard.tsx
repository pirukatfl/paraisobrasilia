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
 * Grid card: the flyer at its own proportions (very tall ones letterboxed), aligned by the top.
 * Two sibling targets, never nested: the flyer button (enlarge) and the title/date link (party page).
 */
export function PartyCard({ party, priority = false, onOpenFlyer }: Props) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-primary-hover focus-within:card-glow hover:border-primary-hover hover:card-glow">
      <button
        type="button"
        aria-label={`Ampliar flyer da festa ${party.title}`}
        onClick={(event) => onOpenFlyer(event.currentTarget)}
        className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <FlyerFrame
          flyer={party.flyer}
          sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 560px"
          priority={priority}
          imageClassName="transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </button>
      <Link
        href={`/festas/${party.slug}`}
        aria-label={`Ver detalhes da festa ${party.title}`}
        className="flex flex-col gap-2 p-5"
      >
        <p className="type-label flex items-center gap-1 text-gold">
          <CalendarIcon />
          <time dateTime={party.startsAt}>{formatCardDate(party.startsAt)}</time>
        </p>
        <h2 className="type-heading line-clamp-2">{party.title}</h2>
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
