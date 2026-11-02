import Link from 'next/link'

import { ContoImagem } from '@/components/contos/ContoImagem'
import type { ContoCardDTO } from '@/lib/contos/dto'
import { getTextos } from '@/lib/textos/queries'
import { juntarComPonto, TextoRico } from '@/components/TextoRico'

/** One conto in a list: optional image, title, date, author nickname and the first lines (open part only). Optional image fills a 460 px frame (cover). */
export async function ContoCard({ conto, href }: { conto: ContoCardDTO; href: string }) {
  const t = await getTextos('contos')
  const titleId = `conto-${conto.slug}`
  return (
    <article aria-labelledby={titleId} className="group card-lift flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {conto.imagem && (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <ContoImagem imagem={conto.imagem} card />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 id={titleId} className="type-heading">
          <Link href={href} className="transition-colors duration-[var(--duration-fast)] group-hover:text-accent hover:text-accent">
            {conto.title}
          </Link>
        </h2>
        {(conto.dateLabel || conto.assinadoComo) && (
          <p className="type-label mt-1 text-muted">
            {juntarComPonto([
            conto.dateLabel,
            conto.assinadoComo ? <TextoRico valor={t.contoPor} vars={{ nome: conto.assinadoComo }} linha /> : null,
          ])}
          </p>
        )}
        <p className="mt-3 flex-1 text-body text-muted">{conto.chamada}</p>
        <p className="mt-4">
          <Link href={href} className="type-label font-semibold text-accent underline underline-offset-4">
            <TextoRico valor={t.cardLer} vars={{ titulo: conto.title }} linha />
          </Link>
        </p>
      </div>
    </article>
  )
}
