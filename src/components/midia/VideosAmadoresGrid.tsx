'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { CloseIcon, PlayIcon } from '@/components/icons'
import { TextoRico } from '@/components/TextoRico'
import { useHydrated } from '@/lib/gallery/use-hydrated'
import { duracaoRotulo } from '@/lib/midia-enviada/publicacao'
import type { TextoRico as EstadoRico } from '@/lib/textos/rico'

export type VideoAmadorCard = { id: number; apelido: string; duracao: number | null }

export type ConviteVideos = {
  titulo: EstadoRico
  texto: EstadoRico
  textoLogado: EstadoRico
  assine: EstadoRico
  entrar: EstadoRico
}

const videoUrl = (id: number) => `/videos-amadores/${id}/video`

/**
 * Grid of the approved videos sent by the public. There is no poster (the files are not processed on the
 * server), so each card is a dark tile with a play button, the nickname and the length. Clicking opens a dialog:
 * a player for staff and active subscribers, an invitation (subscribe / sign in) for everybody else. `podeAssistir`
 * only chooses what the dialog shows; the bytes are refused by the video route whatever this component renders.
 * Before hydration (or without JavaScript) a card is a plain link: the video for who may watch, "Assine já" otherwise.
 */
export function VideosAmadoresGrid({
  videos,
  podeAssistir,
  logado,
  convite,
}: {
  videos: VideoAmadorCard[]
  podeAssistir: boolean
  logado: boolean
  convite: ConviteVideos
}) {
  const hydrated = useHydrated()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openers = useRef(new Map<number, HTMLElement>())
  const openedFrom = useRef<number | null>(null)
  const [ativo, setAtivo] = useState<VideoAmadorCard | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (ativo && !dialog.open) dialog.showModal()
    if (!ativo && dialog.open) dialog.close()
  }, [ativo])

  // Unmounting the <video> stops it; focus goes back to the card that opened the dialog
  const fechado = useCallback(() => {
    const from = openedFrom.current
    openedFrom.current = null
    setAtivo(null)
    setFalhou(false)
    if (from !== null) openers.current.get(from)?.focus()
  }, [])

  const cardClass =
    'group card-lift press relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2 focus-visible:border-accent'
  const iconButton =
    'press inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-bg text-text transition-[color,background-color,transform] duration-150 hover:bg-line hover:text-accent'

  return (
    <>
      <ul role="list" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {videos.map((video, i) => {
          const duracao = duracaoRotulo(video.duracao)
          const nome = `Assistir vídeo de ${video.apelido}${duracao ? `, duração ${duracao}` : ''}`
          const face = (
            <>
              <span
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-text transition-colors duration-[var(--duration-fast)] group-hover:bg-primary-hover"
              >
                <PlayIcon />
              </span>
              {duracao && (
                <span aria-hidden="true" className="type-label absolute bottom-2 right-2 rounded bg-bg/80 px-2 py-0.5 text-text">
                  {duracao}
                </span>
              )}
            </>
          )
          return (
            <li key={video.id} className={i < 3 ? undefined : 'reveal stagger'} style={i < 3 ? undefined : ({ '--i': i - 3 } as React.CSSProperties)}>
              {hydrated ? (
                <button
                  type="button"
                  ref={(el) => {
                    if (el) openers.current.set(video.id, el)
                    else openers.current.delete(video.id)
                  }}
                  aria-label={nome}
                  className={cardClass}
                  onClick={() => {
                    openedFrom.current = video.id
                    setAtivo(video)
                  }}
                >
                  {face}
                </button>
              ) : (
                <a href={podeAssistir ? videoUrl(video.id) : '/assine-ja'} aria-label={nome} className={cardClass}>
                  {face}
                </a>
              )}
              <p className="type-label mt-2 line-clamp-1 text-text">{video.apelido}</p>
            </li>
          )
        })}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby="titulo-video-amador"
        onClose={fechado}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="lightbox m-auto w-[min(100%-2rem,760px)] rounded-xl border border-line bg-surface p-4 text-text backdrop:bg-bg/90 sm:p-6"
      >
        {ativo && (
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 id="titulo-video-amador" className="type-heading">
                {podeAssistir ? `Vídeo de ${ativo.apelido}` : <TextoRico valor={convite.titulo} linha />}
              </h2>
              <button type="button" className={iconButton} onClick={() => dialogRef.current?.close()}>
                <CloseIcon />
                <span className="sr-only">Fechar</span>
              </button>
            </div>
            {podeAssistir ? (
              falhou ? (
                <p role="alert" className="mt-4 text-body text-muted">
                  Não foi possível carregar o vídeo agora. Feche e tente de novo; se continuar, confira se a sua assinatura está ativa.
                </p>
              ) : (
                <video
                  key={ativo.id}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  controlsList="nodownload"
                  src={videoUrl(ativo.id)}
                  title={`Vídeo de ${ativo.apelido}`}
                  onError={() => setFalhou(true)}
                  className="mt-4 aspect-video max-h-[70dvh] w-full rounded-lg bg-black"
                />
              )
            ) : (
              <>
                <TextoRico valor={logado ? convite.textoLogado : convite.texto} className="mt-4 text-body text-muted" />
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Link href="/assine-ja" className="press btn-primary">
                    <TextoRico valor={convite.assine} linha />
                  </Link>
                  {!logado && (
                    <Link href={`/entrar?next=${encodeURIComponent('/videos-amadores')}`} className="press btn-secondary">
                      <TextoRico valor={convite.entrar} linha />
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  )
}
