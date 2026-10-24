import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { RichText } from '@/components/RichText'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { getMemberConto } from '@/lib/contos/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conto',
  robots: { index: false, follow: false },
}

/** Full conto for active subscribers (PREV-03). Unknown or unpublished slugs are a plain 404. */
export default async function MembrosContoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const check = await requireActiveSubscription(`/area-do-assinante/contos/${encodeURIComponent(slug)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-conto">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <p className="type-eyebrow text-muted">Área do assinante</p>
        <h1 id="titulo-conto" className="type-display mt-2">
          Contos
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
      <p className="type-eyebrow text-muted">Contos</p>
      <h1 id="titulo-conto" className="type-display mt-2">
        {conto.title}
      </h1>
      {(conto.dateLabel || conto.assinadoComo) && (
        <p className="type-label mt-2 text-muted">
          {[conto.dateLabel, conto.assinadoComo ? `por ${conto.assinadoComo}` : ''].filter(Boolean).join(' · ')}
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
          Voltar para os contos
        </Link>
      </p>
    </article>
  )
}
