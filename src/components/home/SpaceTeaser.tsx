import Link from 'next/link'

import { Gallery } from '@/components/Gallery'
import { TextoRico } from '@/components/TextoRico'
import type { SpaceItemDTO } from '@/lib/gallery/types'
import { getTextos } from '@/lib/textos/queries'

/**
 * Home "Conheça o espaço": 4 small photos; a click opens the lightbox with ALL the space items
 * (same Gallery as /espaco, limited to 4 tiles with "+N" and "Ver todas as fotos"). Hidden when empty.
 * `abaixoDaDobra` is false only when there are no parties (the photos then open the page).
 */
export async function SpaceTeaser({ items, abaixoDaDobra = true }: { items: SpaceItemDTO[]; abaixoDaDobra?: boolean }) {
  if (items.length === 0) return null
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-conheca-espaco" className="mt-12" data-home-espaco>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="titulo-conheca-espaco" className="type-heading">
          <TextoRico valor={t.espacoTitulo} linha />
        </h2>
        <Link href="/espaco" className="type-label text-accent underline-offset-4 hover:underline">
          <TextoRico valor={t.espacoBotao} linha />
        </Link>
      </div>
      <Gallery items={items} limite={4} abaixoDaDobra={abaixoDaDobra} />
    </section>
  )
}
