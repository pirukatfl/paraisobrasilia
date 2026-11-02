import Link from 'next/link'

import { linkarEstado } from '@/lib/site/links'
import { pathForKey } from '@/lib/pages/keys'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import type { TextoRico as EstadoRico } from '@/lib/textos/rico'

/** Home "Quem somos" teaser: intro of the quem-somos page (staff-editable). */
export async function AboutTeaser({ intro }: { intro: EstadoRico | null }) {
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-quem-somos-home" className="mt-12 rounded-xl border border-line bg-surface p-4 lg:p-6">
      <h2 id="titulo-quem-somos-home" className="type-heading">
        <TextoRico valor={t.quemSomosTitulo} linha />
      </h2>
      {/* "contos" and "fotos e vídeos" lead to the send pages, highlighted (same rule as the promotion) */}
      <TextoRico
        valor={intro ? linkarEstado(intro) : t.quemSomosTextoReserva}
        className="mt-4 max-w-[680px] text-body [&_a]:font-bold"
      />
      <Link href={pathForKey('quem-somos')} className="btn-secondary mt-6">
        <TextoRico valor={t.quemSomosBotao} linha />
      </Link>
    </section>
  )
}
