'use client'

import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

import { Lightbox } from '@/components/Lightbox'
import type { LightboxSlide, ModelDTO } from '@/lib/gallery/types'
import { useHydrated } from '@/lib/gallery/use-hydrated'

const CARD_SIZES = '(min-width: 1024px) 25vw, 50vw'

/** Model cards (UI-SPEC S11): first photo 4:5, artistic name, photo count; lightbox with that model's photos. */
export function ModelGrid({ models }: { models: ModelDTO[] }) {
  const hydrated = useHydrated()
  const [open, setOpen] = useState<{ model: number; photo: number } | null>(null)
  const openers = useRef<(HTMLElement | null)[]>([])
  const openedFrom = useRef<number | null>(null)

  const slides: LightboxSlide[] = open
    ? models[open.model].photos.map((image) => ({ kind: 'photo', image, label: models[open.model].name }))
    : []

  const close = useCallback(() => {
    const from = openedFrom.current
    openedFrom.current = null
    setOpen(null)
    if (from !== null) openers.current[from]?.focus()
  }, [])

  return (
    <>
      <ul role="list" className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {models.map((model, i) => {
          const cover = model.photos[0]
          const label = `Ver fotos de ${model.name}`
          const tileClass =
            'relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-surface hover:border-accent focus-visible:border-accent'
          const image = (
            <Image
              src={cover.thumbUrl}
              alt={cover.alt}
              width={cover.thumbWidth}
              height={cover.thumbHeight}
              sizes={CARD_SIZES}
              loading={i < 2 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          )
          return (
            <li key={model.id}>
              {hydrated ? (
                <button
                  type="button"
                  aria-label={label}
                  ref={(el) => {
                    openers.current[i] = el
                  }}
                  className={tileClass}
                  onClick={() => {
                    openedFrom.current = i
                    setOpen({ model: i, photo: 0 })
                  }}
                >
                  {image}
                </button>
              ) : (
                <a href={cover.url} aria-label={label} className={tileClass}>
                  {image}
                </a>
              )}
              <p className="type-label mt-2 text-text">{model.name}</p>
              {model.photos.length > 1 && <p className="type-label text-muted">{model.photos.length} fotos</p>}
            </li>
          )
        })}
      </ul>
      <Lightbox
        slides={slides}
        index={open ? open.photo : null}
        onIndexChange={(photo) => setOpen((o) => (o ? { ...o, photo } : o))}
        onClose={close}
      />
    </>
  )
}
