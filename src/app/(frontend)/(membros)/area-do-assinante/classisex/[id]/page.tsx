import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { ContactLinks } from '@/components/classisex/ContactLinks'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { MediaGallery } from '@/components/classisex/MediaGallery'
import { ReportForm } from '@/components/classisex/ReportForm'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { getMemberAd, isOwnAd } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Anúncio do ClassiSex',
  robots: { index: false, follow: false },
}

/** Full ad with contacts (CLAS-02, D-05). Hidden ads (pending, expired author…) are a plain 404. */
export default async function AnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await requireActiveSubscription(`/area-do-assinante/classisex/${encodeURIComponent(id)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-anuncio">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <p className="type-eyebrow text-muted">Área do assinante</p>
        <h1 id="titulo-anuncio" className="type-display mt-2">
          ClassiSex
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const ad = await getMemberAd(id)
  if (!ad) notFound()
  // Only a boolean reaches the client component, never the author (T-04-12)
  const canReport = !(await isOwnAd(check.assinante.id, id))
  return (
    <article aria-labelledby="titulo-anuncio" className="max-w-[720px]">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">ClassiSex</p>
      <h1 id="titulo-anuncio" className="type-display mt-2">
        {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </h1>
      <p className="type-label mt-2 text-muted">Publicado em {ad.publishedLabel}</p>
      <MediaGallery fotos={ad.fotos} video={ad.video} />
      <p className="mt-6 whitespace-pre-line text-body">{ad.texto}</p>
      <section aria-labelledby="titulo-contato" className="mt-8">
        <h2 id="titulo-contato" className="type-heading mb-4">
          Contato
        </h2>
        <ContactLinks contato={ad.contato} />
      </section>
      {canReport && <ReportForm adId={ad.id} />}
      <p className="mt-10">
        <Link href="/area-do-assinante/classisex" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Voltar para o ClassiSex
        </Link>
      </p>
    </article>
  )
}
