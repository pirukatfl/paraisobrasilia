import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { ModelGrid } from '@/components/ModelGrid'
import { getPublishedModels } from '@/lib/gallery/queries'
import { filterByTipo, type ModelTipo, parseTipo } from '@/lib/gallery/tipo'
import { buildPageMetadata } from '@/lib/seo/metadata'
import type { Textos } from '@/lib/textos/areas'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ tipo?: string | string[] }> }

/** Title and opening text of the page for the Galeria submenu (?tipo=); no tipo = the whole gallery. */
function copyFor(t: Textos<'modelos'>, tipo: ModelTipo | null) {
  if (tipo === 'profissionais') return { titulo: t.tituloProfissionais, intro: t.introProfissionais }
  if (tipo === 'amadoras') return { titulo: t.tituloAmadoras, intro: t.introAmadoras }
  return { titulo: t.titulo, intro: t.intro }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const tipo = parseTipo((await searchParams).tipo)
  const { titulo, intro } = copyFor(await getTextos('modelos'), tipo)
  return buildPageMetadata({
    title: textoPuro(titulo),
    description: textoPuro(intro),
    path: tipo ? `/modelos?tipo=${tipo}` : '/modelos',
  })
}

/** Always reachable from the menu (quick menu-modelos); empty state until a model is published. */
export default async function ModelsPage({ searchParams }: Props) {
  const tipo = parseTipo((await searchParams).tipo)
  const [all, t] = await Promise.all([getPublishedModels(), getTextos('modelos')])
  const models = filterByTipo(all, tipo)
  const { titulo, intro } = copyFor(t, tipo)
  return (
    <section aria-labelledby="titulo-modelos">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.chamadaTopo} linha /></p>
      <h1 id="titulo-modelos" className="type-display mt-2">
        <TextoRico valor={titulo} linha />
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted"><TextoRico valor={intro} linha /></p>
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
