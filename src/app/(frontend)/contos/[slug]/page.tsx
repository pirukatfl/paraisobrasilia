import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { RichText } from '@/components/RichText'
import { getPublicConto } from '@/lib/contos/public'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { juntarComPonto, TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Per request (no database at build); data from the tagged cache ('conto:{slug}').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const conto = await getPublicConto((await params).slug)
  if (!conto) return { title: textoPuro((await getTextos('contos')).googleContoNaoEncontrado) }
  // T-05-01: the description comes from the open text only
  return buildPageMetadata({ title: conto.title, description: conto.description, path: `/contos/${conto.slug}` })
}

/** Public excerpt of a conto (PREV-03, PREV-04): only the open blocks ever reach this render. */
export default async function ContoPublicPage({ params }: Props) {
  const conto = await getPublicConto((await params).slug)
  if (!conto) notFound()
  const t = await getTextos('contos')
  return (
    <article aria-labelledby="titulo-conto" className="max-w-[720px]">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.contoEyebrow} linha /></p>
      <h1 id="titulo-conto" className="type-display mt-2">
        {conto.title}
      </h1>
      {(conto.dateLabel || conto.assinadoComo) && (
        <p className="type-label mt-2 text-muted">
          {juntarComPonto([
            conto.dateLabel,
            conto.assinadoComo ? <TextoRico valor={t.contoPor} vars={{ nome: conto.assinadoComo }} linha /> : null,
          ])}
        </p>
      )}
      {conto.imagem && (
        <Image
          src={conto.imagem.url}
          alt={conto.imagem.alt}
          width={conto.imagem.width}
          height={conto.imagem.height}
          sizes="(min-width: 768px) 720px, 100vw"
          priority
          className="mt-6 h-auto w-full rounded-xl"
        />
      )}
      <div className="mt-6">
        <RichText data={conto.open} />
      </div>
      {conto.hasMore && (
        <AssineJaCta
          title={<TextoRico valor={t.contoCtaTitulo} linha />}
          text={t.contoCtaTexto}
          membersHref={`/area-do-assinante/contos/${conto.slug}`}
          membersLabel={<TextoRico valor={t.contoCtaBotao} linha />}
        />
      )}
      <p className="mt-10">
        <Link href="/contos" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.contoVoltar} linha />
        </Link>
      </p>
    </article>
  )
}
