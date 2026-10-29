import type { Metadata } from 'next'
import Link from 'next/link'

import { PublicBoard } from '@/components/classisex/PublicBoard'
import { parseBoardFilters } from '@/lib/classisex/board'
import { getPublicAdFilters, getPublicAds } from '@/lib/classisex/public'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Per request (query string, no database at build); data from the tagged cache 'ads'.
export const dynamic = 'force-dynamic'

const PATH = '/classisex'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('classisex')
  return buildPageMetadata({ title: textoPuro(t.publicoGoogleTitulo), description: textoPuro(t.publicoGoogleDescricao), path: PATH })
}

/**
 * Open view of the ClassiSex (PREV-01, D-04, D-07). Reads only the public read model (apelido, tipo,
 * city, text with contacts removed, cover photo): never the members DTO (T-04-01).
 */
export default async function ClassisexPublicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // The open area filters by tipo only; ?cidade= is ignored (the city is shown, never searched)
  const t = await getTextos('classisex')
  const filters = { ...parseBoardFilters(await searchParams), cidade: undefined }
  const [result, categories] = await Promise.all([getPublicAds(filters), getPublicAdFilters()])
  return (
    <section aria-labelledby="titulo-classisex">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.publicoTopo} linha /></p>
      <h1 id="titulo-classisex" className="type-display mt-2">
        <TextoRico valor={t.publicoTitulo} linha />
      </h1>
      <TextoRico valor={t.publicoIntro} className="mt-4 max-w-[680px] text-body text-muted" />
      <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/classisex/anunciar" className="btn-primary">
          <TextoRico valor={t.publicoBotaoAnunciar} linha />
        </Link>
        <Link
          href="/area-do-assinante/classisex"
          className="type-label font-semibold text-accent underline underline-offset-4"
        >
          <TextoRico valor={t.publicoLinkAssinante} linha />
        </Link>
      </p>
      <PublicBoard basePath={PATH} result={result} categories={categories} filters={filters} />
    </section>
  )
}
