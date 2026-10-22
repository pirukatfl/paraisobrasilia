import { AdFilters } from '@/components/classisex/AdFilters'
import { Pagination } from '@/components/classisex/Pagination'
import { PublicAdCard } from '@/components/classisex/PublicAdCard'
import { EmptyState } from '@/components/EmptyState'
import type { BoardFilters, BoardPage } from '@/lib/classisex/board'
import type { PublicAdDTO } from '@/lib/classisex/dto'

/**
 * The open ClassiSex board (public DTOs only): filter by Eu sou, cards with the redacted text and
 * the blurred cover, pagination. Shared by /classisex (visitors) and the members area for accounts
 * without an active subscription (free accounts). Contacts and original media never reach it.
 */
export function PublicBoard({
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
  const filtered = Boolean(filters.euSou)
  return (
    <>
      <AdFilters action={basePath} categories={categories} euSou={filters.euSou} showCidade={false} />
      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState
            heading="Nenhum anúncio encontrado."
            body="Tente outra opção em Eu sou."
            actions={[{ href: basePath, label: 'Ver todos os anúncios', variant: 'secondary' }]}
          />
        ) : (
          <EmptyState
            heading="Ainda não há anúncios publicados."
            body="Assinantes publicam anúncios com fotos, vídeo e contato. Assine para anunciar e ver tudo."
            actions={signedIn ? [] : [{ href: '/assine-ja', label: 'Assine Já', variant: 'primary' }]}
          />
        )
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.items.map((ad) => (
            <PublicAdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
      <Pagination
        basePath={basePath}
        page={result.page}
        totalPages={result.totalPages}
        params={{ 'eu-sou': filters.euSou ? String(filters.euSou) : undefined }}
      />
    </>
  )
}
