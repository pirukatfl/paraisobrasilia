'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { AdFormFields, DECLARACAO } from './AdFormFields'
import { AdMediaPicker } from './AdMediaPicker'

import type { AdFormState, AdFormValues } from '@/lib/classisex/actions'

export { DECLARACAO }

const subscribe = () => () => {}

type Item = { file: File; tipo: 'foto' | 'video' }

/** One file per request to the owner route; resolves with the error code ('' = accepted). Reports byte progress. */
function uploadOne(adId: number, item: Item, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/area-do-assinante/meus-anuncios/${adId}/midia?tipo=${item.tipo}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onerror = () => resolve('rede')
    xhr.onload = () => {
      // The route answers 303 to the edit page with ?midia=…; XHR follows it and exposes the final URL
      if (xhr.status === 413) return resolve('grande')
      try {
        const url = new URL(xhr.responseURL)
        const midia = url.searchParams.get('midia')
        if (midia === `${item.tipo}-ok`) resolve('')
        else resolve(url.searchParams.get('codigo') || 'erro')
      } catch {
        resolve('erro')
      }
    }
    const body = new FormData()
    body.set('tipo', item.tipo)
    body.set('arquivo', item.file, item.file.name)
    xhr.send(body)
  })
}

/**
 * Ad form for Novo / Editar (D-01). Validation happens on the server (actions.ts); typed values
 * come back in the action state so nothing is lost on an error.
 */
export function AdForm({
  action,
  categories,
  initial,
  adId,
  withMedia = false,
  limits,
  legacy = false,
}: {
  action: (state: AdFormState, formData: FormData) => Promise<AdFormState>
  categories: { id: number; name: string }[]
  initial: AdFormValues
  adId?: number
  withMedia?: boolean
  /** Photos and videos per ad of the account's tier (the server decides again) */
  limits?: { fotos: number; videos: number }
  /** Old-site ad (2026-10-22): no 600-character cap, contact fields optional */
  legacy?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const router = useRouter()
  // File pickers need JavaScript (files go one by one to the media route), so they render after hydration only
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [progress, setProgress] = useState<{ index: number; total: number; fraction: number } | null>(null)
  const uploading = useRef(false)
  const hasFiles = photos.length + videos.length > 0

  const createdId = state?.createdId
  useEffect(() => {
    if (createdId === undefined || uploading.current) return
    uploading.current = true
    const items: Item[] = [...photos.map((file) => ({ file, tipo: 'foto' as const })), ...videos.map((file) => ({ file, tipo: 'video' as const }))]
    void (async () => {
      let ok = 0
      let failed = 0
      let code = ''
      for (const [i, item] of items.entries()) {
        setProgress({ index: i + 1, total: items.length, fraction: 0 })
        const result = await uploadOne(createdId, item, (fraction) => setProgress({ index: i + 1, total: items.length, fraction }))
        if (result === '') ok += 1
        else {
          failed += 1
          code ||= result
        }
      }
      const q = new URLSearchParams({ midia: 'lote', ok: String(ok), falhas: String(failed) })
      if (code) q.set('codigo', code)
      router.push(`/area-do-assinante/meus-anuncios/${createdId}/editar?${q.toString()}`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per created ad
  }, [createdId])
  const busy = pending || progress !== null
  const values = state?.values ?? initial
  const errors = state?.errors ?? {}

  return (
    <form action={formAction} className="mt-6 flex max-w-[560px] flex-col gap-6" noValidate>
      {adId !== undefined && <input type="hidden" name="id" value={adId} />}
      {errors.form && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-2 text-body text-text">
          {errors.form}
        </p>
      )}

      <AdFormFields categories={categories} values={values} errors={errors} legacy={legacy} />

      {withMedia && hydrated && (
        <>
          <input type="hidden" name="comMidia" value={hasFiles ? 'sim' : ''} />
          <AdMediaPicker photos={photos} videos={videos} onPhotos={setPhotos} onVideos={setVideos} disabled={busy} limits={limits} />
        </>
      )}

      {progress && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-body">
            Enviando arquivo {progress.index} de {progress.total} ({Math.round(progress.fraction * 100)}%). Não feche esta página.
          </p>
          <progress max={1} value={progress.fraction} aria-label="Progresso do envio" className="w-full" />
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={busy}>
        {progress ? 'Enviando arquivos…' : pending ? 'Enviando…' : 'Enviar para aprovação'}
      </button>
    </form>
  )
}
