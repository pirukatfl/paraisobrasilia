import type { PartyCardDTO } from '@/lib/parties/types'

import { PartyCard } from './PartyCard'
import { PartyFeatured } from './PartyFeatured'

export function PartyGrid({ parties }: { parties: PartyCardDTO[] }) {
  // The soonest party is the large, whole flyer; the others follow as a tidy card grid.
  const [next, ...others] = parties
  if (!next) return null
  return (
    <div className="mt-6">
      <PartyFeatured party={next} />
      {others.length > 0 && (
        <ul
          className="mt-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          role="list"
        >
          {others.map((party) => (
            <li key={party.id}>
              <PartyCard party={party} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
