'use client'

import { useActionState, useState } from 'react'

import type { MessageFormState } from '@/lib/mensagens/actions'
import { MESSAGE_MAX } from '@/lib/mensagens/rules'

const inputClass =
  'min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent'

/** Compose / reply form. Validation runs on the server; typed values come back on errors. */
export function MessageForm({
  action,
  hidden,
  askApelido = false,
  initialApelido = '',
  submitLabel,
  rows = 4,
}: {
  action: (state: MessageFormState, formData: FormData) => Promise<MessageFormState>
  hidden: Record<string, string>
  askApelido?: boolean
  initialApelido?: string
  submitLabel: string
  rows?: number
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const texto = state?.values.texto ?? ''
  const apelido = state?.values.apelido ?? initialApelido
  const [length, setLength] = useState(texto.length)

  return (
    <form action={formAction} className="mt-4 flex max-w-[560px] flex-col gap-5" noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-2 text-body text-text">
          {state.error}
        </p>
      )}
      {askApelido && (
        <div className="flex flex-col gap-2">
          <label htmlFor="apelido" className="type-label text-text">
            Seu apelido
          </label>
          <input
            id="apelido"
            name="apelido"
            type="text"
            required
            maxLength={40}
            autoComplete="off"
            defaultValue={apelido}
            aria-describedby="ajuda-apelido"
            className={inputClass}
          />
          <p id="ajuda-apelido" className="type-label text-muted">
            É o nome que a outra pessoa vê. Até 40 caracteres, sem telefone, e-mail, @ ou link.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="texto" className="type-label text-text">
          Mensagem
        </label>
        <textarea
          id="texto"
          name="texto"
          rows={rows}
          maxLength={MESSAGE_MAX}
          defaultValue={texto}
          onChange={(e) => setLength(e.target.value.length)}
          className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text focus:border-accent"
        />
        <p className="type-label text-muted" aria-live="polite">
          {length}/{MESSAGE_MAX}
        </p>
      </div>
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {pending ? 'Enviando…' : submitLabel}
      </button>
    </form>
  )
}
