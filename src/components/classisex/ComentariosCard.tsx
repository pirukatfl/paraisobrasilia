import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import type { ComentarioDTO } from '@/lib/classisex/comentarios/dto'
import type { Textos } from '@/lib/textos/areas'

function Linha({ c, t, resposta = false }: { c: ComentarioDTO; t: Textos<'classisex'>; resposta?: boolean }) {
  return (
    <li className={resposta ? 'mt-2' : 'py-3 first:pt-0'}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="type-label text-text">{c.apelido}</span>
        {c.doAnunciante && (
          <span className="type-label rounded-full border border-gold/50 px-2 text-gold">
            <TextoRico valor={t.comentarioSeloAnunciante} linha />
          </span>
        )}
        <time className="type-label font-normal text-muted">{c.quando}</time>
      </p>
      <p className="mt-0.5 whitespace-pre-line break-words text-body">{c.texto}</p>
      {c.respostas.length > 0 && (
        <ul className="mt-2 border-l border-line pl-3">
          {c.respostas.map((r) => (
            <Linha key={r.id} c={r} t={t} resposta />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Approved comments straight under a card (no click needed). Read-only: writing and replying happen
 * on the ad page, reached by the link. Text arrives already redacted by the server for anyone who is
 * not an active subscriber. Renders nothing for the "be the first" case: that link is the card's own.
 */
export function ComentariosCard({
  adId,
  conversa,
  total,
  href,
  textos: t,
}: {
  adId: number
  conversa: ComentarioDTO[]
  total: number
  /** Ad page with the form, e.g. `/classisex/anuncio/12#comentarios`. */
  href: string
  textos: Textos<'classisex'>
}) {
  const titleId = `comentarios-card-${adId}`
  if (conversa.length === 0) {
    return (
      <Link href={href} className="type-label mt-3 self-start text-accent underline underline-offset-4">
        <TextoRico valor={t.comentarioCardComentar} linha />
      </Link>
    )
  }
  const shown = conversa.reduce((n, c) => n + 1 + c.respostas.length, 0)
  return (
    <section aria-labelledby={titleId} data-comentarios-card className="mt-4 border-t border-line pt-4">
      <h3 id={titleId} className="type-label text-text">
        <TextoRico valor={t.comentariosTitulo} linha />
        <span className="ml-2 text-muted" data-numeric>
          ({total})
        </span>
      </h3>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {conversa.map((c) => (
          <Linha key={c.id} c={c} t={t} />
        ))}
      </ul>
      <Link href={href} className="type-label mt-3 inline-block text-accent underline underline-offset-4">
        {total > shown ? (
          <TextoRico valor={t.comentarioCardVerTodos} vars={{ n: total }} linha />
        ) : (
          <TextoRico valor={t.comentarioCardResponder} linha />
        )}
      </Link>
    </section>
  )
}
