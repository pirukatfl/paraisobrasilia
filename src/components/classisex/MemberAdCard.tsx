import Link from 'next/link'

import type { MemberAdDTO } from '@/lib/classisex/dto'

const EXCERPT = 180

const mediaBadge = (fotos: number, video: boolean) =>
  [fotos === 1 ? '1 foto' : fotos > 1 ? `${fotos} fotos` : null, video ? 'vídeo' : null].filter(Boolean).join(' · ')

/**
 * One ad in the members list (CLAS-01): cover photo (plain <img> through the protected route,
 * never the Next image optimizer: T-04-07) or a "Sem foto" block.
 */
export function MemberAdCard({ ad }: { ad: MemberAdDTO }) {
  const excerpt = ad.texto.length > EXCERPT ? `${ad.texto.slice(0, EXCERPT).trimEnd()}…` : ad.texto
  const titleId = `anuncio-${ad.id}`
  const cover = ad.fotos[0]
  const badge = mediaBadge(ad.fotos.length, Boolean(ad.video))
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- private media (T-04-07)
        <img
          src={cover.miniatura}
          alt=""
          width={cover.thumbWidth ?? 480}
          height={cover.thumbHeight ?? 480}
          loading="lazy"
          decoding="async"
          className="mb-4 aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="type-label mb-4 flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-line text-muted">
          Sem foto
        </div>
      )}
      <h2 id={titleId} className="type-heading">
        {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </h2>
      {badge && <p className="type-label mt-1 text-muted">{badge}</p>}
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
