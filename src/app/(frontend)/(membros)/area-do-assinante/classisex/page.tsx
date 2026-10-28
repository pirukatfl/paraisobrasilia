import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { AdFilters } from '@/components/classisex/AdFilters'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { InfiniteAds } from '@/components/classisex/InfiniteAds'
import { PublicBoard } from '@/components/classisex/PublicBoard'
import { Pagination } from '@/components/classisex/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { parseBoardFilters } from '@/lib/classisex/board'
import { getPublicAdFilters, getPublicAds } from '@/lib/classisex/public'
import { getActiveAdCategories, listMemberAds } from '@/lib/classisex/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

export const dynamic = 'force-dynamic'

const PATH = '/area-do-assinante/classisex'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('classisex')
  return { title: t.membrosGoogleTitulo, robots: { index: false, follow: false } }
}

/** Members board (CLAS-01, D-05, D-07): visible ads, newest first, filters, 20 per page. */
export default async function ClassisexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const t = await getTextos('classisex')
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">{t.membrosTopo}</p>
      <h1 id="titulo-classisex" className="type-display mt-2">
        {t.membrosTitulo}
      </h1>
    </>
  )
  const params = await searchParams
  // No restricted markup at all without active access (T-04-05): return before any members query.
  // A free account reads the same open board as a visitor (text with contacts removed, cover
  // cover): the public read model only, never the members DTOs.
  if (check.inactive) {
    const publicFilters = { ...parseBoardFilters(params), cidade: undefined }
    const [publicResult, publicCategories] = await Promise.all([getPublicAds(publicFilters), getPublicAdFilters()])
    return (
      <section aria-labelledby="titulo-classisex">
        {header}
        <InactivePanel access={check.access} />
        <div className="mt-10" data-open-board>
          <h2 className="type-heading">{t.membrosPublicadosTitulo}</h2>
          <TextoRico valor={t.membrosGratisTexto} className="mt-2 max-w-[680px] text-body text-muted" />
          <PublicBoard basePath={PATH} result={publicResult} categories={publicCategories} filters={publicFilters} signedIn />
        </div>
      </section>
    )
  }

  const filters = parseBoardFilters(params)
  const reported = params.denuncia === 'enviada'
  const [result, categories] = await Promise.all([listMemberAds(filters), getActiveAdCategories()])
  const filtered = Boolean(filters.euSou || filters.cidade)
  return (
    <section aria-labelledby="titulo-classisex">
      {header}
      {reported && (
        <p role="status" className="mt-4 rounded-lg border border-line px-4 py-2 text-body text-text">
          {t.membrosDenunciaEnviada}
        </p>
      )}
      <p className="mt-4 max-w-[680px] text-body text-muted">
        {t.membrosIntro}
      </p>
      <AdFilters action={PATH} categories={categories} euSou={filters.euSou} cidade={filters.cidade} />
      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState
            heading={t.vazioFiltroTitulo}
            body={t.vazioFiltroMembrosTexto}
            actions={[{ href: PATH, label: t.vazioVerTodos, variant: 'secondary' }]}
          />
        ) : (
          <EmptyState
            heading={t.vazioTitulo}
            body={t.vazioMembrosTexto}
            actions={[{ href: '/area-do-assinante/meus-anuncios/novo', label: t.vazioMembrosBotao, variant: 'primary' }]}
          />
        )
      ) : (
        <InfiniteAds
          key={`${filters.euSou ?? ''}:${filters.cidade ?? ''}:${result.page}`}
          scope="membros"
          textos={t}
          initialItems={result.items}
          initialPage={result.page}
          totalPages={result.totalPages}
          euSou={filters.euSou}
          cidade={filters.cidade}
          gridClassName="mt-8 grid gap-4 md:grid-cols-2"
          noscriptPagination={
            <Pagination
              basePath={PATH}
              page={result.page}
              totalPages={result.totalPages}
              params={{ 'eu-sou': filters.euSou ? String(filters.euSou) : undefined, cidade: filters.cidade }}
            />
          }
        />
      )}
    </section>
  )
}
