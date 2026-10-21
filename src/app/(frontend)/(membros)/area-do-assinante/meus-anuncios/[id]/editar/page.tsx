import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { AdForm } from '@/components/classisex/AdForm'
import { OwnerMediaManager } from '@/components/classisex/OwnerMediaManager'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { tierOf } from '@/lib/assinantes/tier'
import { salvarAnuncio } from '@/lib/classisex/actions'
import { MEDIA_OK_MESSAGES, uploadErrorMessage, batchNotice } from '@/lib/classisex/media-messages'
import { getActiveAdCategories, getOwnAdForEdit } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar anúncio',
  robots: { index: false, follow: false },
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function EditarAnuncioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ midia?: string | string[]; codigo?: string | string[]; ok?: string | string[]; falhas?: string | string[] }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const midia = one(query.midia)
  // Only fixed texts are shown: the URL carries a code, never a message
  const lote = midia === 'lote' ? batchNotice(one(query.ok), one(query.falhas), one(query.codigo)) : undefined
  const isError = midia === 'erro' || lote?.error === true
  const notice = lote ? lote.text : midia === 'erro' ? uploadErrorMessage(one(query.codigo)) : midia ? MEDIA_OK_MESSAGES[midia] : undefined
  const check = await requireActiveSubscription(`/area-do-assinante/meus-anuncios/${encodeURIComponent(id)}/editar`)
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      {notice && (
        <p
          role="alert"
          className={`mb-8 max-w-[680px] rounded-lg border px-4 py-2 text-body ${isError ? 'border-danger' : 'border-line bg-surface'}`}
        >
          {notice}
        </p>
      )}
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-editar-anuncio" className="type-display mt-2">
        Editar anúncio
      </h1>
    </>
  )
  const tier = tierOf(check.access)
  // Only the owner's ads; anything else is a plain 404 (T-04-04)
  const ad = await getOwnAdForEdit(check.assinante.id, id)
  if (!ad) notFound()
  const categories = await getActiveAdCategories()
  return (
    <section aria-labelledby="titulo-editar-anuncio">
      {header}
      {ad.status === 'rascunho' && (
        <p role="note" className="mt-6 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body">
          Este anúncio veio do site antigo. Os contatos que estavam no texto não aparecem para ninguém enquanto for
          rascunho; coloque WhatsApp ou Telegram nos campos e tire-os do texto.
        </p>
      )}
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
          apelido: ad.apelido,
          euSou: ad.euSou === null ? '' : String(ad.euSou),
          cidade: ad.cidade,
          texto: ad.texto,
          whatsapp: ad.whatsapp,
          telegram: ad.telegram,
        }}
      />
      <OwnerMediaManager adId={ad.id} media={ad.media} tier={tier} />
    </section>
  )
}
