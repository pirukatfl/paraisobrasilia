import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { ModelCardDTO } from '@/lib/gallery/types'
import { juntarComPonto, TextoRico } from '@/components/TextoRico'
import { getTextos } from '@/lib/textos/queries'
import type { Textos } from '@/lib/textos/areas'

const CARD_SIZES = '(min-width: 1024px) 25vw, 50vw'

/** "3 fotos", "1 foto · 2 vídeos" (UI-SPEC S11'/S12). */
export function countLabel(
  photoCount: number,
  videoCount: number,
  t: Pick<Textos<'modelos'>, 'umaFoto' | 'variasFotos' | 'umVideo' | 'variosVideos'>,
): ReactNode {
  return juntarComPonto([
    photoCount === 1 ? <TextoRico valor={t.umaFoto} linha /> : <TextoRico valor={t.variasFotos} vars={{ n: photoCount }} linha />,
    videoCount <= 0 ? null : videoCount === 1 ? <TextoRico valor={t.umVideo} linha /> : <TextoRico valor={t.variosVideos} vars={{ n: videoCount }} linha />,
  ])
}

/** Model cards (UI-SPEC S11'): each card is one link to the model page; cover = first photo 4:5. */
export async function ModelGrid({ models }: { models: ModelCardDTO[] }) {
  const t = await getTextos('modelos')
  return (
    <ul role="list" className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {models.map((model, i) => (
        <li key={model.id}>
          <Link
            href={`/modelos/${model.slug}`}
            aria-label={`Ver fotos de ${model.name}`}
            className="block focus-visible:outline-none"
          >
            <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-surface hover:border-primary-hover hover:card-glow focus-visible:border-accent">
              <Image
                src={model.cover.thumbUrl}
                alt={model.cover.alt}
                width={model.cover.thumbWidth}
                height={model.cover.thumbHeight}
                sizes={CARD_SIZES}
                loading={i < 2 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="type-label mt-2 block text-text">{model.name}</span>
            {(model.photoCount > 1 || model.videoCount > 0) && (
              <span className="type-label block text-muted">{countLabel(model.photoCount, model.videoCount, t)}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
