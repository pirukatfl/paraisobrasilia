import type { Metadata } from 'next'
import Link from 'next/link'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { AdFilters } from '@/components/classisex/AdFilters'
import { Pagination } from '@/components/classisex/Pagination'
import { PublicAdCard } from '@/components/classisex/PublicAdCard'
import { EmptyState } from '@/components/EmptyState'
import { parseBoardFilters } from '@/lib/classisex/board'
import { getPublicAdFilters, getPublicAds } from '@/lib/classisex/public'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (query string, no database at build); data from the tagged cache 'ads'.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'ClassiSex',
  description: 'Anúncios de casais, mulheres, homens e trans do Paraíso Brasília. Assine para ver fotos, vídeos e contatos.',
  path: '/classisex',
})

const PATH = '/classisex'

/**
 * Open preview of the ClassiSex (PREV-01, D-04, D-07). Reads only the public read model
 * (apelido, tipo, blurred cover photo): never the members DTO (T-04-01).
 */
export default async function ClassisexPublicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // The open area filters by tipo only; ?cidade= is ignored (the city is not public)
  const filters = { ...parseBoardFilters(await searchParams), cidade: undefined }
  const [result, categories] = await Promise.all([getPublicAds(filters), getPublicAdFilters()])
  const filtered = Boolean(filters.euSou)
  return (
    <section aria-labelledby="titulo-classisex">
      <p className="type-eyebrow text-muted">Anúncios</p>
      <h1 id="titulo-classisex" className="type-display mt-2">
        ClassiSex
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Anúncios dos assinantes do Paraíso. O texto, a cidade, as fotos, os vídeos e os contatos ficam na área do assinante.
      </p>
      <p className="mt-4">
        <Link
          href="/area-do-assinante/classisex"
          className="type-label font-semibold text-accent underline underline-offset-4"
        >
          Já é assinante? Ver anúncios completos
        </Link>
      </p>
      <AssineJaCta
        title="Veja os anúncios completos"
        text="Assinantes veem texto, cidade, fotos, vídeos e contatos, e anunciam também."
        membersHref="/area-do-assinante/classisex"
      />
      <AdFilters action={PATH} categories={categories} euSou={filters.euSou} showCidade={false} />
      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState
            heading="Nenhum anúncio encontrado."
            body="Tente outra opção em Eu sou."
            actions={[{ href: PATH, label: 'Ver todos os anúncios', variant: 'secondary' }]}
          />
        ) : (
          <EmptyState
            heading="Ainda não há anúncios publicados."
            body="Assinantes publicam anúncios com fotos, vídeo e contato. Assine para anunciar e ver tudo."
            actions={[{ href: '/assine-ja', label: 'Assine Já', variant: 'primary' }]}
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
        basePath={PATH}
        page={result.page}
        totalPages={result.totalPages}
        params={{ 'eu-sou': filters.euSou ? String(filters.euSou) : undefined }}
      />
    </section>
  )
}
