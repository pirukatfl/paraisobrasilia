'use client'

import { useEffect, useMemo, useState } from 'react'

import { TIER_LIMITS } from '@/lib/assinantes/tier'
import {
  CLIENT_MESSAGES,
  MAX_AD_PHOTO_BYTES,
  MAX_AD_VIDEO_BYTES,
  PHOTO_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from '@/lib/classisex/media-messages'
import { MAX_VIDEO_SECONDS } from '@/lib/classisex/mp4'

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

/** Same fallback as the upload route: some phones send an empty type for .mov. */
export function mimeOf(file: File): string {
  if (file.type) return file.type
  return EXTENSION_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? ''
}

/** Duration in seconds from the file metadata, or null when the browser cannot read it (the server decides then). */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(value)
    }
    const timer = setTimeout(() => done(null), 5000)
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      clearTimeout(timer)
      done(Number.isFinite(video.duration) ? video.duration : null)
    }
    video.onerror = () => {
      clearTimeout(timer)
      done(null)
    }
    video.src = url
  })
}

function Preview({ file, kind, onRemove, index }: { file: File; kind: 'foto' | 'video'; onRemove: () => void; index: number }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-2">
      {kind === 'foto' ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview, never the Next image optimizer
        <img src={url} alt={`Prévia da foto ${index + 1}`} className="aspect-square w-full rounded object-cover" />
      ) : (
        <video src={url} aria-label={`Prévia do vídeo ${index + 1}`} muted playsInline preload="metadata" controls className="aspect-square w-full rounded object-cover" />
      )}
      <p className="type-label truncate text-muted">{file.name}</p>
      <button type="button" onClick={onRemove} className="type-label self-start text-danger underline underline-offset-4">
        {kind === 'foto' ? `Tirar foto ${index + 1}` : `Tirar vídeo ${index + 1}`}
      </button>
    </li>
  )
}

const fileInput =
  'mt-2 block w-full text-body file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:py-2 file:text-text'

/**
 * Photo and video pickers of "Novo anúncio" (client choice 2026-10-20). Controlled by AdForm: the files
 * live in its state and are uploaded one by one after the ad exists. The inputs have no `name`, so the
 * server action never receives the (large) files. Limits are checked here for fast feedback and again
 * on the server (route handler + collection hooks).
 */
export function AdMediaPicker({
  photos,
  videos,
  onPhotos,
  onVideos,
  disabled,
  limits = TIER_LIMITS.assinante,
}: {
  photos: File[]
  videos: File[]
  onPhotos: (files: File[]) => void
  onVideos: (files: File[]) => void
  disabled: boolean
  /** Limits of the account's tier (server decides again): photos and videos per ad */
  limits?: { fotos: number; videos: number }
}) {
  const MAX_AD_PHOTOS = limits.fotos
  const MAX_AD_VIDEOS = limits.videos
  const [photoNotes, setPhotoNotes] = useState<string[]>([])
  const [videoNotes, setVideoNotes] = useState<string[]>([])
  const notes = [...photoNotes, ...videoNotes]

  function pickPhotos(list: FileList | null) {
    const notes2: string[] = []
    const next = [...photos]
    for (const file of Array.from(list ?? [])) {
      if (!PHOTO_MIME_TYPES.includes(mimeOf(file))) notes2.push(CLIENT_MESSAGES.fotoTipo(file.name))
      else if (file.size > MAX_AD_PHOTO_BYTES) notes2.push(CLIENT_MESSAGES.fotoGrande(file.name))
      else if (next.length >= MAX_AD_PHOTOS) {
        if (!notes2.includes(CLIENT_MESSAGES.fotosMax(MAX_AD_PHOTOS))) notes2.push(CLIENT_MESSAGES.fotosMax(MAX_AD_PHOTOS))
      } else next.push(file)
    }
    onPhotos(next)
    setPhotoNotes(notes2)
  }

  async function pickVideos(list: FileList | null) {
    const notes2: string[] = []
    const next = [...videos]
    for (const file of Array.from(list ?? [])) {
      if (!VIDEO_MIME_TYPES.includes(mimeOf(file))) notes2.push(CLIENT_MESSAGES.videoTipo(file.name))
      else if (file.size > MAX_AD_VIDEO_BYTES) notes2.push(CLIENT_MESSAGES.videoGrande(file.name))
      else if (next.length >= MAX_AD_VIDEOS) {
        if (!notes2.includes(CLIENT_MESSAGES.videosMax(MAX_AD_VIDEOS))) notes2.push(CLIENT_MESSAGES.videosMax(MAX_AD_VIDEOS))
      } else if (((await readDuration(file)) ?? 0) > MAX_VIDEO_SECONDS) notes2.push(CLIENT_MESSAGES.videoLongo(file.name))
      else next.push(file)
    }
    onVideos(next)
    setVideoNotes(notes2)
  }

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="type-label text-text">Fotos e vídeos (opcional)</legend>
      <p className="type-label text-muted">
        Até {MAX_AD_PHOTOS} fotos JPG, PNG ou WebP (15 MB cada) e até {MAX_AD_VIDEOS} vídeos MP4 ou MOV (100 MB e {MAX_VIDEO_SECONDS} segundos
        cada). A primeira foto é a capa. Na área aberta, só uma foto desfocada aparece. Você também pode adicionar depois, editando o anúncio.
      </p>
      {notes.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-lg border border-danger px-4 py-2 text-body text-text">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="escolher-fotos" className="type-label text-text">
          Escolher fotos ({photos.length} de {MAX_AD_PHOTOS})
        </label>
        <input
          id="escolher-fotos"
          type="file"
          accept="image/*"
          multiple
          className={fileInput}
          onChange={(e) => {
            void pickPhotos(e.currentTarget.files)
            e.currentTarget.value = ''
          }}
        />
        {photos.length > 0 && (
          <ul aria-label="Fotos escolhidas" className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((f, i) => (
              <Preview key={`${f.name}-${f.size}-${f.lastModified}-${i}`} file={f} kind="foto" index={i} onRemove={() => onPhotos(photos.filter((_, j) => j !== i))} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="escolher-videos" className="type-label text-text">
          Escolher vídeos ({videos.length} de {MAX_AD_VIDEOS})
        </label>
        <input
          id="escolher-videos"
          type="file"
          accept="video/*"
          multiple
          className={fileInput}
          onChange={(e) => {
            void pickVideos(e.currentTarget.files)
            e.currentTarget.value = ''
          }}
        />
        {videos.length > 0 && (
          <ul aria-label="Vídeos escolhidos" className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {videos.map((f, i) => (
              <Preview key={`${f.name}-${f.size}-${f.lastModified}-${i}`} file={f} kind="video" index={i} onRemove={() => onVideos(videos.filter((_, j) => j !== i))} />
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  )
}
