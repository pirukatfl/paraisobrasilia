import Link from 'next/link'

import type { ContoCardDTO } from '@/lib/contos/dto'

/** One conto in a list: title, date and the first lines (open part only). */
export function ContoCard({ conto, href }: { conto: ContoCardDTO; href: string }) {
  const titleId = `conto-${conto.slug}`
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <h2 id={titleId} className="type-heading">
        <Link href={href} className="hover:text-accent">
          {conto.title}
        </Link>
      </h2>
      {conto.dateLabel && <p className="type-label mt-1 text-muted">{conto.dateLabel}</p>}
      <p className="mt-3 flex-1 text-body text-muted">{conto.chamada}</p>
      <p className="mt-4">
        <Link href={href} className="type-label font-semibold text-accent underline underline-offset-4">
          Ler: {conto.title}
        </Link>
      </p>
    </article>
  )
}
