import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { RichText } from '@/components/RichText'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { getMemberDica } from '@/lib/dicas/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dica Hot',
  robots: { index: false, follow: false },
}

/** Full dica for active subscribers (PREV-03). Unknown or unpublished slugs are a plain 404. */
export default async function MembrosDicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const check = await requireActiveSubscription(`/area-do-assinante/dicas-hot/${encodeURIComponent(slug)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-dica">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <p className="type-eyebrow text-muted">Área do assinante</p>
        <h1 id="titulo-dica" className="type-display mt-2">
          Dicas Hot
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const dica = await getMemberDica(slug)
  if (!dica) notFound()
  return (
    <article aria-labelledby="titulo-dica" className="max-w-[720px]">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Dicas Hot</p>
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
          sizes="(min-width: 768px) 720px, 100vw"
          className="mt-6 h-auto w-full rounded-xl"
        />
      )}
      <div className="mt-6">
        <RichText data={dica.texto} />
      </div>
      <p className="mt-10">
        <Link href="/area-do-assinante/dicas-hot" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Voltar para as Dicas Hot
        </Link>
      </p>
    </article>
  )
}
