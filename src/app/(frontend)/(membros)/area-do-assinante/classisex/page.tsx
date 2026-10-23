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
import { REPORT_MESSAGES } from '@/lib/classisex/report-rules'
import { getPublicAdFilters, getPublicAds } from '@/lib/classisex/public'
import { getActiveAdCategories, listMemberAds } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ClassiSex',
  robots: { index: false, follow: false },
}

const PATH = '/area-do-assinante/classisex'

/** Members board (CLAS-01, D-05, D-07): visible ads, newest first, filters, 20 per page. */
export default async function ClassisexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-classisex" className="type-display mt-2">
        ClassiSex
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
          <h2 className="type-heading">Anúncios publicados</h2>
          <p className="mt-2 max-w-[680px] text-body text-muted">
            Você lê os recados na íntegra. Os contatos, as fotos sem desfoque e os vídeos aparecem para assinantes.
          </p>
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
          {REPORT_MESSAGES.enviada}
        </p>
      )}
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Anúncios publicados pelos assinantes do Paraíso. Os contatos aparecem ao abrir o anúncio.
      </p>
      <AdFilters action={PATH} categories={categories} euSou={filters.euSou} cidade={filters.cidade} />
      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState
            heading="Nenhum anúncio encontrado."
            body="Tente outra opção em Eu sou ou outra cidade."
            actions={[{ href: PATH, label: 'Ver todos os anúncios', variant: 'secondary' }]}
          />
        ) : (
          <EmptyState
            heading="Ainda não há anúncios publicados."
            body="Seja o primeiro: o seu anúncio aparece aqui depois que a equipe aprovar."
            actions={[{ href: '/area-do-assinante/meus-anuncios/novo', label: 'Novo anúncio', variant: 'primary' }]}
          />
        )
      ) : (
        <InfiniteAds
          key={`${filters.euSou ?? ''}:${filters.cidade ?? ''}:${result.page}`}
          scope="membros"
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
