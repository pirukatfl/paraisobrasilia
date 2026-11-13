'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { FieldError, Required, inputClass } from '@/components/classisex/AdFormFields'
import { TextoRico } from '@/components/TextoRico'
import { Toast } from '@/components/Toast'
import { CLIENT_MESSAGES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES } from '@/lib/classisex/media-messages'
import {
  APELIDO_MAX,
  ENVIO_MIDIA_MESSAGES,
  MAX_FOTOS,
  MAX_FOTO_BYTES,
  MAX_VIDEOS,
  MAX_VIDEO_BYTES,
  MENSAGEM_MAX,
} from '@/lib/midia-enviada/regras'
import type { Textos } from '@/lib/textos/areas'
import { enviarComProgresso, mensagemDeStatus } from '@/lib/midia-enviada/enviar-com-progresso'
import { preencher } from '@/lib/textos/preencher'
import { textoPuro } from '@/lib/textos/rico'

const checkbox = 'mt-1 size-5 shrink-0 accent-accent'

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}
const typeOf = (file: File) => file.type || EXTENSION_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] || ''
const isVideo = (file: File) => VIDEO_MIME_TYPES.includes(typeOf(file))

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`

type Values = { apelido: string; contato: string; mensagem: string }
const EMPTY: Values = { apelido: '', contato: '', mensagem: '' }

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Open form of /enviar-fotos-e-videos (client decision 2026-11-01). Without JavaScript it is a plain multipart
 * POST (303 back with ?erro=); with JavaScript the first file goes with the text and the rest one by one (a
 * 250 MB video cannot travel with ten photos), with progress. The server decides every rule again.
 */
export function MidiaEnvioForm({
  erro,
  textos: t,
  participando = false,
}: {
  erro?: string
  textos: Textos<'enviarMidia'>
  /** Arrived through the home promotion and it is on: the contact must be an e-mail and the server is told (which checks again) */
  participando?: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>(erro ? { form: erro } : {})
  const [values, setValues] = useState<Values>(EMPTY)
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [percent, setPercent] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const key = JSON.stringify(values)

  function pick(list: FileList | null) {
    const picked = Array.from(list ?? [])
    if (inputRef.current) inputRef.current.value = '' // the state below is the source of truth with JavaScript
    if (picked.length === 0) return
    const next = [...files]
    const notes: string[] = []
    let fotos = next.filter((f) => !isVideo(f)).length
    let videos = next.filter(isVideo).length
    for (const file of picked) {
      const type = typeOf(file)
      if (VIDEO_MIME_TYPES.includes(type)) {
        if (file.size > MAX_VIDEO_BYTES) notes.push(CLIENT_MESSAGES.videoGrande(file.name))
        else if (videos >= MAX_VIDEOS) notes.push(CLIENT_MESSAGES.videosMax(MAX_VIDEOS))
        else {
          next.push(file)
          videos += 1
        }
      } else if (PHOTO_MIME_TYPES.includes(type)) {
        if (file.size > MAX_FOTO_BYTES) notes.push(CLIENT_MESSAGES.fotoGrande(file.name))
        else if (fotos >= MAX_FOTOS) notes.push(CLIENT_MESSAGES.fotosMax(MAX_FOTOS))
        else {
          next.push(file)
          fotos += 1
        }
      } else {
        notes.push(`"${file.name}" não é uma foto (JPG, PNG, WebP) nem um vídeo (MP4, MOV).`)
      }
    }
    setFiles(next)
    setNote(notes.length > 0 ? [...new Set(notes)].join(' ') : null)
    setErrors((e) => ({ ...e, arquivos: '' }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    data.delete('arquivos')
    if (files.length === 0) {
      setErrors({ arquivos: ENVIO_MIDIA_MESSAGES.semArquivo })
      return
    }
    data.append('arquivos', files[0]!)
    setPending(true)
    setProgress(preencher(textoPuro(t.progresso), { n: 1, total: files.length }))
    try {
      setPercent(0)
      const response = await enviarComProgresso('/enviar-fotos-e-videos/enviar', data, (f) => setPercent(Math.round(f * 100)))
      const json = (response.json ?? { ok: false, errors: { form: mensagemDeStatus(response.status) } }) as {
        ok: boolean
        token?: string | null
        redirect?: string
        errors?: Record<string, string>
      }
      if (!json.ok || !json.redirect) {
        setValues({
          apelido: field(data, 'apelido'),
          contato: field(data, 'contato'),
          mensagem: field(data, 'mensagem'),
        })
        const next = json.errors ?? { form: 'Não foi possível enviar agora. Tente de novo.' }
        setErrors(next)
        setToast(Object.values(next).find(Boolean) ?? null)
        requestAnimationFrame(() => {
          const first = Object.keys(next)[0]
          const target =
            first === 'form' || !first
              ? formRef.current?.querySelector<HTMLElement>('[role="alert"]')
              : formRef.current?.querySelector<HTMLElement>(`[name="${first}"], #erro-${first}`)
          target?.focus?.()
        })
        return
      }
      // The rest, one by one, with the token of the submission just created
      let failures = 0
      if (json.token) {
        for (let i = 1; i < files.length; i += 1) {
          setProgress(preencher(textoPuro(t.progresso), { n: i + 1, total: files.length }))
          setPercent(0)
          const part = new FormData()
          part.append('token', json.token)
          part.append('arquivo', files[i]!)
          try {
            const res = await enviarComProgresso('/enviar-fotos-e-videos/arquivo', part, (f) => setPercent(Math.round(f * 100)))
            const body = res.json as { ok?: boolean; errors?: Record<string, string> } | null
            if (!body?.ok) {
              failures += 1
              setToast(Object.values(body?.errors ?? {}).find(Boolean) ?? mensagemDeStatus(res.status))
            }
          } catch {
            failures += 1
            setToast('Sem conexão. Confira a internet e tente de novo.')
          }
        }
      }
      const separador = json.redirect.includes('?') ? '&' : '?'
      router.push(failures > 0 ? `${json.redirect}${separador}falhas=${Math.min(failures, 99)}` : json.redirect)
    } catch {
      const offline = 'Sem conexão. Confira a internet e tente de novo.'
      setErrors({ form: offline })
      setToast(offline)
    } finally {
      setPending(false)
      setProgress(null)
    }
  }

  const described = (name: string, help?: string) => [help, errors[name] ? `erro-${name}` : ''].filter(Boolean).join(' ')

  return (
    <form
      ref={formRef}
      action="/enviar-fotos-e-videos/enviar"
      method="post"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      className="mt-6 flex max-w-[560px] flex-col gap-6"
      noValidate
    >
      {errors.form && (
        <p role="alert" tabIndex={-1} className="rounded-lg border border-danger px-4 py-2 text-body text-text">
          {errors.form}
        </p>
      )}

      {participando && <input type="hidden" name="promocao" value="1" />}

      {/* The key re-mounts the uncontrolled fields with the values the server just refused; the file list sits outside it so the chosen files survive a refusal */}
      <div key={key} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="apelido" className="type-label text-text">
            <TextoRico valor={t.apelidoRotulo} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </label>
          <input
            id="apelido"
            name="apelido"
            type="text"
            maxLength={APELIDO_MAX}
            autoComplete="off"
            defaultValue={values.apelido}
            aria-describedby={described('apelido', 'ajuda-apelido')}
            className={inputClass}
          />
          <p id="ajuda-apelido" className="type-label text-muted">
            <TextoRico valor={t.apelidoAjuda} linha />
          </p>
          <FieldError id="erro-apelido" message={errors.apelido} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="contato" className="type-label text-text">
            <TextoRico valor={participando ? t.promocaoContatoRotulo : t.contatoRotulo} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </label>
          <input
            id="contato"
            name="contato"
            type={participando ? 'email' : 'text'}
            inputMode="email"
            autoComplete={participando ? 'email' : 'off'}
            maxLength={254}
            defaultValue={values.contato}
            aria-describedby={described('contato', 'ajuda-contato')}
            className={inputClass}
          />
          <p id="ajuda-contato" className="type-label text-muted">
            <TextoRico valor={participando ? t.promocaoContatoAjuda : t.contatoAjuda} linha />
          </p>
          <FieldError id="erro-contato" message={errors.contato} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="mensagem" className="type-label text-text">
            <TextoRico valor={t.mensagemRotulo} linha />
          </label>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={4}
            maxLength={MENSAGEM_MAX}
            defaultValue={values.mensagem}
            aria-describedby={described('mensagem', 'ajuda-mensagem')}
            className="min-h-24 rounded-lg border border-line bg-surface px-4 py-3 text-body text-text focus:border-accent"
          />
          <p id="ajuda-mensagem" className="type-label text-muted">
            <TextoRico valor={t.mensagemAjuda} linha />
          </p>
          <FieldError id="erro-mensagem" message={errors.mensagem} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="arquivos" className="type-label text-text">
          <TextoRico valor={t.arquivosRotulo} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
        </label>
        <TextoRico
          id="ajuda-arquivos"
          valor={t.arquivosAjuda}
          vars={{ fotos: MAX_FOTOS, videos: MAX_VIDEOS }}
          className="type-label text-muted"
        />
        <input
          ref={inputRef}
          id="arquivos"
          name="arquivos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.mp4,.mov"
          onChange={(e) => pick(e.target.files)}
          aria-describedby={described('arquivos', 'ajuda-arquivos')}
          className="type-label text-text file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface file:px-4 file:text-text hover:file:border-accent"
        />
        {files.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label={textoPuro(t.arquivosRotulo)}>
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-body">
                <span className="min-w-0 truncate">
                  {file.name} <span className="text-muted">({isVideo(file) ? 'vídeo' : 'foto'}, {megabytes(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
                  aria-label={`${textoPuro(t.arquivosTirar)}: ${file.name}`}
                  className="type-label min-h-11 shrink-0 px-2 text-muted underline-offset-4 hover:underline"
                >
                  <TextoRico valor={t.arquivosTirar} linha />
                </button>
              </li>
            ))}
          </ul>
        )}
        {note && (
          <p role="status" className="type-label text-muted">
            {note}
          </p>
        )}
        <FieldError id="erro-arquivos" message={errors.arquivos} />
      </div>

      {/* Honeypot: people never see or fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="midia-website">Não preencha este campo</label>
        <input id="midia-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="maior18" value="sim" className={checkbox} aria-describedby={errors.maior18 ? 'erro-maior18' : undefined} />
          <span>
            <TextoRico valor={t.maior18} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </span>
        </label>
        <FieldError id="erro-maior18" message={errors.maior18} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input
            type="checkbox"
            name="autorizacao"
            value="sim"
            className={checkbox}
            aria-describedby={errors.autorizacao ? 'erro-autorizacao' : undefined}
          />
          <span>
            <TextoRico valor={t.autorizacao} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </span>
        </label>
        <FieldError id="erro-autorizacao" message={errors.autorizacao} />
      </div>

      <TextoRico valor={t.aviso} role="note" className="rounded-lg border border-line px-4 py-2 text-body" />

      {progress && (
        <div role="status" className="flex flex-col gap-2">
          <p className="type-label text-text">
            {progress} <span className="tabular-nums text-muted">{percent}%</span>
          </p>
          <div
            role="progressbar"
            aria-label="Progresso do envio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 w-full overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <TextoRico valor={t.botaoEnviando} linha /> : <TextoRico valor={participando ? t.promocaoBotao : t.botao} linha />}
      </button>
      <Toast message={toast} onClose={() => setToast(null)} />
    </form>
  )
}
