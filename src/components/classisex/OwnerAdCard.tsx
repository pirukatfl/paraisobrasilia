import Link from 'next/link'

import type { OwnerAdDTO } from '@/lib/classisex/dto'
import { apagarAnuncio } from '@/lib/classisex/actions'

const mediaSummary = (fotos: number, videos: number) =>
  [fotos === 0 ? 'Sem fotos' : fotos === 1 ? '1 foto' : `${fotos} fotos`, videos === 0 ? null : videos === 1 ? '1 vídeo' : `${videos} vídeos`].filter(Boolean).join(' · ')

/** One ad in Meus anúncios (owner view): status, refusal reason, text, contacts, edit/delete. */
export function OwnerAdCard({ ad, canEdit }: { ad: OwnerAdDTO; canEdit: boolean }) {
  const published = ad.status === 'aprovado' && ad.statusLabel === 'Publicado'
  return (
    <article className="rounded-xl border border-line bg-surface p-5" aria-label={`Anúncio: ${ad.statusLabel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`type-eyebrow ${published ? 'text-accent' : 'text-muted'}`}>
          {ad.motivo ? `${ad.statusLabel}: ${ad.motivo}` : ad.statusLabel}
        </p>
        <p className="type-label text-muted">Atualizado em {ad.updatedLabel}</p>
      </div>
      {ad.motivo && (
        <p className="mt-3 text-body text-muted">Corrija o que a equipe pediu e salve de novo para nova análise.</p>
      )}
      <div className="mt-3 flex items-start gap-4">
        {ad.capa && (
          // eslint-disable-next-line @next/next/no-img-element -- private media: never through the Next image optimizer (T-04-07)
          <img
            src={ad.capa.url}
            alt="Capa do anúncio"
            width={ad.capa.width ?? 480}
            height={ad.capa.height ?? 480}
            loading="lazy"
            decoding="async"
            className="h-20 w-20 shrink-0 rounded object-cover"
          />
        )}
        <div>
          <h2 className="type-heading">
            {ad.apelido} · {ad.euSou}
            {ad.cidade ? ` · ${ad.cidade}` : ''}
          </h2>
          <p className="type-label mt-1 text-muted">{mediaSummary(ad.fotos, ad.videos)}</p>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line text-body">{ad.texto}</p>
      <ul className="type-label mt-3 flex flex-col gap-1 text-muted">
        {ad.contato.whatsapp && <li>WhatsApp: {ad.contato.whatsapp}</li>}
        {ad.contato.telegram && <li>Telegram: @{ad.contato.telegram}</li>}
      </ul>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        {canEdit && (
          <Link href={`/area-do-assinante/meus-anuncios/${ad.id}/editar`} className="btn-secondary">
            Editar
          </Link>
        )}
        <details className="group">
          <summary className="btn-secondary cursor-pointer list-none">Apagar</summary>
          <form action={apagarAnuncio} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="id" value={ad.id} />
            <p className="text-body">Apagar este anúncio de vez? Fotos e vídeos também saem.</p>
            <button type="submit" className="btn-primary">
              Sim, apagar
            </button>
          </form>
        </details>
      </div>
    </article>
  )
}
