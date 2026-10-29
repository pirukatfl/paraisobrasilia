import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { DicaCard } from '@/components/dicas/DicaCard'
import { DicaJsonLd } from '@/components/dicas/DicaJsonLd'
import { RichText } from '@/components/RichText'
import { getLatestDicas, getPublicDica } from '@/lib/dicas/public'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'
import { TextoRico } from '@/components/TextoRico'

// Per request (no database at build); data from the tagged cache ('dica:{slug}').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dica = await getPublicDica((await params).slug)
  if (!dica) return { title: textoPuro((await getTextos('dicasHot')).googleDicaNaoEncontrada) }
  return buildPageMetadata({
    title: dica.title,
    description: dica.description,
    path: `/dicas-hot/${dica.slug}`,
    image: dica.ogImage ?? undefined,
  })
}

/** Public excerpt of a dica (same paywall as contos): only the open blocks ever reach this render. */
export default async function DicaPublicPage({ params }: Props) {
  const slug = (await params).slug
  const dica = await getPublicDica(slug)
  if (!dica) notFound()
  const t = await getTextos('dicasHot')
  const latest = await getLatestDicas(4).catch(() => [])
  const related = latest.filter((d) => d.slug !== dica.slug).slice(0, 3)
  return (
    <>
      <article aria-labelledby="titulo-dica" className="max-w-[720px]">
        <p className="type-eyebrow text-muted">
          <Link href="/dicas-hot" className="hover:text-accent">
            <TextoRico valor={t.dicaEyebrow} linha />
          </Link>
        </p>
        <h1 id="titulo-dica" className="type-display mt-2">
          {dica.title}
        </h1>
        {dica.dateLabel && <p className="type-label mt-2 text-muted">{dica.dateLabel}</p>}
        {dica.capa && (
          <Image
            src={dica.capa.url}
            alt={dica.capa.alt}
            width={dica.capa.width}
            height={dica.capa.height}
            priority
            sizes="(min-width: 768px) 720px, 100vw"
            className="mt-6 h-auto w-full rounded-xl"
          />
        )}
        <div className="mt-6">
          <RichText data={dica.open} />
        </div>
        {dica.hasMore && (
          <AssineJaCta
            title={<TextoRico valor={t.dicaCtaTitulo} linha />}
            text={t.dicaCtaTexto}
            membersHref={`/area-do-assinante/dicas-hot/${dica.slug}`}
            membersLabel={<TextoRico valor={t.dicaCtaBotao} linha />}
          />
        )}
      </article>
      {related.length > 0 && (
        <section aria-labelledby="titulo-leia-tambem" className="mt-12">
          <h2 id="titulo-leia-tambem" className="type-heading">
            <TextoRico valor={t.leiaTambem} linha />
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {related.map((d) => (
              <DicaCard key={d.slug} dica={d} href={`/dicas-hot/${d.slug}`} />
            ))}
          </div>
        </section>
      )}
      <p className="mt-10">
        <Link href="/dicas-hot" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.dicaVoltar} linha />
        </Link>
      </p>
      <DicaJsonLd dica={dica} />
    </>
  )
}
