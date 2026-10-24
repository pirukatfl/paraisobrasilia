'use client'

import { useCallback, useRef, useState } from 'react'

import { Lightbox } from '@/components/Lightbox'
import type { MemberPhotoDTO, MemberVideoDTO } from '@/lib/classisex/dto'
import type { LightboxSlide } from '@/lib/gallery/types'
import { useHydrated } from '@/lib/gallery/use-hydrated'

/**
 * Photos and video of a full ad (CLAS-02). Every URL is the protected route
 * /area-do-assinante/midia/… ; plain <img>/<video> only, never the Next image optimizer: the optimizer would
 * fetch and cache private media without the viewer's session (T-04-07).
 * Without JavaScript each tile is a link to the large photo; afterwards it opens the lightbox.
 */
export function MediaGallery({ fotos, videos }: { fotos: MemberPhotoDTO[]; videos: MemberVideoDTO[] }) {
  const hydrated = useHydrated()
  const [index, setIndex] = useState<number | null>(null)
  const openers = useRef<(HTMLElement | null)[]>([])
  const openedFrom = useRef<number | null>(null)

  const slides: LightboxSlide[] = fotos.map((foto, i) => ({
    kind: 'photo',
    image: {
      url: foto.foto,
      width: foto.width ?? 1200,
      height: foto.height ?? 1200,
      alt: `Foto ${i + 1} do anúncio`,
      thumbUrl: foto.miniatura,
      thumbWidth: foto.thumbWidth ?? 480,
      thumbHeight: foto.thumbHeight ?? 480,
    },
    label: `Foto ${i + 1} de ${fotos.length}`,
  }))

  const close = useCallback(() => {
    const from = openedFrom.current
    openedFrom.current = null
    setIndex(null)
    if (from !== null) openers.current[from]?.focus()
  }, [])

  if (fotos.length === 0 && videos.length === 0) return null
  const tileClass =
    'relative block aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface hover:border-primary-hover hover:card-glow focus-visible:border-accent'

  return (
    <div className="mt-6 flex flex-col gap-6">
      {fotos.length > 0 && (
        <ul aria-label="Fotos do anúncio" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {slides.map((slide, i) => {
            const tile = (
              // eslint-disable-next-line @next/next/no-img-element -- private media (T-04-07)
              <img
                src={slide.image.thumbUrl}
                alt={slide.image.alt}
                width={slide.image.thumbWidth}
                height={slide.image.thumbHeight}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover"
              />
            )
            return (
              <li key={fotos[i].id}>
                {hydrated ? (
                  <button
                    type="button"
                    ref={(el) => {
                      openers.current[i] = el
                    }}
                    aria-label={`Ampliar foto ${i + 1}`}
                    className={tileClass}
                    onClick={() => {
                      openedFrom.current = i
                      setIndex(i)
                    }}
                  >
                    {tile}
                  </button>
                ) : (
                  <a href={slide.image.url} aria-label={`Ampliar foto ${i + 1}`} className={tileClass}>
                    {tile}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {videos.map((video, i) => (
        <figure key={video.id}>
          <video
            controls
            playsInline
            preload="metadata"
            src={video.src}
            className="aspect-video w-full rounded-lg border border-line bg-surface"
          />
          <figcaption className="type-label mt-2 text-muted">Vídeo {videos.length > 1 ? `${i + 1} · ` : '· '}{video.durationLabel}</figcaption>
        </figure>
      ))}
      <Lightbox
        slides={slides}
        index={index}
        onIndexChange={setIndex}
        onClose={close}
        label="Fotos do anúncio"
        plainImages
      />
    </div>
  )
}
