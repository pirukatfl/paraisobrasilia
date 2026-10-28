import Link from 'next/link'

import type { DicaCardDTO } from '@/lib/dicas/dto'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** Home "Dicas Hot": the newest few, text only (keeps the home light). Hidden when none are published. */
export async function DicasTeaser({ dicas }: { dicas: DicaCardDTO[] }) {
  if (dicas.length === 0) return null
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-dicas-home" className="mt-12 rounded-xl border border-line bg-surface p-4 lg:p-6">
      <h2 id="titulo-dicas-home" className="type-heading">
        <TextoRico valor={t.dicasTitulo} linha />
      </h2>
      <ul className="mt-4 flex max-w-[680px] flex-col gap-3">
        {dicas.slice(0, 3).map((d) => (
          <li key={d.slug}>
            <Link href={`/dicas-hot/${d.slug}`} className="type-label font-semibold hover:text-accent">
              {d.title}
            </Link>
            {d.dateLabel && <span className="type-label ml-2 text-muted">{d.dateLabel}</span>}
          </li>
        ))}
      </ul>
      <Link href="/dicas-hot" className="btn-secondary mt-6">
        <TextoRico valor={t.dicasBotao} linha />
      </Link>
    </section>
  )
}
