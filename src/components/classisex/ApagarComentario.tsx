'use client'

import { useActionState } from 'react'

import { apagarComentario } from '@/lib/classisex/comentarios/actions'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

/** "Apagar" on the person's own comment, with a confirmation step (native <details>, works without JS). */
export function ApagarComentario({
  adId,
  comentarioId,
  textos: t,
}: {
  adId: number
  comentarioId: number
  textos: Pick<Textos<'classisex'>, 'comentarioApagar' | 'comentarioApagarPergunta' | 'comentarioApagarConfirmar'>
}) {
  const [state, formAction, pending] = useActionState(apagarComentario, null)
  return (
    <details>
      <summary className="type-label inline-flex min-h-11 cursor-pointer list-none items-center text-muted underline underline-offset-4 hover:text-accent [&::-webkit-details-marker]:hidden">
        <TextoRico valor={t.comentarioApagar} linha />
      </summary>
      <form action={formAction} className="mt-1 flex max-w-[560px] flex-col gap-3 rounded-lg border border-line px-4 py-3">
        <input type="hidden" name="anuncio" value={adId} />
        <input type="hidden" name="comentario" value={comentarioId} />
        <p className="text-body text-text"><TextoRico valor={t.comentarioApagarPergunta} linha /></p>
        {state && !state.ok && (
          <p role="alert" className="text-body text-danger">
            {state.message}
          </p>
        )}
        <div>
          <button type="submit" disabled={pending} className="btn-secondary">
            <TextoRico valor={t.comentarioApagarConfirmar} linha />
          </button>
        </div>
      </form>
    </details>
  )
}
