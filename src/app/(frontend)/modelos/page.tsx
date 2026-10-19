import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ModelGrid } from '@/components/ModelGrid'
import { getPublishedModels } from '@/lib/gallery/queries'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

const INTRO = 'As modelos que animam as noites do Paraíso.'

export const metadata: Metadata = {
  title: 'Modelos',
  description: INTRO,
}

/** D-08: secondary section — exists only while at least one model is published. */
export default async function ModelsPage() {
  const models = await getPublishedModels()
  if (models.length === 0) notFound()
  return (
    <section aria-labelledby="titulo-modelos">
      <p className="type-eyebrow text-muted">Modelos da casa</p>
      <h1 id="titulo-modelos" className="type-display mt-2">
        Modelos
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">{INTRO}</p>
      <ModelGrid models={models} />
    </section>
  )
}
