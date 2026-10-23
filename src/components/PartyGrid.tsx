'use client'

import { useCallback, useRef, useState } from 'react'

import { Lightbox } from '@/components/Lightbox'
import { formatCardDate } from '@/lib/format/date'
import type { LightboxSlide } from '@/lib/gallery/types'
import type { PartyCardDTO } from '@/lib/parties/types'

import { PartyCard } from './PartyCard'
import { PartyCarousel } from './PartyCarousel'

export function PartyGrid({ parties }: { parties: PartyCardDTO[] }) {
  // Every upcoming party slides in the carousel; the ones after the first also stay in a card grid below
  // (2 per row from tablet up, 1 on mobile), so each party is easy to find without waiting for the slide.
  const [, ...others] = parties
  const [index, setIndex] = useState<number | null>(null)
  // The carousel and the grid both have a button for the same party: remember the one actually clicked
  const opener = useRef<HTMLElement | null>(null)

  // One slide per party, in carousel order; the flyer opens big and links to the party page
  const slides: LightboxSlide[] = parties.map((party) => ({
    kind: 'photo',
    image: {
      ...party.flyer,
      thumbUrl: party.flyer.url,
      thumbWidth: party.flyer.width,
      thumbHeight: party.flyer.height,
    },
    label: `${party.title} · ${formatCardDate(party.startsAt)}`,
    href: `/festas/${party.slug}`,
  }))

  const open = (target: number, element: HTMLElement) => {
    opener.current = element
    setIndex(target)
  }

  // Focus returns to the flyer button that opened the lightbox (not the slide shown last)
  const close = useCallback(() => {
    const from = opener.current
    opener.current = null
    setIndex(null)
    from?.focus()
  }, [])

  if (parties.length === 0) return null
  return (
    <div className="mt-6">
      <PartyCarousel parties={parties} onOpenFlyer={open} />
      {others.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-6" role="list">
          {others.map((party, j) => (
            <li key={party.id}>
              <PartyCard party={party} onOpenFlyer={(element) => open(j + 1, element)} />
            </li>
          ))}
        </ul>
      )}
      <Lightbox slides={slides} index={index} onIndexChange={setIndex} onClose={close} label="Flyers das festas" fitScreen />
    </div>
  )
}
