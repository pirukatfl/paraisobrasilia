import Link from 'next/link'

import type { SpaceItemDTO } from '@/lib/gallery/types'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { SpaceCarousel } from '@/components/home/SpaceCarousel'
import { textoPuro } from '@/lib/textos/rico'

/** Home "Conheça o espaço" (UI-SPEC S2'): slideshow of up to 8 photos; hidden when empty. */
export async function SpaceTeaser({ photos }: { photos: SpaceItemDTO[] }) {
  if (photos.length === 0) return null
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-conheca-espaco" className="mt-12">
      <h2 id="titulo-conheca-espaco" className="type-heading">
        <TextoRico valor={t.espacoTitulo} linha />
      </h2>
      <SpaceCarousel
        photos={photos.map((photo) => photo.image)}
        labels={{
          carrossel: textoPuro(t.espacoCarrossel),
          anterior: textoPuro(t.espacoAnterior),
          proxima: textoPuro(t.espacoProxima),
          irPara: textoPuro(t.espacoIrPara),
          pausar: textoPuro(t.espacoPausar),
          retomar: textoPuro(t.espacoRetomar),
        }}
      />
      <Link href="/espaco" className="btn-secondary mt-6">
        <TextoRico valor={t.espacoBotao} linha />
      </Link>
    </section>
  )
}
