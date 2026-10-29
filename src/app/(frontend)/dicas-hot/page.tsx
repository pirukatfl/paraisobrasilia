import type { Metadata } from 'next'
import Link from 'next/link'

import { Pagination } from '@/components/classisex/Pagination'
import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { DicaCard } from '@/components/dicas/DicaCard'
import { EmptyState } from '@/components/EmptyState'
import { getPublicDicas } from '@/lib/dicas/public'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Per request (query string, no database at build); data from the tagged cache 'dicas'.
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const pageOf = async (searchParams: SearchParams) => {
  const raw = (await searchParams).pagina
  return Math.max(1, Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '1') : (raw ?? '1'), 10) || 1)
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const page = await pageOf(searchParams)
  const t = await getTextos('dicasHot')
  return buildPageMetadata({
    title: textoPuro(t.googleLista),
    description: textoPuro(t.googleListaDescricao),
    path: page > 1 ? `/dicas-hot?pagina=${page}` : '/dicas-hot',
  })
}

/** Open list of Dicas Hot: cover, title and the first lines; the full text is for subscribers. Drafts never reach this render. */
export default async function DicasHotPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await getPublicDicas(await pageOf(searchParams))
  const t = await getTextos('dicasHot')
  return (
    <section aria-labelledby="titulo-dicas">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.listaEyebrow} linha /></p>
      <h1 id="titulo-dicas" className="type-display mt-2">
        <TextoRico valor={t.listaTitulo} linha />
      </h1>
      <TextoRico valor={t.listaIntro} className="mt-4 max-w-[680px] text-body text-muted" />
      <p className="mt-4">
        <Link href="/area-do-assinante/dicas-hot" className="type-label font-semibold text-accent underline underline-offset-4">
          <TextoRico valor={t.listaLinkAssinante} linha />
        </Link>
      </p>
      {result.items.length === 0 ? (
        <EmptyState heading={<TextoRico valor={t.listaVazioTitulo} linha />} body={t.listaVazioTexto} actions={[{ href: '/', label: <TextoRico valor={t.listaVazioBotao} linha />, variant: 'secondary' }]} />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((d) => (
            <DicaCard key={d.slug} dica={d} href={`/dicas-hot/${d.slug}`} showImage />
          ))}
        </div>
      )}
      <Pagination basePath="/dicas-hot" page={result.page} totalPages={result.totalPages} params={{}} />
      <AssineJaCta
        title={<TextoRico valor={t.listaCtaTitulo} linha />}
        text={t.listaCtaTexto}
        membersHref="/area-do-assinante/dicas-hot"
      />
    </section>
  )
}
