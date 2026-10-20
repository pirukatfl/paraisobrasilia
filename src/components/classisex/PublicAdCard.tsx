import Link from 'next/link'

import type { PublicAdDTO } from '@/lib/classisex/dto'

/**
 * One ad in the open preview (PREV-01, D-04; revisão 2026-10-20): apelido, tipo and a single
 * blurred photo (/classisex/previa/…, plain <img>), plus the call to subscribe. No text, city,
 * contact, video or author.
 */
export function PublicAdCard({ ad }: { ad: PublicAdDTO }) {
  const titleId = `previa-${ad.id}`
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      {ad.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- blurred preview, served as is
        <img
          src={ad.foto.previewUrl}
          alt="Foto desfocada do anúncio"
          width={480}
          height={360}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="type-label flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-line text-muted">
          Sem foto
        </div>
      )}
      <h2 id={titleId} className="type-heading mt-4">
        {ad.apelido}
      </h2>
      <p className="type-label mt-1 text-muted">{ad.euSou}</p>
      <div className="mt-4 flex flex-1 items-end">
        <Link href="/assine-ja" className="btn-primary">
          Assine para ver
        </Link>
      </div>
    </article>
  )
}
