'use client'

import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

import { PlayIcon } from '@/components/icons'
import { Lightbox } from '@/components/Lightbox'
import type { LightboxSlide, SpaceItemDTO } from '@/lib/gallery/types'
import { hiddenCount, visibleCount } from '@/lib/gallery/limit'
import { useHydrated } from '@/lib/gallery/use-hydrated'
import { useTextosGerais } from '@/lib/textos/TextosGeraisProvider'
import { TextoRico } from '@/components/TextoRico'

const TILE_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'

/**
 * Space gallery grid (UI-SPEC S9): 2 / 3 / 4 columns, square tiles. Before hydration (or without
 * JavaScript) each tile is a link to the large image; afterwards it is a button opening the lightbox.
 * `abaixoDaDobra`: every image loads lazily (home sections below the fold).
 */
export function Gallery({ items, limite, abaixoDaDobra = false, contact, contactConvite = false }: { items: SpaceItemDTO[]; limite?: number; abaixoDaDobra?: boolean; contact?: string | null; contactConvite?: boolean }) {
  const hydrated = useHydrated()
  const t = useTextosGerais()
  const [index, setIndex] = useState<number | null>(null)
  const openers = useRef<(HTMLElement | null)[]>([])
  const openedFrom = useRef<number | null>(null)

  // `limite`: only the first N tiles are rendered (hidden images are never downloaded); the lightbox
  // still walks the FULL list. Without JS the hidden items are unreachable.
  const shown = visibleCount(items.length, limite)
  const hidden = hiddenCount(items.length, limite)
  const tiles = items.slice(0, shown)

  // Locked tiles (blurred, not for this viewer) are never opened: the lightbox walks only the others
  const slides: LightboxSlide[] = items.filter((item) => !item.locked).map((item) => ({
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
  const slideOf = (i: number) => items.slice(0, i).filter((item) => !item.locked).length

  return (
    <>
      <ul
        role="list"
        className={`mt-8 grid grid-cols-2 gap-4 sm:gap-6 ${limite ? 'lg:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-4'}`}
      >
        {tiles.map((item, i) => {
          const name = item.kind === 'video' ? `Assistir vídeo: ${item.video?.title ?? ''}` : item.image.alt
          const tile = (
            <>
              <Image
                src={item.image.thumbUrl}
                alt={item.kind === 'video' ? '' : item.image.alt}
                width={item.image.thumbWidth}
                height={item.image.thumbHeight}
                sizes={TILE_SIZES}
                loading={!abaixoDaDobra && i < 2 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition-transform duration-[400ms] ease-out-expo group-hover:scale-[1.04]"
              />
              {item.kind === 'video' && (
                <>
                  <span className="type-label absolute left-2 top-2 rounded bg-surface px-2 py-0.5 text-text">
                    <TextoRico valor={t.galeriaVideo} linha />
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg/70 text-text">
                      <PlayIcon />
                    </span>
                  </span>
                </>
              )}
              {hidden > 0 && i === shown - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-bg/70 text-heading font-semibold text-text"
                >
                  +{hidden}
                </span>
              )}
            </>
          )
          const tileClass =
            'group card-lift relative block aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface focus-visible:border-accent'
          if (item.locked) {
            return (
              <li key={item.id} className={i < 2 ? undefined : 'reveal stagger'} style={i < 2 ? undefined : ({ '--i': i - 2 } as React.CSSProperties)}>
                <a href="/assine-ja" aria-label="Foto exclusiva para assinantes. Assine já" className={tileClass}>
                  <Image
                    src={item.image.thumbUrl}
                    alt=""
                    width={item.image.thumbWidth}
                    height={item.image.thumbHeight}
                    sizes={TILE_SIZES}
                    unoptimized
                    loading="lazy"
                    className="h-full w-full scale-110 object-cover blur-md"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-bg/40 p-2 text-center">
                    <span className="type-label rounded-full bg-surface px-3 py-1 text-text">Só assinantes</span>
                  </span>
                </a>
              </li>
            )
          }
          return (
            <li key={item.id} className={i < 2 ? undefined : 'reveal stagger'} style={i < 2 ? undefined : ({ '--i': i - 2 } as React.CSSProperties)}>
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
                    setIndex(slideOf(i))
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
      {hidden > 0 && hydrated && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="press inline-flex min-h-11 items-center justify-center rounded-full border border-line px-6 text-text transition-colors hover:border-accent hover:text-accent focus-visible:border-accent"
            onClick={() => {
              openedFrom.current = 0
              setIndex(0)
            }}
          >
            Ver todas as fotos ({items.length})
          </button>
        </div>
      )}
      <Lightbox slides={slides} index={index} onIndexChange={setIndex} onClose={close} contact={contact} contactConvite={contactConvite} />
    </>
  )
}
