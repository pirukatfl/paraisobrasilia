'use client'

import { useActionState, useState } from 'react'

import type { RecadoFormState, RecadoFormValues } from '@/lib/recados/actions'
import { RECADO_MAX } from '@/lib/recados/rules'

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

/** New recado form (REC-01, D-01). Validation happens on the server; typed values come back on errors. */
export function RecadoForm({
  action,
  initial,
}: {
  action: (state: RecadoFormState, formData: FormData) => Promise<RecadoFormState>
  initial: RecadoFormValues
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const values = state?.values ?? initial
  const errors = state?.errors ?? {}
  const [length, setLength] = useState(values.texto.length)

  return (
    <form action={formAction} className="mt-4 flex max-w-[560px] flex-col gap-6" noValidate>
      {errors.form && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-2 text-body text-text">
          {errors.form}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="apelido" className="type-label text-text">
          Seu apelido
        </label>
        <input
          id="apelido"
          name="apelido"
          type="text"
          maxLength={40}
          autoComplete="off"
          defaultValue={values.apelido}
          aria-describedby={['ajuda-apelido', errors.apelido ? 'erro-apelido' : ''].filter(Boolean).join(' ')}
          className={inputClass}
        />
        <p id="ajuda-apelido" className="type-label text-muted">
          Aparece para os assinantes. Até 40 caracteres, sem telefone, e-mail, @ ou link.
        </p>
        <FieldError id="erro-apelido" message={errors.apelido} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="texto" className="type-label text-text">
          Recado
        </label>
        <textarea
          id="texto"
          name="texto"
          rows={5}
          maxLength={RECADO_MAX}
          defaultValue={values.texto}
          onChange={(e) => setLength(e.target.value.length)}
          aria-describedby={['ajuda-texto', errors.texto ? 'erro-texto' : ''].filter(Boolean).join(' ')}
          className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text focus:border-accent"
        />
        <p id="ajuda-texto" className="type-label text-muted">
          Telefones, e-mails, @ e links são retirados. Para trocar contato, use Enviar mensagem.
        </p>
        <p className="type-label text-muted" aria-live="polite">
          {length}/{RECADO_MAX}
        </p>
        <FieldError id="erro-texto" message={errors.texto} />
      </div>
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar para aprovação'}
      </button>
    </form>
  )
}
