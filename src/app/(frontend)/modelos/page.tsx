import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { ModelGrid } from '@/components/ModelGrid'
import { getPublishedModels } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('modelos')
  return buildPageMetadata({ title: textoPuro(t.titulo), description: textoPuro(t.intro), path: '/modelos' })
}

/** Always reachable from the menu (quick menu-modelos); empty state until a model is published. */
export default async function ModelsPage() {
  const [models, t] = await Promise.all([getPublishedModels(), getTextos('modelos')])
  return (
    <section aria-labelledby="titulo-modelos">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.chamadaTopo} linha /></p>
      <h1 id="titulo-modelos" className="type-display mt-2">
        <TextoRico valor={t.titulo} linha />
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted"><TextoRico valor={t.intro} linha /></p>
      {models.length === 0 ? (
        <EmptyState
          heading={<TextoRico valor={t.vazioTitulo} linha />}
          body={t.vazioTexto}
          actions={[
            { href: '/', label: <TextoRico valor={t.vazioBotaoFestas} linha />, variant: 'primary' },
            { href: '/espaco', label: <TextoRico valor={t.vazioBotaoEspaco} linha />, variant: 'secondary' },
          ]}
        />
      ) : (
        <ModelGrid models={models} />
      )}
    </section>
  )
}
