'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { FieldError, Required, inputClass } from '@/components/classisex/AdFormFields'
import { VisitorPhotoPicker } from '@/components/classisex/VisitorPhotoPicker'
import { ASSINADO_MAX, TEXTO_MAX, TEXTO_MIN, TITLE_MAX } from '@/lib/contos/envio-rules'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

const checkbox = 'mt-1 size-5 shrink-0 accent-accent'

type Values = { title: string; assinadoComo: string; texto: string; email: string }
const EMPTY: Values = { title: '', assinadoComo: '', texto: '', email: '' }

const field = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Open form of /contos/enviar (client decision 2026-10-24). Without JavaScript it is a plain multipart POST
 * (303 back with ?erro=); with JavaScript it posts with fetch and keeps what was typed when the server
 * refuses. The server decides every rule again.
 */
export function ContoEnvioForm({ erro, textos: t }: { erro?: string; textos: Textos<'enviarConto'> }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>(erro ? { form: erro } : {})
  const [values, setValues] = useState<Values>(EMPTY)
  const [pending, setPending] = useState(false)

  const key = JSON.stringify(values)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    setPending(true)
    try {
      const response = await fetch('/contos/enviar/enviar', {
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
        title: field(data, 'title'),
        assinadoComo: field(data, 'assinadoComo'),
        texto: field(data, 'texto'),
        email: field(data, 'email'),
      })
      const next = json.errors ?? { form: 'Não foi possível enviar agora. Tente de novo.' }
      setErrors(next)
      requestAnimationFrame(() => {
        const first = Object.keys(next)[0]
        const target =
          first === 'form' || !first
            ? formRef.current?.querySelector<HTMLElement>('[role="alert"]')
            : formRef.current?.querySelector<HTMLElement>(`[name="${first}"], #erro-${first}`)
        target?.focus?.()
      })
    } catch {
      setErrors({ form: 'Sem conexão. Confira a internet e tente de novo.' })
    } finally {
      setPending(false)
    }
  }

  const described = (name: string, help?: string) => [help, errors[name] ? `erro-${name}` : ''].filter(Boolean).join(' ')

  return (
    <form
      ref={formRef}
      action="/contos/enviar/enviar"
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

      {/* The key re-mounts the uncontrolled fields with the values the server just refused; the image picker sits outside it so the chosen file survives a refusal */}
      <div key={key} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="type-label text-text">
            <TextoRico valor={t.tituloRotulo} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={TITLE_MAX}
            autoComplete="off"
            defaultValue={values.title}
            aria-describedby={described('title') || undefined}
            className={inputClass}
          />
          <FieldError id="erro-title" message={errors.title} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="assinadoComo" className="type-label text-text">
            <TextoRico valor={t.assinadoRotulo} linha />
          </label>
          <input
            id="assinadoComo"
            name="assinadoComo"
            type="text"
            maxLength={ASSINADO_MAX}
            autoComplete="off"
            defaultValue={values.assinadoComo}
            aria-describedby={described('assinadoComo', 'ajuda-assinado')}
            className={inputClass}
          />
          <p id="ajuda-assinado" className="type-label text-muted">
            <TextoRico valor={t.assinadoAjuda} linha />
          </p>
          <FieldError id="erro-assinadoComo" message={errors.assinadoComo} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="texto" className="type-label text-text">
            <TextoRico valor={t.contoRotulo} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </label>
          <textarea
            id="texto"
            name="texto"
            rows={14}
            minLength={TEXTO_MIN}
            maxLength={TEXTO_MAX}
            defaultValue={values.texto}
            aria-describedby={described('texto', 'ajuda-texto')}
            className="min-h-60 rounded-lg border border-line bg-surface px-4 py-3 text-body text-text focus:border-accent"
          />
          <TextoRico
            id="ajuda-texto"
            valor={t.contoAjuda}
            vars={{ min: TEXTO_MIN, max: TEXTO_MAX.toLocaleString('pt-BR') }}
            className="type-label text-muted"
          />
          <FieldError id="erro-texto" message={errors.texto} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="type-label text-text">
            <TextoRico valor={t.emailRotulo} linha />
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email}
            aria-describedby={described('email', 'ajuda-email')}
            className={inputClass}
          />
          <p id="ajuda-email" className="type-label text-muted">
            <TextoRico valor={t.emailAjuda} linha />
          </p>
          <FieldError id="erro-email" message={errors.email} />
        </div>
      </div>

      <VisitorPhotoPicker
        name="imagem"
        noun="imagem"
        error={errors.imagem}
        label={<TextoRico valor={t.imagemRotulo} linha />}
        help={t.imagemAjuda}
        choose={<TextoRico valor={t.imagemEscolher} linha />}
        change={<TextoRico valor={t.imagemTrocar} linha />}
        remove={<TextoRico valor={t.imagemTirar} linha />}
      />

      {/* Honeypot: people never see or fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="conto-website">Não preencha este campo</label>
        <input id="conto-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="consent" value="sim" className={checkbox} aria-describedby={errors.consent ? 'erro-consent' : undefined} />
          <span>
            <TextoRico valor={t.consentimento} linha /> <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </span>
        </label>
        <FieldError id="erro-consent" message={errors.consent} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="termos" value="sim" className={checkbox} aria-describedby={errors.termos ? 'erro-termos' : undefined} />
          <span>
            <TextoRico valor={t.termosAntes} linha />{' '}
            <Link href="/termos-de-uso" className="text-accent underline underline-offset-4">
              <TextoRico valor={t.termosLink} linha />
            </Link>{' '}
            <TextoRico valor={t.termosE} linha />{' '}
            <Link href="/politica-de-privacidade" className="text-accent underline underline-offset-4">
              <TextoRico valor={t.termosPolitica} linha />
            </Link>{' '}
            <Required texto={<TextoRico valor={t.obrigatorio} linha />} />
          </span>
        </label>
        <FieldError id="erro-termos" message={errors.termos} />
      </div>

      <TextoRico valor={t.aviso} role="note" className="rounded-lg border border-line px-4 py-2 text-body" />

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <TextoRico valor={t.botaoEnviando} linha /> : <TextoRico valor={t.botao} linha />}
      </button>
    </form>
  )
}
