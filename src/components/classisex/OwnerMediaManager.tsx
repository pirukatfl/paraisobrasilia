import Link from 'next/link'

import { TIER_LIMITS, type Tier } from '@/lib/assinantes/tier'
import type { OwnerMediaDTO } from '@/lib/classisex/dto'
import { MAX_AD_PHOTOS } from '@/lib/classisex/media-messages'
import { definirCapa, removerMidia } from '@/lib/classisex/actions'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

/**
 * "Fotos e vídeos" on Editar anúncio (CLAS-03, D-01). Server component: plain forms work without
 * JavaScript. Uploads post multipart to the route handler …/meus-anuncios/{id}/midia; Remover and
 * Usar como capa are server actions. Thumbnails are plain <img> through the protected route,
 * never the Next image optimizer (T-04-07).
 */
export async function OwnerMediaManager({ adId, media, tier, legacy = false }: { adId: number; media: OwnerMediaDTO; tier: Tier; legacy?: boolean }) {
  const t = await getTextos('meusAnuncios')
  const uploadAction = `/area-do-assinante/meus-anuncios/${adId}/midia`
  const limits = TIER_LIMITS[tier]
  // I-1: a free owner never loses stored media by editing, but cannot add a photo while one exists
  // (paying accounts keep today's forms; the server enforces their limits)
  // Old-site ads are exempt from the per-tier photo count (2026-10-22); the absolute cap of 10 stays
  const canAddPhoto = legacy ? media.fotos.length < MAX_AD_PHOTOS : tier === 'assinante' || media.fotos.length < limits.fotos
  const canAddVideo = tier === 'assinante'
  const fileInput = 'mt-2 block w-full text-body file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:py-2 file:text-text'
  return (
    <section aria-labelledby="titulo-midia" className="mt-12 max-w-[680px]">
      <h2 id="titulo-midia" className="type-heading">
        {t.gerTitulo}
      </h2>
      <p className="mt-2 text-body text-muted">{tier === 'gratis' ? t.gerDicaGratis : t.gerDicaAssinante}</p>
      <p className="mt-1 text-body text-muted">{t.gerCapaNota}</p>

      {media.fotos.length === 0 ? (
        <p className="mt-6 text-body">{t.gerSemFotos}</p>
      ) : (
        <ul aria-label="Fotos do anúncio" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {media.fotos.map((foto, i) => (
            <li key={foto.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- private media: never through the Next image optimizer */}
              <img
                src={foto.thumb.url}
                alt={`Foto ${i + 1} do anúncio`}
                width={foto.thumb.width ?? 480}
                height={foto.thumb.height ?? 480}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded object-cover"
              />
              {foto.guardada && <p className="type-label text-muted">{t.gerGuardada}</p>}
              {foto.capa ? (
                <p className="type-label text-accent">{t.gerCapa}</p>
              ) : (
                <form action={definirCapa}>
                  <input type="hidden" name="id" value={foto.id} />
                  <input type="hidden" name="anuncio" value={adId} />
                  <button type="submit" className="type-label text-muted underline underline-offset-4 hover:text-accent">
                    {t.gerUsarCapa}
                  </button>
                </form>
              )}
              <form action={removerMidia}>
                <input type="hidden" name="id" value={foto.id} />
                <input type="hidden" name="anuncio" value={adId} />
                <button type="submit" className="type-label text-danger underline underline-offset-4">
                  {t.gerRemover}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {media.videos.map((video, i) => (
        <div
          key={video.id}
          className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3"
        >
          <p className="text-body">
            {preencher(t.gerVideo, { n: i + 1, duracao: video.durationLabel })}
            {video.guardada && <span className="type-label block text-muted">{t.gerGuardada}</span>}
          </p>
          <form action={removerMidia}>
            <input type="hidden" name="id" value={video.id} />
            <input type="hidden" name="anuncio" value={adId} />
            <button type="submit" className="type-label text-danger underline underline-offset-4">
              {preencher(t.gerRemoverVideo, { n: i + 1 })}
            </button>
          </form>
        </div>
      ))}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {canAddPhoto ? (
        <form
          aria-label="Adicionar foto"
          method="post"
          action={`${uploadAction}?tipo=foto`}
          encType="multipart/form-data"
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="tipo" value="foto" />
          <label htmlFor="arquivo-foto" className="type-label">
            {t.gerAdicionarFoto}
          </label>
          <input
            id="arquivo-foto"
            name="arquivo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className={fileInput}
          />
          <button type="submit" className="btn-primary self-start">
            {t.gerEnviarFoto}
          </button>
        </form>
        ) : (
          <p className="text-body text-muted">{t.gerGratisUmaFoto}</p>
        )}
        {canAddVideo ? (
        <form
          aria-label="Adicionar vídeo"
          method="post"
          action={`${uploadAction}?tipo=video`}
          encType="multipart/form-data"
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="tipo" value="video" />
          <label htmlFor="arquivo-video" className="type-label">
            {t.gerAdicionarVideo}
          </label>
          <input
            id="arquivo-video"
            name="arquivo"
            type="file"
            accept="video/mp4,video/quicktime"
            required
            className={fileInput}
          />
          <button type="submit" className="btn-primary self-start">
            {t.gerEnviarVideo}
          </button>
        </form>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-body">{t.gerVideosAssinantes}</p>
            <Link href="/assine-ja" className="btn-secondary self-start">
              {t.gerAssineJa}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
