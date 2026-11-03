'use client'

import Link from 'next/link'
import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { comentar } from '@/lib/classisex/comentarios/actions'
import { COMENTARIO_MAX } from '@/lib/classisex/comentarios/rules'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

export type ComentarioFormTextos = Pick<
  Textos<'classisex'>,
  | 'comentarioRotuloApelido'
  | 'comentarioApelidoAjuda'
  | 'comentarioRotuloTexto'
  | 'comentarioBotao'
  | 'comentarioBotaoResponder'
  | 'comentarioBotaoEnviando'
  | 'comentarioBotaoCancelar'
  | 'comentarioRotuloNome'
  | 'comentarioAvisoVisitante'
  | 'comentarioTemConta'
  | 'comentarioTemContaLink'
>

const inputClass = 'min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text'

/**
 * "Comentar" (new thread) and "Responder" (inline under a comment). Validation runs on the server
 * (comentar): the typed values come back on an error, and the form clears itself on success.
 * The author is the session's account; only the ad, the comment answered, the nickname and the text
 * are sent. For someone without an account (`entrarHref` set) the name starts empty, a hidden
 * honeypot is added and a short notice explains that contacts only show to subscribers.
 */
export function ComentarioForm({
  adId,
  respostaA,
  apelidoInicial,
  textos: t,
  onSent,
  onCancel,
  entrarHref,
}: {
  adId: number
  /** Id of the root comment being answered (omitted for a new comment). */
  respostaA?: number
  apelidoInicial: string
  textos: ComentarioFormTextos
  onSent?: () => void
  onCancel?: () => void
  /** Set only for a visitor: `/entrar?next=…`. Shows the "Tem conta?" line under the button of a new comment. */
  entrarHref?: string
}) {
  const [state, formAction, pending] = useActionState(comentar, null)
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()
  const [length, setLength] = useState(0)
  const reply = respostaA !== undefined
  const visitante = entrarHref !== undefined
  const erro = state && !state.ok ? state.message : null

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      onSent?.()
    }
    // `sent` changes on every success; onSent is a stable closure of the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.sent])

  return (
    <form ref={formRef} action={formAction} onReset={() => setLength(0)} className="flex max-w-[560px] flex-col gap-4" noValidate>
      <input type="hidden" name="anuncio" value={adId} />
      {reply && <input type="hidden" name="resposta" value={respostaA} />}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-apelido`} className="type-label text-text">
          <TextoRico valor={visitante ? t.comentarioRotuloNome : t.comentarioRotuloApelido} linha />
        </label>
        <input
          id={`${uid}-apelido`}
          name="apelido"
          type="text"
          required
          maxLength={40}
          autoComplete="off"
          defaultValue={state?.values?.apelido ?? apelidoInicial}
          aria-describedby={`${uid}-apelido-ajuda`}
          className={`${inputClass} sm:max-w-[320px]`}
        />
        <TextoRico id={`${uid}-apelido-ajuda`} valor={t.comentarioApelidoAjuda} className="type-label font-normal text-muted" />
      </div>
      {visitante && (
        // Honeypot: people never see or fill it
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${uid}-website`}>Não preencha este campo</label>
          <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-texto`} className="type-label text-text">
          <TextoRico valor={t.comentarioRotuloTexto} linha />
        </label>
        <textarea
          id={`${uid}-texto`}
          name="texto"
          rows={reply ? 3 : 4}
          required
          maxLength={COMENTARIO_MAX}
          defaultValue={state?.values?.texto ?? ''}
          onChange={(e) => setLength(e.target.value.length)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${uid}-erro` : undefined}
          className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text"
        />
        <p className="type-label font-normal text-muted" data-numeric aria-live="off">
          {length}/{COMENTARIO_MAX}
        </p>
        {visitante && <TextoRico valor={t.comentarioAvisoVisitante} className="type-label font-normal text-muted" />}
      </div>
      {erro && (
        <p id={`${uid}-erro`} role="alert" className="text-body text-danger">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? (
            <TextoRico valor={t.comentarioBotaoEnviando} linha />
          ) : (
            <TextoRico valor={reply ? t.comentarioBotaoResponder : t.comentarioBotao} linha />
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            <TextoRico valor={t.comentarioBotaoCancelar} linha />
          </button>
        )}
      </div>
      {visitante && !reply && (
        <p className="type-label font-normal text-muted">
          <TextoRico valor={t.comentarioTemConta} linha />{' '}
          <Link href={entrarHref} className="font-semibold text-accent underline underline-offset-4">
            <TextoRico valor={t.comentarioTemContaLink} linha />
          </Link>
        </p>
      )}
    </form>
  )
}
