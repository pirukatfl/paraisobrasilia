import Link from 'next/link'

import type { PublicAdDTO } from '@/lib/classisex/dto'

/**
 * One ad in the open preview (PREV-01, D-04): Eu sou · cidade, redacted text, blurred photos only
 * (/classisex/previa/…, plain <img>), and the call to subscribe. No contact, no author.
 */
export function PublicAdCard({ ad }: { ad: PublicAdDTO }) {
  const titleId = `previa-${ad.id}`
  const [cover, ...rest] = ad.fotos
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- blurred preview, served as is
        <img
          src={cover.previewUrl}
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
      {rest.length > 0 && (
        <div className="mt-2 flex gap-2">
          {rest.map((foto) => (
            // eslint-disable-next-line @next/next/no-img-element -- blurred preview, served as is
            <img
              key={foto.previewUrl}
              src={foto.previewUrl}
              alt="Foto desfocada do anúncio"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="h-16 w-16 rounded object-cover"
            />
          ))}
        </div>
      )}
      <h2 id={titleId} className="type-heading mt-4">
        {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </h2>
      {ad.hasVideo && <p className="type-label mt-1 text-muted">vídeo</p>}
      <p className="mt-2 whitespace-pre-line text-body">{ad.texto}</p>
      <div className="mt-4 flex flex-1 flex-wrap items-end justify-between gap-2">
        {ad.publishedLabel && <p className="type-label text-muted">Publicado em {ad.publishedLabel}</p>}
        <Link href="/assine-ja" className="btn-primary">
          Assine para ver o contato
        </Link>
      </div>
    </article>
  )
}
