import Link from 'next/link'

import { pathForKey } from '@/lib/pages/keys'
import { getTextos } from '@/lib/textos/queries'

/** Home "Quem somos" teaser: intro of the quem-somos page (staff-editable). */
export async function AboutTeaser({ intro }: { intro: string | null }) {
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-quem-somos-home" className="mt-12 rounded-xl border border-line bg-surface p-4 lg:p-6">
      <h2 id="titulo-quem-somos-home" className="type-heading">
        {t.quemSomosTitulo}
      </h2>
      <p className="mt-4 max-w-[680px] text-body">{intro ?? t.quemSomosTextoReserva}</p>
      <Link href={pathForKey('quem-somos')} className="btn-secondary mt-6">
        {t.quemSomosBotao}
      </Link>
    </section>
  )
}
