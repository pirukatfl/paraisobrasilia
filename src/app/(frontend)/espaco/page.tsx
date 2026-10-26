import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { Gallery } from '@/components/Gallery'
import { getSpaceItems } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'

// Per request (no database at build); data from the tagged cache ('space').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('espaco')
  return buildPageMetadata({ title: t.titulo, description: t.intro, path: '/espaco' })
}

export default async function SpacePage() {
  const [items, t] = await Promise.all([getSpaceItems(), getTextos('espaco')])
  return (
    <section aria-labelledby="titulo-espaco">
      <p className="type-eyebrow text-muted">{t.chamadaTopo}</p>
      <h1 id="titulo-espaco" className="type-display mt-2">
        {t.titulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">{t.intro}</p>
      {items.length > 0 ? (
        <Gallery items={items} />
      ) : (
        <EmptyState
          heading={t.vazioTitulo}
          body={t.vazioTexto}
          actions={[
            { href: '/contato', label: t.vazioBotaoComoChegar, variant: 'primary' },
            { href: '/', label: t.vazioBotaoFestas, variant: 'secondary' },
          ]}
        />
      )}
    </section>
  )
}
