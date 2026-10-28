import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { Gallery } from '@/components/Gallery'
import { getSpaceItems } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Per request (no database at build); data from the tagged cache ('space').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('espaco')
  return buildPageMetadata({ title: textoPuro(t.titulo), description: textoPuro(t.intro), path: '/espaco' })
}

export default async function SpacePage() {
  const [items, t] = await Promise.all([getSpaceItems(), getTextos('espaco')])
  return (
    <section aria-labelledby="titulo-espaco">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.chamadaTopo} linha /></p>
      <h1 id="titulo-espaco" className="type-display mt-2">
        <TextoRico valor={t.titulo} linha />
      </h1>
      <TextoRico valor={t.intro} className="mt-4 max-w-[680px] text-body text-muted" />
      {items.length > 0 ? (
        <Gallery items={items} />
      ) : (
        <EmptyState
          heading={<TextoRico valor={t.vazioTitulo} linha />}
          body={t.vazioTexto}
          actions={[
            { href: '/contato', label: <TextoRico valor={t.vazioBotaoComoChegar} linha />, variant: 'primary' },
            { href: '/', label: <TextoRico valor={t.vazioBotaoFestas} linha />, variant: 'secondary' },
          ]}
        />
      )}
    </section>
  )
}
