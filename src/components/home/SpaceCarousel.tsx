'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { GalleryImage } from '@/lib/gallery/types'
import { AUTO_ADVANCE_MS, indexFromScroll, shouldAutoplay, stepIndex } from '@/lib/parties/carousel'
import { preencher } from '@/lib/textos/preencher'

export type SpaceCarouselLabels = {
  carrossel: string
  anterior: string
  proxima: string
  /** `{n}` and `{total}` placeholders */
  irPara: string
  pausar: string
  retomar: string
}

/**
 * Home "Conheça o espaço" slideshow: one large photo at a time. CSS scroll-snap does the sliding and
 * the touch swipe; this adds arrows, dots and a ~5 s auto-advance that stops on hover/focus/touch,
 * while the tab is hidden, with prefers-reduced-motion, or once the visitor pauses it.
 * Only the first photo loads eagerly. A single photo shows no controls.
 */
export function SpaceCarousel({ photos, labels }: { photos: GalleryImage[]; labels: SpaceCarouselLabels }) {
  const total = photos.length
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [userStopped, setUserStopped] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
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

  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setIndex(indexFromScroll(track.scrollLeft, track.clientWidth, total))
  }, [total])

  const autoplay = shouldAutoplay({ total, reducedMotion, paused: paused || hidden, userStopped })
  useEffect(() => {
    if (!autoplay) return
    const timer = window.setTimeout(() => goTo(stepIndex(index, total, 1)), SPACE_ADVANCE_MS)
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
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.carrossel}
      data-space-carousel
      data-autoplay={autoplay ? 'on' : 'off'}
      className="relative mx-auto mt-6 w-full max-w-[900px]"
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
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border border-line bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo.url}-${i}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${total}`}
            data-slide={i + 1}
            className="relative aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[16/10]"
          >
            <Image
              src={photo.url}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 900px) 900px, 100vw"
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {many && (
        <>
          <ArrowButton direction="prev" label={labels.anterior} onClick={() => goTo(stepIndex(index, total, -1))} />
          <ArrowButton direction="next" label={labels.proxima} onClick={() => goTo(stepIndex(index, total, 1))} />
          <div className="mt-3 flex items-center justify-center gap-1">
            {photos.map((photo, i) => (
              <button
                key={`${photo.url}-${i}`}
                type="button"
                aria-label={preencher(labels.irPara, { n: i + 1, total })}
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
                aria-label={userStopped ? labels.retomar : labels.pausar}
                onClick={() => setUserStopped((v) => !v)}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:border-accent hover:text-text"
              >
                {userStopped ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** Seconds between automatic photos (the party carousel uses 6 s). */
const SPACE_ADVANCE_MS = Math.min(AUTO_ADVANCE_MS, 5000)

function ArrowButton({ direction, label, onClick }: { direction: 'prev' | 'next'; label: string; onClick: () => void }) {
  const prev = direction === 'prev'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-[calc(50%-1rem)] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/80 text-text shadow backdrop-blur hover:border-accent focus-visible:border-accent ${
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
