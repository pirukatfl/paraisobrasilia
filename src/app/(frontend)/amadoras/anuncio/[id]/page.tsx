import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Gallery } from '@/components/Gallery'
import { countLabel } from '@/components/ModelGrid'
import { getAnuncioAmadora } from '@/lib/classisex/galeria'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'

// Per request (no database at build); data from the tagged cache ('ads').
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

async function carregar(id: string) {
  if (!/^\d+$/.test(id)) return null
  const adId = Number(id)
  if (!Number.isSafeInteger(adId) || adId <= 0) return null
  return getAnuncioAmadora(adId)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const anuncio = await carregar((await params).id)
  if (!anuncio) return { title: 'Amadora não encontrada' }
  return {
    ...buildPageMetadata({
      title: anuncio.apelido,
      description: `${anuncio.apelido}, amadora do Paraíso Brasília: fotos.`,
      path: `/amadoras/anuncio/${anuncio.adId}`,
    }),
    // User-written content: not indexed, links still followed
    robots: { index: false, follow: true },
  }
}

/** Photos of an approved ClassiSex ad, open to all (client decision 2026-11-22). Never contact, text, city, age or author. */
export default async function AnuncioAmadoraPage({ params }: Props) {
  const anuncio = await carregar((await params).id)
  if (!anuncio) notFound()
  const t = await getTextos('modelos')
  return (
    <article aria-labelledby="titulo-amadora">
      <p className="type-eyebrow text-muted">
        <Link href="/modelos?tipo=amadoras" className="hover:text-accent">
          Amadoras
        </Link>
      </p>
      <h1 id="titulo-amadora" className="type-display mt-2">
        {anuncio.apelido}
      </h1>
      <p className="type-label mt-2 text-muted">{countLabel(anuncio.fotoCount, 0, t)}</p>
      {/* plainImages: a photo that leaves the gallery must not linger in the Next image optimizer cache */}
      <Gallery items={anuncio.fotos} plainImages label={`Fotos de ${anuncio.apelido}`} />
      <p className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
        <Link href="/modelos?tipo=amadoras" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Ver todas as amadoras
        </Link>
        <Link
          href={`/classisex/anuncio/${anuncio.adId}`}
          className="type-label text-muted underline underline-offset-4 hover:text-accent"
        >
          Ver anúncio no ClassiSex
        </Link>
      </p>
    </article>
  )
}
