'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { AdFormFields, FieldError, inputClass } from './AdFormFields'

import type { AdFormValues } from '@/lib/classisex/actions'

const checkbox = 'mt-1 size-5 shrink-0 accent-accent'

const EMPTY: AdFormValues = { apelido: '', euSou: '', cidade: '', texto: '', whatsapp: '', telegram: '' }

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Open form of /classisex/anunciar for people without an account (client decision 2026-10-23, S-01).
 * The same ad fields as the subscriber form (AdFormFields) plus e-mail, 18+, terms, a hidden honeypot and ONE
 * photo. Without JavaScript it is a plain multipart POST (303 back with ?erro=); with JavaScript it posts with
 * fetch and keeps what was typed when the server refuses. The server decides every limit again.
 */
export function VisitorAdForm({
  categories,
  erro,
}: {
  categories: { id: number; name: string }[]
  /** Form-level message from the no-JavaScript fallback (?erro=…) */
  erro?: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>(erro ? { form: erro } : {})
  const [values, setValues] = useState<AdFormValues>(EMPTY)
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    setPending(true)
    try {
      const response = await fetch('/classisex/anunciar/enviar', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      const json = (await response.json()) as { ok: boolean; redirect?: string; errors?: Record<string, string> }
      if (json.ok && json.redirect) {
        router.push(json.redirect)
        return
      }
      setValues({
        apelido: field(data, 'apelido'),
        euSou: field(data, 'euSou'),
        cidade: field(data, 'cidade'),
        texto: field(data, 'texto'),
        whatsapp: field(data, 'whatsapp'),
        telegram: field(data, 'telegram'),
      })
      setEmail(field(data, 'email'))
      const next = json.errors ?? { form: 'Não foi possível enviar agora. Tente de novo.' }
      setErrors(next)
      requestAnimationFrame(() => {
        const first = Object.keys(next)[0]
        const target =
          first === 'form' || !first
            ? formRef.current?.querySelector<HTMLElement>('[role="alert"]')
            : formRef.current?.querySelector<HTMLElement>(`[name="${first === 'consent' ? 'consent' : first}"], #erro-${first}`)
        target?.focus?.()
      })
    } catch {
      setErrors({ form: 'Sem conexão. Confira a internet e tente de novo.' })
    } finally {
      setPending(false)
    }
  }

  return (
    // The key re-mounts the uncontrolled fields with the values the server just refused
    <form
      ref={formRef}
      key={JSON.stringify(values)}
      action="/classisex/anunciar/enviar"
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

      <AdFormFields categories={categories} values={values} errors={errors} />

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="type-label text-text">
          Seu e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          aria-describedby={['ajuda-email', errors.email ? 'erro-email' : ''].filter(Boolean).join(' ')}
          className={inputClass}
        />
        <p id="ajuda-email" className="type-label text-muted">
          Só a equipe vê. Usamos para avisar quando o anúncio for publicado ou recusado.
        </p>
        <FieldError id="erro-email" message={errors.email} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="foto" className="type-label text-text">
          Foto (opcional)
        </label>
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={['ajuda-foto', errors.foto ? 'erro-foto' : ''].filter(Boolean).join(' ')}
          className="text-body"
        />
        <p id="ajuda-foto" className="type-label text-muted">
          Sem conta: 1 foto (JPG, PNG ou WebP, até 15 MB), sem vídeo. Assinantes enviam até 10 fotos e 2 vídeos.
        </p>
        <FieldError id="erro-foto" message={errors.foto} />
      </div>

      {/* Honeypot: people never see or fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="vis-website">Não preencha este campo</label>
        <input id="vis-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="maior18" value="sim" className={checkbox} aria-describedby={errors.maior18 ? 'erro-maior18' : undefined} />
          <span>Tenho 18 anos ou mais</span>
        </label>
        <FieldError id="erro-maior18" message={errors.maior18} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="termos" value="sim" className={checkbox} aria-describedby={errors.termos ? 'erro-termos' : undefined} />
          <span>
            Li e aceito os{' '}
            <Link href="/termos-de-uso" className="text-accent underline underline-offset-4">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/politica-de-privacidade" className="text-accent underline underline-offset-4">
              Política de Privacidade
            </Link>
          </span>
        </label>
        <FieldError id="erro-termos" message={errors.termos} />
      </div>

      <p role="note" className="rounded-lg border border-line px-4 py-2 text-body">
        Depois de enviar, não dá para editar nem apagar este anúncio.{' '}
        <Link href="/cadastro" className="text-accent underline underline-offset-4">
          Crie uma conta gratuita
        </Link>{' '}
        para editar e apagar seus anúncios.
      </p>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar para aprovação'}
      </button>
    </form>
  )
}
