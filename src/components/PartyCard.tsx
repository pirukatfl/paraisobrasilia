import Image from 'next/image'
import Link from 'next/link'

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
        <h2 className="type-heading line-clamp-2">{party.title}</h2>
      </div>
    </Link>
  )
}
