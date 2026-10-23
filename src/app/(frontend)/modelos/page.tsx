import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { ModelGrid } from '@/components/ModelGrid'
import { getPublishedModels } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

const INTRO = 'As modelos que animam as noites do Paraíso.'

export const metadata: Metadata = buildPageMetadata({ title: 'Modelos', description: INTRO, path: '/modelos' })

/** Always reachable from the menu (quick menu-modelos); empty state until a model is published. */
export default async function ModelsPage() {
  const models = await getPublishedModels()
  return (
    <section aria-labelledby="titulo-modelos">
      <p className="type-eyebrow text-muted">Modelos da casa</p>
      <h1 id="titulo-modelos" className="type-display mt-2">
        Modelos
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">{INTRO}</p>
      {models.length === 0 ? (
        <EmptyState
          heading="Em breve, as modelos da casa aqui."
          body="Estamos preparando esta galeria. Enquanto isso, veja as próximas festas ou conheça o espaço."
          actions={[
            { href: '/', label: 'Ver as festas', variant: 'primary' },
            { href: '/espaco', label: 'Conhecer o espaço', variant: 'secondary' },
          ]}
        />
      ) : (
        <ModelGrid models={models} />
      )}
    </section>
  )
}
