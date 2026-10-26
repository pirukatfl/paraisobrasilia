import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { ModelGrid } from '@/components/ModelGrid'
import { getPublishedModels } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('modelos')
  return buildPageMetadata({ title: t.titulo, description: t.intro, path: '/modelos' })
}

/** Always reachable from the menu (quick menu-modelos); empty state until a model is published. */
export default async function ModelsPage() {
  const [models, t] = await Promise.all([getPublishedModels(), getTextos('modelos')])
  return (
    <section aria-labelledby="titulo-modelos">
      <p className="type-eyebrow text-muted">{t.chamadaTopo}</p>
      <h1 id="titulo-modelos" className="type-display mt-2">
        {t.titulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">{t.intro}</p>
      {models.length === 0 ? (
        <EmptyState
          heading={t.vazioTitulo}
          body={t.vazioTexto}
          actions={[
            { href: '/', label: t.vazioBotaoFestas, variant: 'primary' },
            { href: '/espaco', label: t.vazioBotaoEspaco, variant: 'secondary' },
          ]}
        />
      ) : (
        <ModelGrid models={models} />
      )}
    </section>
  )
}
