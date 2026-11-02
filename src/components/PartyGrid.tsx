'use client'

import { useCallback, useRef, useState } from 'react'

import { Lightbox } from '@/components/Lightbox'
import { formatCardDate } from '@/lib/format/date'
import type { LightboxSlide } from '@/lib/gallery/types'
import type { PartyCardDTO } from '@/lib/parties/types'

import { PartyMiniCard } from './PartyMiniCard'
import { PartyCarousel } from './PartyCarousel'

export function PartyGrid({ parties }: { parties: PartyCardDTO[] }) {
  // Every upcoming party slides in the carousel; the 2 parties after the first also get a small card below
  // (side by side, also on the phone), so the next ones are easy to find without waiting for the slide.
  const next = parties.slice(1, 3)
  const [index, setIndex] = useState<number | null>(null)
  // Remember the button that opened the lightbox, to return focus to it
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
  }, [setIndex])

  if (parties.length === 0) return null
  return (
    <div className="mt-6">
      <PartyCarousel parties={parties} onOpenFlyer={open} />
      {next.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 items-stretch gap-3 sm:gap-6" role="list" aria-label="Também em breve" data-mini-parties>
          {next.map((party, j) => (
            <li key={party.id} className="reveal stagger" style={{ '--i': j } as React.CSSProperties}>
              <PartyMiniCard party={party} />
            </li>
          ))}
        </ul>
      )}
      <Lightbox slides={slides} index={index} onIndexChange={setIndex} onClose={close} label="Flyers das festas" fitScreen />
    </div>
  )
}
