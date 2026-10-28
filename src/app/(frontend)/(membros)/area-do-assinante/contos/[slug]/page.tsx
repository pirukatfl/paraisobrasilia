import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { RichText } from '@/components/RichText'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { getMemberConto } from '@/lib/contos/queries'
import { getTextos } from '@/lib/textos/queries'
import { juntarComPonto, TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('contos')
  return { title: textoPuro(t.membrosGoogleConto), robots: { index: false, follow: false } }
}

/** Full conto for active subscribers (PREV-03). Unknown or unpublished slugs are a plain 404. */
export default async function MembrosContoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = await getTextos('contos')
  const check = await requireActiveSubscription(`/area-do-assinante/contos/${encodeURIComponent(slug)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-conto">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <p className="type-eyebrow text-muted"><TextoRico valor={t.membrosEyebrow} linha /></p>
        <h1 id="titulo-conto" className="type-display mt-2">
          <TextoRico valor={t.membrosTitulo} linha />
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const conto = await getMemberConto(slug)
  if (!conto) notFound()
  return (
    <article aria-labelledby="titulo-conto" className="max-w-[720px]">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
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
        <RichText data={conto.texto} />
      </div>
      <p className="mt-10">
        <Link href="/area-do-assinante/contos" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.contoVoltar} linha />
        </Link>
      </p>
    </article>
  )
}
