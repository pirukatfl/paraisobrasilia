'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { formatCardDate } from '@/lib/format/date'
import { AUTO_ADVANCE_MS, indexFromScroll, shouldAutoplay, slideLabel, stepIndex } from '@/lib/parties/carousel'
import type { PartyCardDTO } from '@/lib/parties/types'

/**
 * Home carousel of ALL upcoming parties (the old site had a flyer slider). CSS scroll-snap does the
 * sliding and the touch swipe; this component adds the arrows, the dots and the auto-advance
 * (every ~6 s, paused on hover/focus/touch, off with prefers-reduced-motion or after the visitor
 * stops it). Each slide keeps the whole flyer at its own proportions: the flyer button enlarges it,
 * the title/date link goes to the party page.
 * A single party shows no controls.
 */
export function PartyCarousel({
  parties,
  onOpenFlyer,
}: {
  parties: PartyCardDTO[]
  /** Click on a slide's flyer: index in `parties` + the button to return focus to */
  onOpenFlyer: (index: number, opener: HTMLElement) => void
}) {
  const total = parties.length
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userStopped, setUserStopped] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const goTo = useCallback(
    (target: number) => {
      const track = trackRef.current
      if (!track) return
      const clamped = Math.min(total - 1, Math.max(0, target))
      track.scrollTo({ left: clamped * track.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' })
      setIndex(clamped)
    },
    [reducedMotion, total],
  )

  // Follow the swipe / scroll position
  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setIndex(indexFromScroll(track.scrollLeft, track.clientWidth, total))
  }, [total])

  const autoplay = shouldAutoplay({ total, reducedMotion, paused, userStopped })
  useEffect(() => {
    if (!autoplay) return
    // A new timer after every slide change, so a manual move always gets a full interval
    const timer = window.setTimeout(() => goTo(stepIndex(index, total, 1)), AUTO_ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [autoplay, goTo, index, total])

  // Keep the current slide aligned when the width changes (rotation, resize)
  useEffect(() => {
    const track = trackRef.current
    if (!track || total < 2) return
    const observer = new ResizeObserver(() => {
      track.scrollTo({ left: index * track.clientWidth, behavior: 'auto' })
    })
    observer.observe(track)
    return () => observer.disconnect()
  }, [index, total])

  const many = total > 1

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Carrossel de festas"
      data-party-carousel
      data-autoplay={autoplay ? 'on' : 'off'}
      className="relative mx-auto w-full max-w-[1000px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        aria-live={autoplay ? 'off' : 'polite'}
        className="flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {parties.map((party, i) => (
          <div
            key={party.id}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabel(i + 1, total, party.title)}
            data-slide={i + 1}
            className="w-full shrink-0 snap-center"
          >
            <div className="group flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors duration-200 focus-within:border-accent hover:border-accent">
              <button
                type="button"
                aria-label={`Ampliar flyer da festa ${party.title}`}
                onClick={(event) => onOpenFlyer(i, event.currentTarget)}
                className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <FlyerFrame
                  flyer={party.flyer}
                  sizes="(max-width: 1000px) 100vw, 1000px"
                  priority={i === 0}
                  minRatio={0}
                  maxHeightClass="max-h-[80vh]"
                />
              </button>
              <Link
                href={`/festas/${party.slug}`}
                aria-label={`Ver detalhes da festa ${party.title}`}
                data-featured-party
                className="flex flex-col gap-2 p-4 sm:p-6"
              >
                <p className="type-label text-gold">
                  <time dateTime={party.startsAt}>{formatCardDate(party.startsAt)}</time>
                </p>
                <h2 className="type-heading">{party.title}</h2>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {many && (
        <>
          <ArrowButton direction="prev" onClick={() => goTo(stepIndex(index, total, -1))} />
          <ArrowButton direction="next" onClick={() => goTo(stepIndex(index, total, 1))} />
          <div className="mt-3 flex items-center justify-center gap-1">
            {parties.map((party, i) => (
              <button
                key={party.id}
                type="button"
                aria-label={`Ir para a festa ${i + 1} de ${total}: ${party.title}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => goTo(i)}
                className="group/dot flex h-8 w-8 items-center justify-center"
              >
                <span
                  className={`block h-2.5 w-2.5 rounded-full border border-gold transition-colors ${
                    i === index ? 'bg-gold' : 'bg-transparent group-hover/dot:bg-gold/40'
                  }`}
                />
              </button>
            ))}
            {!reducedMotion && (
              <button
                type="button"
                aria-pressed={userStopped}
                aria-label={userStopped ? 'Retomar a troca automática das festas' : 'Pausar a troca automática das festas'}
                onClick={() => setUserStopped((v) => !v)}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:border-accent hover:text-text"
              >
                {userStopped ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ArrowButton({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  const prev = direction === 'prev'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? 'Festa anterior' : 'Próxima festa'}
      className={`absolute top-[min(38%,40vh)] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/80 text-text shadow backdrop-blur hover:border-accent focus-visible:border-accent ${
        prev ? 'left-2' : 'right-2'
      }`}
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={prev ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'} />
      </svg>
    </button>
  )
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="3" y="2" width="2.5" height="10" />
      <rect x="8.5" y="2" width="2.5" height="10" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3.5 2l8 5-8 5z" />
    </svg>
  )
}
