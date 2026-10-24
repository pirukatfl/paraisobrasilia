import Image from 'next/image'
import Link from 'next/link'

import type { ContoCardDTO } from '@/lib/contos/dto'

/** One conto in a list: optional image, title, date, author nickname and the first lines (open part only). */
export function ContoCard({ conto, href }: { conto: ContoCardDTO; href: string }) {
  const titleId = `conto-${conto.slug}`
  return (
    <article aria-labelledby={titleId} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {conto.imagem && (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <Image
            src={conto.imagem.url}
            alt={conto.imagem.alt}
            width={conto.imagem.width}
            height={conto.imagem.height}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 id={titleId} className="type-heading">
          <Link href={href} className="hover:text-accent">
            {conto.title}
          </Link>
        </h2>
        {(conto.dateLabel || conto.assinadoComo) && (
          <p className="type-label mt-1 text-muted">
            {[conto.dateLabel, conto.assinadoComo ? `por ${conto.assinadoComo}` : ''].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="mt-3 flex-1 text-body text-muted">{conto.chamada}</p>
        <p className="mt-4">
          <Link href={href} className="type-label font-semibold text-accent underline underline-offset-4">
            Ler: {conto.title}
          </Link>
        </p>
      </div>
    </article>
  )
}
