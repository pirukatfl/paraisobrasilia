'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ModelCardDTO } from '@/lib/gallery/types'

const AUTO_MS = 4500
const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 55vw'

/**
 * Home "Galeria" slider: the first photo of each profissional/amadora, one card per model, each linking
 * to that model's page (where non-subscribers see the other photos blurred). CSS scroll-snap does the
 * sliding and the touch swipe; arrows and a slow auto-advance (paused on hover, focus or touch, off with
 * prefers-reduced-motion or after the visitor presses pause) are added here.
 */
export function GaleriaSlider({ models }: { models: ModelCardDTO[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [paused, setPaused] = useState(false)
  const [stopped, setStopped] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const step = useCallback(
    (dir: 1 | -1) => {
      const track = trackRef.current
      if (!track) return
      const first = track.firstElementChild as HTMLElement | null
      const width = (first?.offsetWidth ?? track.clientWidth / 2) + 16
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
      if (dir === 1 && atEnd) track.scrollTo({ left: 0, behavior: reduced ? 'auto' : 'smooth' })
      else track.scrollBy({ left: dir * width, behavior: reduced ? 'auto' : 'smooth' })
    },
    [reduced],
  )

  const autoplay = models.length > 1 && !paused && !stopped && !reduced
  useEffect(() => {
    if (!autoplay) return
    const timer = window.setInterval(() => step(1), AUTO_MS)
    return () => window.clearInterval(timer)
  }, [autoplay, step])

  return (
    <div
      className="relative mt-8"
      aria-roledescription="carousel"
      aria-label="Galeria: primeira foto de cada modelo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) setPaused(true)
      }}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <ul
        ref={trackRef}
        role="list"
        aria-live={autoplay ? 'off' : 'polite'}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {models.map((model, i) => (
          <li key={model.id} className="w-[55%] shrink-0 snap-start sm:w-[33%] lg:w-[calc(25%-12px)]">
            <Link
              href={`/modelos/${model.slug}`}
              aria-label={`Ver fotos de ${model.name}`}
              className="group press block focus-visible:outline-none"
            >
              <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-surface card-lift group-hover:border-primary-hover group-focus-visible:border-accent">
                <Image
                  src={model.cover.thumbUrl}
                  alt={model.cover.alt}
                  width={model.cover.thumbWidth}
                  height={model.cover.thumbHeight}
                  sizes={CARD_SIZES}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[400ms] ease-out-expo group-hover:scale-[1.04]"
                />
              </span>
              <span className="type-label mt-2 block text-text transition-colors group-hover:text-accent">{model.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {models.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Modelos anteriores"
            className="absolute left-2 top-[38%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/80 text-text shadow backdrop-blur hover:border-accent focus-visible:border-accent"
          >
            <Arrow d="M12.5 4 6.5 10l6 6" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Próximas modelos"
            className="absolute right-2 top-[38%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/80 text-text shadow backdrop-blur hover:border-accent focus-visible:border-accent"
          >
            <Arrow d="M7.5 4l6 6-6 6" />
          </button>
          {!reduced && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                aria-pressed={stopped}
                onClick={() => setStopped((v) => !v)}
                className="type-label rounded-full border border-line px-3 py-1 text-muted hover:border-accent hover:text-text"
              >
                {stopped ? 'Retomar a troca automática' : 'Pausar a troca automática'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Arrow({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={d} />
    </svg>
  )
}
