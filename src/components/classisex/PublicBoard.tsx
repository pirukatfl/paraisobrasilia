import { AdFilters } from '@/components/classisex/AdFilters'
import { InfiniteAds } from '@/components/classisex/InfiniteAds'
import { Pagination } from '@/components/classisex/Pagination'
import { EmptyState } from '@/components/EmptyState'
import type { BoardFilters, BoardPage } from '@/lib/classisex/board'
import type { PublicAdDTO } from '@/lib/classisex/dto'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/**
 * The open ClassiSex board (public DTOs only): filter by Eu sou, cards with the redacted text and
 * the cover photo, pagination. Shared by /classisex (visitors) and the members area for accounts
 * without an active subscription (free accounts). Contacts and original media never reach it.
 */
export async function PublicBoard({
  basePath,
  result,
  categories,
  filters,
  signedIn = false,
}: {
  basePath: string
  result: BoardPage<PublicAdDTO>
  categories: { id: number; name: string }[]
  filters: BoardFilters
  /** Free account inside the members area: the page already carries the subscribe call, so no second one here. */
  signedIn?: boolean
}) {
  const t = await getTextos('classisex')
  const filtered = Boolean(filters.euSou)
  const paginationEl = (
    <Pagination
      basePath={basePath}
      page={result.page}
      totalPages={result.totalPages}
      params={{ 'eu-sou': filters.euSou ? String(filters.euSou) : undefined }}
    />
  )
  return (
    <>
      <AdFilters action={basePath} categories={categories} euSou={filters.euSou} showCidade={false} />
      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState
            heading={<TextoRico valor={t.vazioFiltroTitulo} linha />}
            body={t.vazioFiltroPublicoTexto}
            actions={[{ href: basePath, label: <TextoRico valor={t.vazioVerTodos} linha />, variant: 'secondary' }]}
          />
        ) : (
          <EmptyState
            heading={<TextoRico valor={t.vazioTitulo} linha />}
            body={t.vazioPublicoTexto}
            actions={signedIn ? [] : [{ href: '/assine-ja', label: <TextoRico valor={t.vazioPublicoBotao} linha />, variant: 'primary' }]}
          />
        )
      ) : (
        <InfiniteAds
          // New filter = new navigation; the key also resets the list on ?pagina= changes
          key={`${filters.euSou ?? ''}:${result.page}`}
          scope="publico"
          textos={t}
          initialItems={result.items}
          initialPage={result.page}
          totalPages={result.totalPages}
          euSou={filters.euSou}
          gridClassName="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          noscriptPagination={paginationEl}
        />
      )}
    </>
  )
}
