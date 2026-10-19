import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { Gallery } from '@/components/Gallery'
import { getSpaceItems } from '@/lib/gallery/queries'

// Per request (no database at build); data from the tagged cache ('space').
export const dynamic = 'force-dynamic'

const INTRO =
  'Conheça os ambientes do Paraíso: pista, bar, jardim e piscina numa chácara reservada no Lago Oeste.'

export const metadata: Metadata = {
  title: 'Conheça o Paraíso',
  description: INTRO,
}

export default async function SpacePage() {
  const items = await getSpaceItems()
  return (
    <section aria-labelledby="titulo-espaco">
      <p className="type-eyebrow text-muted">Nosso espaço</p>
      <h1 id="titulo-espaco" className="type-display mt-2">
        Conheça o Paraíso
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">{INTRO}</p>
      {items.length > 0 ? (
        <Gallery items={items} />
      ) : (
        <EmptyState
          heading="Fotos do espaço em breve"
          body="Estamos preparando novas fotos e vídeos dos ambientes. Enquanto isso, venha conhecer pessoalmente."
          actions={[
            { href: '/contato', label: 'Como chegar', variant: 'primary' },
            { href: '/', label: 'Ver próximas festas', variant: 'secondary' },
          ]}
        />
      )}
    </section>
  )
}
