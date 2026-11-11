import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Gallery } from '@/components/Gallery'
import { countLabel } from '@/components/ModelGrid'
import { getAmadoraEnviada } from '@/lib/midia-enviada/publico'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'

// Per request (no database at build); data from the tagged cache ('amadores').
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

async function carregar(id: string) {
  if (!/^\d+$/.test(id)) return null
  const envioId = Number(id)
  if (!Number.isSafeInteger(envioId) || envioId <= 0) return null
  return getAmadoraEnviada(envioId)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const amadora = await carregar((await params).id)
  if (!amadora) return { title: 'Amadora não encontrada' }
  return buildPageMetadata({
    title: amadora.apelido,
    description: `${amadora.apelido}, amadora do Paraíso Brasília: fotos.`,
    path: `/amadoras/${amadora.envioId}`,
  })
}

/** An approved submission from the public: nickname and its published photos. Never contact, message or note. */
export default async function AmadoraPage({ params }: Props) {
  const amadora = await carregar((await params).id)
  if (!amadora) notFound()
  const t = await getTextos('modelos')
  return (
    <article aria-labelledby="titulo-amadora">
      <p className="type-eyebrow text-muted">
        <Link href="/modelos?tipo=amadoras" className="hover:text-accent">
          Amadoras
        </Link>
      </p>
      <h1 id="titulo-amadora" className="type-display mt-2">
        {amadora.apelido}
      </h1>
      <p className="type-label mt-2 text-muted">{countLabel(amadora.fotoCount, 0, t)}</p>
      {/* plainImages: a photo staff takes down must not linger in the Next image optimizer cache */}
      <Gallery items={amadora.fotos} plainImages label={`Fotos de ${amadora.apelido}`} />
      <p className="mt-12">
        <Link href="/modelos?tipo=amadoras" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Ver todas as amadoras
        </Link>
      </p>
    </article>
  )
}
