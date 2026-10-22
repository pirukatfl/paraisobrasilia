import Link from 'next/link'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { formatCardDate } from '@/lib/format/date'
import type { PartyCardDTO } from '@/lib/parties/types'

interface Props {
  party: PartyCardDTO
  priority?: boolean
}

/** Grid card: the flyer at its own proportions (very tall ones letterboxed), aligned by the top. */
export function PartyCard({ party, priority = false }: Props) {
  return (
    <Link
      href={`/festas/${party.slug}`}
      aria-label={`Ver detalhes da festa ${party.title}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200 hover:border-accent focus-visible:border-accent"
    >
      <FlyerFrame
        flyer={party.flyer}
        sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 560px"
        priority={priority}
        imageClassName="transition-transform duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
      />
      <div className="flex flex-col gap-2 p-5">
        <p className="type-label flex items-center gap-1 text-gold">
          <CalendarIcon />
          <time dateTime={party.startsAt}>{formatCardDate(party.startsAt)}</time>
        </p>
        <h2 className="type-heading line-clamp-2">{party.title}</h2>
      </div>
    </Link>
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
