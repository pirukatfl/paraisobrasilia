import Link from 'next/link'

import type { MemberAdDTO } from '@/lib/classisex/dto'
import type { Textos } from '@/lib/textos/areas'
import { juntarComPonto, TextoRico } from '@/components/TextoRico'

const EXCERPT = 180

const mediaBadge = (t: Textos<'classisex'>, fotos: number, videos: number) =>
  juntarComPonto([
    fotos === 1 ? <TextoRico valor={t.cardUmaFoto} linha /> : fotos > 1 ? <TextoRico valor={t.cardFotos} vars={{ n: fotos }} linha /> : null,
    videos === 1 ? <TextoRico valor={t.cardUmVideo} linha /> : videos > 1 ? <TextoRico valor={t.cardVideos} vars={{ n: videos }} linha /> : null,
  ])

/**
 * One ad in the members list (CLAS-01): cover photo (plain <img> through the protected route,
 * never the Next image optimizer: T-04-07) or a "Sem foto" block.
 */
export function MemberAdCard({ ad, textos: t }: { ad: MemberAdDTO; textos: Textos<'classisex'> }) {
  const excerpt = ad.texto.length > EXCERPT ? `${ad.texto.slice(0, EXCERPT).trimEnd()}…` : ad.texto
  const titleId = `anuncio-${ad.id}`
  const cover = ad.fotos[0]
  const badge = mediaBadge(t, ad.fotos.length, ad.videos.length)
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
          <TextoRico valor={t.cardSemFoto} linha />
        </div>
      )}
      <h2 id={titleId} className="type-heading">
        {ad.apelido} · {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </h2>
      {badge.length > 0 && <p className="type-label mt-1 text-muted">{badge}</p>}
      <p className="mt-2 whitespace-pre-line text-body">{excerpt}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="type-label text-muted"><TextoRico valor={t.cardPublicadoEm} vars={{ data: ad.publishedLabel }} linha /></p>
        <Link href={`/area-do-assinante/classisex/${ad.id}`} className="btn-secondary">
          <TextoRico valor={t.cardVerAnuncio} linha />
        </Link>
      </div>
    </article>
  )
}
