import type { Metadata } from 'next'
import Link from 'next/link'

import { Pagination } from '@/components/classisex/Pagination'
import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { DicaCard } from '@/components/dicas/DicaCard'
import { EmptyState } from '@/components/EmptyState'
import { getPublicDicas } from '@/lib/dicas/public'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (query string, no database at build); data from the tagged cache 'dicas'.
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const pageOf = async (searchParams: SearchParams) => {
  const raw = (await searchParams).pagina
  return Math.max(1, Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '1') : (raw ?? '1'), 10) || 1)
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const page = await pageOf(searchParams)
  return buildPageMetadata({
    title: 'Dicas Hot',
    description: 'Dicas Hot do Paraíso Brasília: swing, casais liberais, fetiches e prazer a dois, com respeito e sem tabu.',
    path: page > 1 ? `/dicas-hot?pagina=${page}` : '/dicas-hot',
  })
}

/** Open list of Dicas Hot: cover, title and the first lines; the full text is for subscribers. Drafts never reach this render. */
export default async function DicasHotPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await getPublicDicas(await pageOf(searchParams))
  return (
    <section aria-labelledby="titulo-dicas">
      <p className="type-eyebrow text-muted">Leitura</p>
      <h1 id="titulo-dicas" className="type-display mt-2">
        Dicas Hot
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Textos sobre swing, casais liberais, fetiches e prazer a dois, com respeito e sem tabu.
      </p>
      <p className="mt-4">
        <Link href="/area-do-assinante/dicas-hot" className="type-label font-semibold text-accent underline underline-offset-4">
          Já é assinante? Ler as Dicas Hot completas
        </Link>
      </p>
      {result.items.length === 0 ? (
        <EmptyState heading="Nenhuma dica publicada ainda." body="Em breve novas dicas por aqui." actions={[{ href: '/', label: 'Voltar para a home', variant: 'secondary' }]} />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((d) => (
            <DicaCard key={d.slug} dica={d} href={`/dicas-hot/${d.slug}`} showImage />
          ))}
        </div>
      )}
      <Pagination basePath="/dicas-hot" page={result.page} totalPages={result.totalPages} params={{}} />
      <AssineJaCta
        title="Dicas Hot completas para assinantes"
        text="Assine para ler cada dica do começo ao fim, ver o ClassiSex e trocar mensagens."
        membersHref="/area-do-assinante/dicas-hot"
      />
    </section>
  )
}
