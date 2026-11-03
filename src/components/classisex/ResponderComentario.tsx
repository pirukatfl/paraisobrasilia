'use client'

import { useId, useState } from 'react'

import { ComentarioForm, type ComentarioFormTextos } from '@/components/classisex/ComentarioForm'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

/** "Responder": opens the reply form under the comment, closes it after sending. */
export function ResponderComentario({
  adId,
  comentarioId,
  apelidoInicial,
  textos: t,
  visitante = false,
}: {
  adId: number
  comentarioId: number
  apelidoInicial: string
  textos: ComentarioFormTextos & Pick<Textos<'classisex'>, 'comentarioResponder'>
  /** Without an account: the inline form asks for a name. */
  visitante?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const painel = useId()
  return (
    <div>
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-expanded={false}
          aria-controls={painel}
          className="type-label inline-flex min-h-11 items-center text-muted underline underline-offset-4 hover:text-accent"
        >
          <TextoRico valor={t.comentarioResponder} linha />
        </button>
      )}
      {aberto && (
        <div id={painel} className="mt-2">
          <ComentarioForm
            adId={adId}
            respostaA={comentarioId}
            apelidoInicial={apelidoInicial}
            textos={t}
            onSent={() => setAberto(false)}
            onCancel={() => setAberto(false)}
            entrarHref={visitante ? '' : undefined}
          />
        </div>
      )}
    </div>
  )
}
