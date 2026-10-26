'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { AdFormFields, FieldError, Required, inputClass } from './AdFormFields'
import { VisitorPhotoPicker } from './VisitorPhotoPicker'

import type { AdFormValues } from '@/lib/classisex/actions'
import { mensagemDaResposta, mensagemDeFalhaDeRede } from '@/lib/errors'
import type { Textos } from '@/lib/textos/areas'

const checkbox = 'mt-1 size-5 shrink-0 accent-accent'

const EMPTY: AdFormValues = { apelido: '', euSou: '', cidade: '', texto: '', whatsapp: '', telegram: '' }

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Open form of /classisex/anunciar for people without an account (client decision 2026-10-23, S-01).
 * The same ad fields as the subscriber form (AdFormFields) plus e-mail, terms, a hidden honeypot and ONE
 * photo. Without JavaScript it is a plain multipart POST (303 back with ?erro=); with JavaScript it posts with
 * fetch and keeps what was typed when the server refuses. The server decides every limit again.
 */
export function VisitorAdForm({
  textos: t,
  campos,
  categories,
  erro,
}: {
  /** Texts of the ClassiSex area (from the server page) */
  textos: Textos<'classisex'>
  /** Texts of the shared ad fields (Meus anúncios area) */
  campos: Textos<'meusAnuncios'>
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

  const fieldsKey = JSON.stringify([values, email])

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
      // A proxy answer (413, 502) is not JSON: the status then tells the reason
      const json = (await response.json().catch(() => null)) as { ok: boolean; redirect?: string; errors?: Record<string, string> } | null
      if (json?.ok && json.redirect) {
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
      const next = json?.errors ?? { form: `Não foi possível enviar o anúncio: ${mensagemDaResposta(response.status, json)}` }
      setErrors(next)
      requestAnimationFrame(() => {
        const first = Object.keys(next)[0]
        const target =
          first === 'form' || !first
            ? formRef.current?.querySelector<HTMLElement>('[role="alert"]')
            : formRef.current?.querySelector<HTMLElement>(`[name="${first === 'consent' ? 'consent' : first}"], #erro-${first}`)
        target?.focus?.()
      })
    } catch (err) {
      setErrors({ form: mensagemDeFalhaDeRede(err) })
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      ref={formRef}
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

      {/* The key re-mounts the uncontrolled fields with the values the server just refused; the photo picker sits outside it so the chosen photo survives a refusal */}
      <AdFormFields key={fieldsKey} textos={campos} categories={categories} values={values} errors={errors} />

      <div key={fieldsKey} className="flex flex-col gap-2">
        <label htmlFor="email" className="type-label text-text">
          {t.visitanteEmailRotulo}
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
          {t.visitanteEmailAjuda}
        </p>
        <FieldError id="erro-email" message={errors.email} />
      </div>

      <VisitorPhotoPicker
        error={errors.foto}
        label={t.fotoRotulo}
        help={t.fotoAjuda}
        choose={t.fotoEscolher}
        change={t.fotoTrocar}
        remove={t.fotoTirar}
      />

      {/* Honeypot: people never see or fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="vis-website">Não preencha este campo</label>
        <input id="vis-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="termos" value="sim" className={checkbox} aria-describedby={errors.termos ? 'erro-termos' : undefined} />
          <span>
            {t.visitanteTermosAntes}{' '}
            <Link href="/termos-de-uso" className="text-accent underline underline-offset-4">
              {t.visitanteTermosLink}
            </Link>{' '}
            {t.visitanteTermosE}{' '}
            <Link href="/politica-de-privacidade" className="text-accent underline underline-offset-4">
              {t.visitanteTermosPolitica}
            </Link>{' '}
            <Required texto={t.visitanteObrigatorio} />
          </span>
        </label>
        <FieldError id="erro-termos" message={errors.termos} />
      </div>

      <p role="note" className="rounded-lg border border-line px-4 py-2 text-body">
        {t.visitanteAvisoAntes}{' '}
        <Link href="/cadastro" className="text-accent underline underline-offset-4">
          {t.visitanteAvisoLink}
        </Link>{' '}
        {t.visitanteAvisoDepois}
      </p>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t.visitanteBotaoEnviando : t.visitanteBotao}
      </button>
    </form>
  )
}
