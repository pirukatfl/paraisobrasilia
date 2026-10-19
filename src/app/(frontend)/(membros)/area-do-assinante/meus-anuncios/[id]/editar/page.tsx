import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { AdForm } from '@/components/classisex/AdForm'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { salvarAnuncio } from '@/lib/classisex/actions'
import { getActiveAdCategories, getOwnAdForEdit } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar anúncio',
  robots: { index: false, follow: false },
}

export default async function EditarAnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const check = await requireActiveSubscription(`/area-do-assinante/meus-anuncios/${encodeURIComponent(id)}/editar`)
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-editar-anuncio" className="type-display mt-2">
        Editar anúncio
      </h1>
    </>
  )
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-editar-anuncio">
        {header}
        <InactivePanel access={check.access} />
      </section>
    )
  }
  // Only the owner's ads; anything else is a plain 404 (T-04-04)
  const ad = await getOwnAdForEdit(check.assinante.id, id)
  if (!ad) notFound()
  const categories = await getActiveAdCategories()
  return (
    <section aria-labelledby="titulo-editar-anuncio">
      {header}
      {ad.status === 'aprovado' ? (
        <p role="note" className="mt-6 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body">
          Ao salvar, o anúncio sai do ar até a equipe aprovar de novo.
        </p>
      ) : (
        <p className="mt-4 max-w-[680px] text-body text-muted">
          Ao salvar, o anúncio vai para a análise da equipe.
        </p>
      )}
      <AdForm
        action={salvarAnuncio}
        categories={categories}
        adId={ad.id}
        initial={{
          euSou: ad.euSou === null ? '' : String(ad.euSou),
          cidade: ad.cidade,
          texto: ad.texto,
          whatsapp: ad.whatsapp,
          telegram: ad.telegram,
          email: ad.email,
        }}
      />
    </section>
  )
}
