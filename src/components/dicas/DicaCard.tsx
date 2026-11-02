import Image from 'next/image'
import Link from 'next/link'

import type { DicaCardDTO } from '@/lib/dicas/dto'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** One dica in a list: optional confirmed cover, title, date and resumo. */
export async function DicaCard({ dica, href, showImage = false }: { dica: DicaCardDTO; href: string; showImage?: boolean }) {
  const t = await getTextos('dicasHot')
  const titleId = `dica-${dica.slug}`
  return (
    <article aria-labelledby={titleId} className="group card-lift flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {showImage && dica.capa && (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden">
          <Image
            src={dica.capa.url}
            alt={dica.capa.alt}
            width={dica.capa.width}
            height={dica.capa.height}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full transition-transform duration-[400ms] ease-out-expo group-hover:scale-[1.03]"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 id={titleId} className="type-heading">
          <Link href={href} className="transition-colors duration-[var(--duration-fast)] group-hover:text-accent hover:text-accent">
            {dica.title}
          </Link>
        </h2>
        {dica.dateLabel && <p className="type-label mt-1 text-muted">{dica.dateLabel}</p>}
        <p className="mt-3 flex-1 text-body text-muted">{dica.resumo}</p>
        <p className="mt-4">
          <Link href={href} className="type-label font-semibold text-accent underline underline-offset-4">
            <TextoRico valor={t.cardLer} vars={{ titulo: dica.title }} linha />
          </Link>
        </p>
      </div>
    </article>
  )
}
