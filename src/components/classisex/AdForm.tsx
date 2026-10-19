'use client'

import { useActionState } from 'react'

import type { AdFormState, AdFormValues } from '@/lib/classisex/actions'

export const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'

const inputClass =
  'min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="type-label text-danger">
      {message}
    </p>
  )
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
}: {
  action: (state: AdFormState, formData: FormData) => Promise<AdFormState>
  categories: { id: number; name: string }[]
  initial: AdFormValues
  adId?: number
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const values = state?.values ?? initial
  const errors = state?.errors ?? {}
  const described = (key: string) => (errors[key] ? `erro-${key}` : undefined)

  return (
    <form action={formAction} className="mt-6 flex max-w-[560px] flex-col gap-6" noValidate>
      {adId !== undefined && <input type="hidden" name="id" value={adId} />}
      {errors.form && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-2 text-body text-text">
          {errors.form}
        </p>
      )}

      <fieldset className="flex flex-col gap-2" aria-describedby={described('euSou')}>
        <legend className="type-label text-text">Eu sou</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {categories.map((c) => (
            <label key={c.id} className="inline-flex min-h-11 items-center gap-2 text-body">
              <input
                type="radio"
                name="euSou"
                value={c.id}
                defaultChecked={values.euSou === String(c.id)}
                className="size-5 accent-accent"
              />
              {c.name}
            </label>
          ))}
        </div>
        <FieldError id="erro-euSou" message={errors.euSou} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="cidade" className="type-label text-text">
          Cidade (opcional)
        </label>
        <input
          id="cidade"
          name="cidade"
          type="text"
          maxLength={60}
          autoComplete="address-level2"
          defaultValue={values.cidade}
          aria-describedby={described('cidade')}
          className={inputClass}
        />
        <FieldError id="erro-cidade" message={errors.cidade} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="texto" className="type-label text-text">
          Texto do anúncio
        </label>
        <textarea
          id="texto"
          name="texto"
          rows={6}
          maxLength={600}
          defaultValue={values.texto}
          aria-describedby={['ajuda-texto', described('texto')].filter(Boolean).join(' ')}
          className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text focus:border-accent"
        />
        <p id="ajuda-texto" className="type-label text-muted">
          Até 600 caracteres. Coloque o contato nos campos abaixo: só assinantes veem.
        </p>
        <FieldError id="erro-texto" message={errors.texto} />
      </div>

      <fieldset className="flex flex-col gap-4" aria-describedby={described('contato')}>
        <legend className="type-label text-text">Contato (pelo menos um; só assinantes veem)</legend>
        <FieldError id="erro-contato" message={errors.contato} />
        <div className="flex flex-col gap-2">
          <label htmlFor="whatsapp" className="type-label text-text">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="5561999998888"
            defaultValue={values.whatsapp}
            aria-describedby={described('whatsapp')}
            className={inputClass}
          />
          <FieldError id="erro-whatsapp" message={errors.whatsapp} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="telegram" className="type-label text-text">
            Telegram
          </label>
          <input
            id="telegram"
            name="telegram"
            type="text"
            autoComplete="off"
            placeholder="@seuusuario"
            defaultValue={values.telegram}
            aria-describedby={described('telegram')}
            className={inputClass}
          />
          <FieldError id="erro-telegram" message={errors.telegram} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="type-label text-text">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email}
            aria-describedby={described('email')}
            className={inputClass}
          />
          <FieldError id="erro-email" message={errors.email} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-body">
          <input
            type="checkbox"
            name="consent"
            value="sim"
            aria-describedby={described('consent')}
            className="mt-1 size-5 shrink-0 accent-accent"
          />
          {DECLARACAO}
        </label>
        <FieldError id="erro-consent" message={errors.consent} />
      </div>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar para aprovação'}
      </button>
    </form>
  )
}
