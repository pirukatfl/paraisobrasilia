import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Gallery } from '@/components/Gallery'
import { countLabel } from '@/components/ModelGrid'
import { getPublishedModel } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getPublishedModel((await params).slug)
  if (!model) return { title: 'Modelo não encontrada' }
  return buildPageMetadata({
    title: model.name,
    description: model.description ?? `${model.name}, modelo do Paraíso Brasília: fotos e vídeos.`,
    path: `/modelos/${model.slug}`,
    image: model.ogImage ?? undefined,
  })
}

/** MIDIA-07: one page per published model — name, short description and the photo gallery. No contact. */
export default async function ModelPage({ params }: Props) {
  const model = await getPublishedModel((await params).slug)
  if (!model) notFound()
  return (
    <article aria-labelledby="titulo-modelo">
      <p className="type-eyebrow text-muted">
        <Link href="/modelos" className="hover:text-accent">
          Modelos
        </Link>
      </p>
      <h1 id="titulo-modelo" className="type-display mt-2">
        {model.name}
      </h1>
      <p className="type-label mt-2 text-muted">{countLabel(model.photoCount, model.videoCount)}</p>
      {model.description && (
        <p className="mt-4 max-w-[680px] whitespace-pre-line text-body text-muted">{model.description}</p>
      )}
      <Gallery items={model.items} />
      <p className="mt-12">
        <Link href="/modelos" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Ver todas as modelos
        </Link>
      </p>
    </article>
  )
}
