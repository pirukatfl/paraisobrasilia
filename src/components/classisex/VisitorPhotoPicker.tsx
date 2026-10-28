'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { FieldError } from './AdFormFields'

import type { TextoRico as EstadoRico } from '@/lib/textos/rico'
import { CLIENT_MESSAGES, MAX_AD_PHOTO_BYTES, PHOTO_MIME_TYPES } from '@/lib/classisex/media-messages'
import { TextoRico } from '@/components/TextoRico'

const EXTENSION_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

const typeOf = (file: File) => file.type || EXTENSION_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] || ''

/**
 * The single photo of the open form. A real `<input type=file name=foto>` (so the plain multipart POST works
 * without JavaScript), visually hidden and driven by a button-styled label, with a preview and the file name.
 * Limits are checked here for fast feedback; the server decides again.
 */
export function VisitorPhotoPicker({
  error,
  label,
  name = 'foto',
  noun = 'foto',
  help,
  choose,
  change,
  remove,
}: {
  error?: string
  label: ReactNode
  name?: string
  /** Word used only in the preview alt text: 'foto' or 'imagem' */
  noun?: string
  help: EstadoRico
  /** Button texts (editable in the panel) */
  choose: ReactNode
  change: ReactNode
  remove: ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])

  function clear() {
    if (inputRef.current) inputRef.current.value = ''
    setFile(null)
  }

  function onChange(list: FileList | null) {
    const picked = list?.[0]
    if (!picked) return clear()
    if (!PHOTO_MIME_TYPES.includes(typeOf(picked))) {
      clear()
      setNote(CLIENT_MESSAGES.fotoTipo(picked.name))
    } else if (picked.size > MAX_AD_PHOTO_BYTES) {
      clear()
      setNote(CLIENT_MESSAGES.fotoGrande(picked.name))
    } else {
      setNote(null)
      setFile(picked)
    }
  }

  const shown = note ?? error
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-text">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onChange(e.currentTarget.files)}
          aria-describedby={['ajuda-foto', shown ? 'erro-foto' : ''].filter(Boolean).join(' ')}
          className="peer sr-only"
        />
        <label
          htmlFor={name}
          className="btn-secondary cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        >
          {file ? change : choose}
        </label>
        {file && (
          <button type="button" onClick={clear} className="type-label text-danger underline underline-offset-4">
            {remove}
          </button>
        )}
      </div>
      {file && url && (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, never the Next image optimizer */}
          <img src={url} alt={`Prévia da ${noun} escolhida`} className="size-24 rounded object-cover" />
          <p className="type-label min-w-0 break-all text-muted">{file.name}</p>
        </div>
      )}
      <TextoRico id="ajuda-foto" valor={help} className="type-label text-muted" />
      <FieldError id="erro-foto" message={shown ?? undefined} />
    </div>
  )
}
