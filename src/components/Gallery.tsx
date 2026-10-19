'use client'

import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

import { PlayIcon } from '@/components/icons'
import { Lightbox } from '@/components/Lightbox'
import type { LightboxSlide, SpaceItemDTO } from '@/lib/gallery/types'
import { useHydrated } from '@/lib/gallery/use-hydrated'

const TILE_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'

/**
 * Space gallery grid (UI-SPEC S9): 2 / 3 / 4 columns, square tiles. Before hydration (or without
 * JavaScript) each tile is a link to the large image; afterwards it is a button opening the lightbox.
 */
export function Gallery({ items }: { items: SpaceItemDTO[] }) {
  const hydrated = useHydrated()
  const [index, setIndex] = useState<number | null>(null)
  const openers = useRef<(HTMLElement | null)[]>([])
  const openedFrom = useRef<number | null>(null)

  const slides: LightboxSlide[] = items.map((item) => ({
    kind: item.kind,
    image: item.image,
    videoUrl: item.video?.url,
    label: item.caption ?? item.video?.title ?? item.image.alt,
  }))

  // Focus returns to the tile that opened the lightbox (not the slide shown last)
  const close = useCallback(() => {
    const from = openedFrom.current
    openedFrom.current = null
    setIndex(null)
    if (from !== null) openers.current[from]?.focus()
  }, [])

  return (
    <>
      <ul role="list" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {items.map((item, i) => {
          const name = item.kind === 'video' ? `Assistir vídeo: ${item.video?.title ?? ''}` : item.image.alt
          const tile = (
            <>
              <Image
                src={item.image.thumbUrl}
                alt={item.kind === 'video' ? '' : item.image.alt}
                width={item.image.thumbWidth}
                height={item.image.thumbHeight}
                sizes={TILE_SIZES}
                loading={i < 2 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
              {item.kind === 'video' && (
                <>
                  <span className="type-label absolute left-2 top-2 rounded bg-surface px-2 py-0.5 text-text">
                    Vídeo
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg/70 text-text">
                      <PlayIcon />
                    </span>
                  </span>
                </>
              )}
            </>
          )
          const tileClass =
            'relative block aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface hover:border-accent focus-visible:border-accent'
          return (
            <li key={item.id}>
              {hydrated ? (
                <button
                  type="button"
                  ref={(el) => {
                    openers.current[i] = el
                  }}
                  aria-label={name}
                  className={tileClass}
                  onClick={() => {
                    openedFrom.current = i
                    setIndex(i)
                  }}
                >
                  {tile}
                </button>
              ) : (
                <a href={item.video?.url ?? item.image.url} aria-label={name} className={tileClass}>
                  {tile}
                </a>
              )}
              {item.caption && <p className="type-label mt-2 line-clamp-1 text-muted">{item.caption}</p>}
            </li>
          )
        })}
      </ul>
      <Lightbox slides={slides} index={index} onIndexChange={setIndex} onClose={close} />
    </>
  )
}
