import type { PartyCardDTO } from '@/lib/parties/types'

import { PartyCard } from './PartyCard'
import { PartyCarousel } from './PartyCarousel'

export function PartyGrid({ parties }: { parties: PartyCardDTO[] }) {
  // Every upcoming party slides in the carousel; the ones after the first also stay in a card grid below
  // (2 per row from tablet up, 1 on mobile), so each party is easy to find without waiting for the slide.
  const [, ...others] = parties
  if (parties.length === 0) return null
  return (
    <div className="mt-6">
      <PartyCarousel parties={parties} />
      {others.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-6" role="list">
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
