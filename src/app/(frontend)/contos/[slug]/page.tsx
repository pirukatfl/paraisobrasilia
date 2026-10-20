import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { RichText } from '@/components/RichText'
import { getPublicConto } from '@/lib/contos/public'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache ('conto:{slug}').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const conto = await getPublicConto((await params).slug)
  if (!conto) return { title: 'Conto não encontrado' }
  // T-05-01: the description comes from the open text only
  return buildPageMetadata({ title: conto.title, description: conto.description, path: `/contos/${conto.slug}` })
}

/** Public excerpt of a conto (PREV-03, PREV-04): only the open blocks ever reach this render. */
export default async function ContoPublicPage({ params }: Props) {
  const conto = await getPublicConto((await params).slug)
  if (!conto) notFound()
  return (
    <article aria-labelledby="titulo-conto" className="max-w-[720px]">
      <p className="type-eyebrow text-muted">Contos</p>
      <h1 id="titulo-conto" className="type-display mt-2">
        {conto.title}
      </h1>
      {conto.dateLabel && <p className="type-label mt-2 text-muted">{conto.dateLabel}</p>}
      <div className="mt-6">
        <RichText data={conto.open} />
      </div>
      {conto.hasMore && (
        <AssineJaCta
          title="Quer ler até o fim?"
          text="Continue lendo: o restante deste conto é só para assinantes."
          membersHref={`/area-do-assinante/contos/${conto.slug}`}
          membersLabel="Já sou assinante: ler o conto completo"
        />
      )}
      <p className="mt-10">
        <Link href="/contos" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Voltar para os contos
        </Link>
      </p>
    </article>
  )
}
