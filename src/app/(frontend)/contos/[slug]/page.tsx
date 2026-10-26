import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { RichText } from '@/components/RichText'
import { getPublicConto } from '@/lib/contos/public'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

// Per request (no database at build); data from the tagged cache ('conto:{slug}').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const conto = await getPublicConto((await params).slug)
  if (!conto) return { title: (await getTextos('contos')).googleContoNaoEncontrado }
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
      <p className="type-eyebrow text-muted">{t.contoEyebrow}</p>
      <h1 id="titulo-conto" className="type-display mt-2">
        {conto.title}
      </h1>
      {(conto.dateLabel || conto.assinadoComo) && (
        <p className="type-label mt-2 text-muted">
          {[conto.dateLabel, conto.assinadoComo ? preencher(t.contoPor, { nome: conto.assinadoComo }) : ''].filter(Boolean).join(' · ')}
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
          title={t.contoCtaTitulo}
          text={t.contoCtaTexto}
          membersHref={`/area-do-assinante/contos/${conto.slug}`}
          membersLabel={t.contoCtaBotao}
        />
      )}
      <p className="mt-10">
        <Link href="/contos" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          {t.contoVoltar}
        </Link>
      </p>
    </article>
  )
}
