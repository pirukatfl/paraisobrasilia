import Link from 'next/link'

import type { OwnerAdDTO } from '@/lib/classisex/dto'
import { apagarAnuncio } from '@/lib/classisex/actions'
import type { Textos } from '@/lib/textos/areas'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

const mediaSummary = (t: Textos<'meusAnuncios'>, fotos: number, videos: number) =>
  [
    fotos === 0 ? t.donoSemFotos : fotos === 1 ? t.donoUmaFoto : preencher(t.donoFotos, { n: fotos }),
    videos === 0 ? null : videos === 1 ? t.donoUmVideo : preencher(t.donoVideos, { n: videos }),
  ]
    .filter(Boolean)
    .join(' · ')

/** One ad in Meus anúncios (owner view): status, refusal reason, text, contacts, edit/delete. */
export async function OwnerAdCard({ ad, canEdit }: { ad: OwnerAdDTO; canEdit: boolean }) {
  const t = await getTextos('meusAnuncios')
  const published = ad.status === 'aprovado'
  const draft = ad.status === 'rascunho'
  return (
    <article className="rounded-xl border border-line bg-surface p-5" aria-label={`Anúncio: ${ad.statusLabel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`type-eyebrow ${published ? 'text-accent' : 'text-muted'}`}>
          {ad.motivo ? `${ad.statusLabel}: ${ad.motivo}` : ad.statusLabel}
        </p>
        <p className="type-label text-muted">{preencher(t.donoAtualizadoEm, { data: ad.updatedLabel })}</p>
      </div>
      {draft && <p className="mt-3 text-body text-muted">{t.donoRascunho}</p>}
      {ad.motivo && (
        <p className="mt-3 text-body text-muted">{t.donoCorrigir}</p>
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
          <p className="type-label mt-1 text-muted">{mediaSummary(t, ad.fotos, ad.videos)}</p>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line text-body">{ad.texto}</p>
      <ul className="type-label mt-3 flex flex-col gap-1 text-muted">
        {ad.contato.whatsapp && <li>
            {t.donoWhatsapp}: {ad.contato.whatsapp}
          </li>}
        {ad.contato.telegram && <li>
            {t.donoTelegram}: @{ad.contato.telegram}
          </li>}
      </ul>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        {canEdit && (
          <Link href={`/area-do-assinante/meus-anuncios/${ad.id}/editar`} className={draft ? 'btn-primary' : 'btn-secondary'}>
            {draft ? t.donoRevisar : t.donoEditar}
          </Link>
        )}
        <details className="group">
          <summary className="btn-secondary cursor-pointer list-none">{t.donoApagar}</summary>
          <form action={apagarAnuncio} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="id" value={ad.id} />
            <p className="text-body">{t.donoApagarConfirma}</p>
            <button type="submit" className="btn-primary">
              {t.donoApagarSim}
            </button>
          </form>
        </details>
      </div>
    </article>
  )
}
