import type { PartyCardDTO } from '@/lib/parties/types'

import { PartyCard } from './PartyCard'

export function PartyGrid({ parties }: { parties: PartyCardDTO[] }) {
  // Focal point: with 3+ parties the soonest one spans 2 columns x 2 rows from 1024px.
  const featureFirst = parties.length >= 3
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3" role="list">
      {parties.map((party, index) => (
        <li
          key={party.id}
          className={index === 0 && featureFirst ? 'lg:col-span-2 lg:row-span-2' : undefined}
        >
          <PartyCard party={party} priority={index === 0} featured={index === 0 && featureFirst} />
        </li>
      ))}
    </ul>
  )
}
