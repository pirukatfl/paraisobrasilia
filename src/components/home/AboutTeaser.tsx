import Link from 'next/link'

import { pathForKey } from '@/lib/pages/keys'

/** Home "Quem somos" teaser: intro of the quem-somos page (staff-editable). */
export function AboutTeaser({ intro }: { intro: string | null }) {
  return (
    <section aria-labelledby="titulo-quem-somos-home" className="mt-12 rounded-xl border border-line bg-surface p-4 lg:p-6">
      <h2 id="titulo-quem-somos-home" className="type-heading">
        Quem somos
      </h2>
      <p className="mt-4 max-w-[680px] text-body">
        {intro ?? 'Uma casa de festas liberais com discrição, respeito e liberdade. Conheça o Paraíso.'}
      </p>
      <Link href={pathForKey('quem-somos')} className="btn-secondary mt-6">
        Conheça a casa
      </Link>
    </section>
  )
}
