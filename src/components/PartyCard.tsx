import Image from 'next/image'
import Link from 'next/link'

import { formatCardDate } from '@/lib/format/date'
import type { PartyCardDTO } from '@/lib/parties/types'

interface Props {
  party: PartyCardDTO
  priority?: boolean
  featured?: boolean
}

export function PartyCard({ party, priority = false, featured = false }: Props) {
  const ratio = party.flyerFormat === 'square' ? 'aspect-square' : 'aspect-[4/5]'
  return (
    <Link
      href={`/festas/${party.slug}`}
      aria-label={`Ver detalhes da festa ${party.title}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200 hover:border-accent focus-visible:border-accent"
    >
      <div className={`relative ${ratio} w-full overflow-hidden rounded-t-lg`}>
        <Image
          src={party.flyer.url}
          alt={party.flyer.alt}
          width={party.flyer.width}
          height={party.flyer.height}
          sizes={
            featured
              ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 66vw'
              : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          }
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
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
