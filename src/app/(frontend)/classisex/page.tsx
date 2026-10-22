import type { Metadata } from 'next'
import Link from 'next/link'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { PublicBoard } from '@/components/classisex/PublicBoard'
import { parseBoardFilters } from '@/lib/classisex/board'
import { getPublicAdFilters, getPublicAds } from '@/lib/classisex/public'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (query string, no database at build); data from the tagged cache 'ads'.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'ClassiSex',
  description: 'Anúncios de casais, mulheres, homens e trans do Paraíso Brasília. Leia os anúncios; assine para ver os contatos e as fotos.',
  path: '/classisex',
})

const PATH = '/classisex'

/**
 * Open view of the ClassiSex (PREV-01, D-04, D-07). Reads only the public read model (apelido, tipo,
 * city, text with contacts removed, blurred cover photo): never the members DTO (T-04-01).
 */
export default async function ClassisexPublicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // The open area filters by tipo only; ?cidade= is ignored (the city is shown, never searched)
  const filters = { ...parseBoardFilters(await searchParams), cidade: undefined }
  const [result, categories] = await Promise.all([getPublicAds(filters), getPublicAdFilters()])
  return (
    <section aria-labelledby="titulo-classisex">
      <p className="type-eyebrow text-muted">Anúncios</p>
      <h1 id="titulo-classisex" className="type-display mt-2">
        ClassiSex
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Anúncios dos assinantes do Paraíso. Leia os recados na íntegra; os contatos (WhatsApp, Telegram, telefone, e-mail e links), as fotos sem desfoque e os vídeos ficam para assinantes.
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
        title="Assine para ver o contato e as fotos"
        text="Assinantes veem os contatos, as fotos e os vídeos, mandam recados privados e anunciam também."
        membersHref="/area-do-assinante/classisex"
      />
      <PublicBoard basePath={PATH} result={result} categories={categories} filters={filters} />
    </section>
  )
}
