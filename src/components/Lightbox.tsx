'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@/components/icons'
import type { LightboxSlide } from '@/lib/gallery/types'

const SWIPE_THRESHOLD = 48

/**
 * Shared lightbox for the space and model galleries (UI-SPEC S10): native <dialog> (focus trap
 * and Escape built in), ←/→ keys, swipe, counter announced politely, video only for the active slide.
 * `plainImages`: render a plain <img> instead of next/image — required for ClassiSex media, which
 * must never pass through the image optimizer (T-04-07).
 */
export function Lightbox({
  slides,
  index,
  onIndexChange,
  onClose,
  label = 'Galeria de fotos',
  plainImages = false,
}: {
  slides: LightboxSlide[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  label?: string
  plainImages?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const pointerStart = useRef<number | null>(null)
  const open = index !== null
  const total = slides.length

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const go = useCallback(
    (delta: number) => {
      if (index === null || total < 2) return
      onIndexChange((index + delta + total) % total)
    },
    [index, total, onIndexChange],
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    pointerStart.current = event.clientX
  }
  const onPointerUp = (event: React.PointerEvent) => {
    if (pointerStart.current === null) return
    const dx = event.clientX - pointerStart.current
    pointerStart.current = null
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1)
  }

  const slide = index !== null ? slides[index] : null
  const counter = index !== null ? `${index + 1} de ${total}` : ''
  const iconButton =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface text-text hover:text-accent'

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className="lightbox m-0 h-dvh max-h-none w-screen max-w-none bg-bg/96 p-0 text-text backdrop:bg-bg/96"
    >
      {slide && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="type-label text-muted" aria-hidden="true">
              {counter}
            </p>
            <p className="sr-only" aria-live="polite">
              {counter}
            </p>
            <button type="button" className={iconButton} onClick={() => ref.current?.close()}>
              <CloseIcon />
              <span className="sr-only">Fechar</span>
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            {slide.kind === 'video' && slide.videoUrl ? (
              <video
                key={slide.videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={slide.image.url}
                src={slide.videoUrl}
                title={slide.label}
                className="max-h-[calc(100dvh-128px)] max-w-full"
              />
            ) : plainImages ? (
              // eslint-disable-next-line @next/next/no-img-element -- private media (T-04-07)
              <img
                key={slide.image.url}
                src={slide.image.url}
                alt={slide.image.alt}
                width={slide.image.width}
                height={slide.image.height}
                decoding="async"
                className="max-h-[calc(100dvh-128px)] w-auto max-w-full object-contain"
              />
            ) : (
              <Image
                key={slide.image.url}
                src={slide.image.url}
                alt={slide.image.alt}
                width={slide.image.width}
                height={slide.image.height}
                sizes="100vw"
                className="max-h-[calc(100dvh-128px)] w-auto max-w-full object-contain"
              />
            )}
            {total > 1 && (
              <>
                <button type="button" className={`${iconButton} absolute left-2`} onClick={() => go(-1)}>
                  <ChevronLeftIcon />
                  <span className="sr-only">Anterior</span>
                </button>
                <button type="button" className={`${iconButton} absolute right-2`} onClick={() => go(1)}>
                  <ChevronRightIcon />
                  <span className="sr-only">Próxima</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col items-center px-4 pb-2 pt-4">
            <p className="type-label text-center">{slide.label}</p>
            {slide.href && (
              <Link
                href={slide.href}
                className="type-label inline-flex min-h-11 items-center text-gold underline underline-offset-4 hover:text-accent"
              >
                Ver detalhes da festa
              </Link>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
