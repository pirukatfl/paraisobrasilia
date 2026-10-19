import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { AdFilters } from '@/components/classisex/AdFilters'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { MemberAdCard } from '@/components/classisex/MemberAdCard'
import { Pagination } from '@/components/classisex/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { parseBoardFilters } from '@/lib/classisex/board'
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
  // No restricted markup at all without active access (T-04-05): return before any query
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-classisex">
        {header}
        <InactivePanel access={check.access} />
      </section>
    )
  }

  const filters = parseBoardFilters(await searchParams)
  const [result, categories] = await Promise.all([listMemberAds(filters), getActiveAdCategories()])
  const filtered = Boolean(filters.euSou || filters.cidade)
  return (
    <section aria-labelledby="titulo-classisex">
      {header}
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
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((ad) => (
            <MemberAdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
      <Pagination
        basePath={PATH}
        page={result.page}
        totalPages={result.totalPages}
        params={{ 'eu-sou': filters.euSou ? String(filters.euSou) : undefined, cidade: filters.cidade }}
      />
    </section>
  )
}
