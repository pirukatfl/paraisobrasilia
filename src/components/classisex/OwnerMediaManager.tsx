import type { OwnerMediaDTO } from '@/lib/classisex/dto'
import { definirCapa, removerMidia } from '@/lib/classisex/actions'

export const MEDIA_HINT = 'Fotos JPG, PNG ou WebP até 15 MB (até 5). Vídeo MP4 ou MOV até 100 MB e 60 segundos.'

/**
 * "Fotos e vídeo" on Editar anúncio (CLAS-03, D-01). Server component: plain forms work without
 * JavaScript. Uploads post multipart to the route handler …/meus-anuncios/{id}/midia; Remover and
 * Usar como capa are server actions. Thumbnails are plain <img> through the protected route,
 * never next/image (T-04-07).
 */
export function OwnerMediaManager({ adId, media }: { adId: number; media: OwnerMediaDTO }) {
  const uploadAction = `/area-do-assinante/meus-anuncios/${adId}/midia`
  const fileInput = 'mt-2 block w-full text-body file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:py-2 file:text-text'
  return (
    <section aria-labelledby="titulo-midia" className="mt-12 max-w-[680px]">
      <h2 id="titulo-midia" className="type-heading">
        Fotos e vídeo
      </h2>
      <p className="mt-2 text-body text-muted">{MEDIA_HINT}</p>
      <p className="mt-1 text-body text-muted">
        A primeira foto é a capa. Toda mudança manda o anúncio de volta para a análise da equipe.
      </p>

      {media.fotos.length === 0 ? (
        <p className="mt-6 text-body">Nenhuma foto ainda.</p>
      ) : (
        <ul aria-label="Fotos do anúncio" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {media.fotos.map((foto, i) => (
            <li key={foto.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- private media: never through next/image */}
              <img
                src={foto.thumb.url}
                alt={`Foto ${i + 1} do anúncio`}
                width={foto.thumb.width ?? 480}
                height={foto.thumb.height ?? 480}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded object-cover"
              />
              {foto.capa ? (
                <p className="type-label text-accent">Capa</p>
              ) : (
                <form action={definirCapa}>
                  <input type="hidden" name="id" value={foto.id} />
                  <input type="hidden" name="anuncio" value={adId} />
                  <button type="submit" className="type-label text-muted underline underline-offset-4 hover:text-accent">
                    Usar como capa
                  </button>
                </form>
              )}
              <form action={removerMidia}>
                <input type="hidden" name="id" value={foto.id} />
                <input type="hidden" name="anuncio" value={adId} />
                <button type="submit" className="type-label text-danger underline underline-offset-4">
                  Remover
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {media.video && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-body">Vídeo · {media.video.durationLabel}</p>
          <form action={removerMidia}>
            <input type="hidden" name="id" value={media.video.id} />
            <input type="hidden" name="anuncio" value={adId} />
            <button type="submit" className="type-label text-danger underline underline-offset-4">
              Remover vídeo
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <form
          aria-label="Adicionar foto"
          method="post"
          action={uploadAction}
          encType="multipart/form-data"
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="tipo" value="foto" />
          <label htmlFor="arquivo-foto" className="type-label">
            Adicionar foto
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
            Enviar foto
          </button>
        </form>
        <form
          aria-label="Adicionar vídeo"
          method="post"
          action={uploadAction}
          encType="multipart/form-data"
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="tipo" value="video" />
          <label htmlFor="arquivo-video" className="type-label">
            Adicionar vídeo
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
            Enviar vídeo
          </button>
        </form>
      </div>
    </section>
  )
}
