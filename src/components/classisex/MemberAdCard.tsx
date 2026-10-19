import Link from 'next/link'

import type { MemberAdDTO } from '@/lib/classisex/dto'

const EXCERPT = 180

/** One ad in the members list (CLAS-01). The cover photo is added in 04-06. */
export function MemberAdCard({ ad }: { ad: MemberAdDTO }) {
  const excerpt = ad.texto.length > EXCERPT ? `${ad.texto.slice(0, EXCERPT).trimEnd()}…` : ad.texto
  const titleId = `anuncio-${ad.id}`
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <h2 id={titleId} className="type-heading">
        {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </h2>
      <p className="mt-2 whitespace-pre-line text-body">{excerpt}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="type-label text-muted">Publicado em {ad.publishedLabel}</p>
        <Link href={`/area-do-assinante/classisex/${ad.id}`} className="btn-secondary">
          Ver anúncio
        </Link>
      </div>
    </article>
  )
}
