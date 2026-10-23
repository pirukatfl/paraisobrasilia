import Link from 'next/link'

import type { PublicAdDTO } from '@/lib/classisex/dto'

/**
 * One ad in the open view (visitors and free accounts; PREV-01, revisão 2026-10-22): apelido, tipo,
 * city and the whole text with the contacts already removed on the server, a single sharp cover photo
 * (/classisex/previa/…, plain <img>), the call to subscribe and a locked "Enviar recado" (same on every
 * card). No video, contact or author.
 */
export function PublicAdCard({ ad }: { ad: PublicAdDTO }) {
  const titleId = `previa-${ad.id}`
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      {ad.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- cover card, served as is
        <img
          src={ad.foto.previewUrl}
          alt="Foto do anúncio"
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
      <p className="type-label mt-1 text-muted">
        {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </p>
      {ad.texto && <p className="mt-3 whitespace-pre-line break-words text-body">{ad.texto}</p>}
      <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
        <Link href="/assine-ja" className="btn-primary text-center">
          Assine para ver o contato, todas as fotos e os vídeos
        </Link>
        {/* Locked on EVERY card, whoever pays: nothing here says which advertisers are subscribers (I-1, T-RP-05) */}
        <Link
          href="/assine-ja"
          aria-label="Enviar recado: só para assinantes"
          className="btn-secondary inline-flex items-center justify-center gap-2"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Enviar recado
        </Link>
        <p className="type-label text-muted">Recados privados só entre assinantes.</p>
      </div>
    </article>
  )
}
