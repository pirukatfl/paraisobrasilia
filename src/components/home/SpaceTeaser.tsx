import Image from 'next/image'
import Link from 'next/link'

import type { SpaceItemDTO } from '@/lib/gallery/types'
import { getTextos } from '@/lib/textos/queries'

/** Home "Conheça o espaço" (UI-SPEC S2'): up to 6 photos, lazy, card derivative; hidden when empty. */
export async function SpaceTeaser({ photos }: { photos: SpaceItemDTO[] }) {
  if (photos.length === 0) return null
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-conheca-espaco" className="mt-12">
      <h2 id="titulo-conheca-espaco" className="type-heading">
        {t.espacoTitulo}
      </h2>
      <ul role="list" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
        {photos.map((photo) => (
          <li key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface">
            <Image
              src={photo.image.thumbUrl}
              alt={photo.image.alt}
              width={photo.image.thumbWidth}
              height={photo.image.thumbHeight}
              sizes="(min-width: 640px) 33vw, 50vw"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </li>
        ))}
      </ul>
      <Link href="/espaco" className="btn-secondary mt-6">
        {t.espacoBotao}
      </Link>
    </section>
  )
}
