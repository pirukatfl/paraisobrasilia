import Link from 'next/link'

import { ModelGrid } from '@/components/ModelGrid'
import type { ModelCardDTO } from '@/lib/gallery/types'

/**
 * Home "Galeria": cover photo of the first 4 published models (same cards and data as /modelos), each
 * linking to its page. The texts are fixed here: adding editable ones would need a database migration.
 * Hidden when there are no models (the page also hides it when staff hid "Galeria" in Menu do site).
 */
export function GaleriaTeaser({ models }: { models: ModelCardDTO[] }) {
  if (models.length === 0) return null
  return (
    <section aria-labelledby="titulo-galeria-home" className="mt-12" data-home-galeria>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="titulo-galeria-home" className="type-heading">
          Galeria
        </h2>
        <Link href="/modelos" className="type-label text-accent underline-offset-4 hover:underline">
          Ver toda a galeria
        </Link>
      </div>
      <ModelGrid models={models.slice(0, 4)} abaixoDaDobra />
    </section>
  )
}
