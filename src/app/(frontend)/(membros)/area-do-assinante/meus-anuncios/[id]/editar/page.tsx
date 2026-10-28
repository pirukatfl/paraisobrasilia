import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { AdForm } from '@/components/classisex/AdForm'
import { OwnerMediaManager } from '@/components/classisex/OwnerMediaManager'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { tierOf } from '@/lib/assinantes/tier'
import { salvarAnuncio } from '@/lib/classisex/actions'
import { uploadErrorMessage, batchNotice } from '@/lib/classisex/media-messages'
import { getActiveAdCategories, getOwnAdForEdit } from '@/lib/classisex/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('meusAnuncios')
  return { title: textoPuro(t.editarGoogleTitulo), robots: { index: false, follow: false } }
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
  const t = await getTextos('meusAnuncios')
  const mediaOk: Record<string, ReactNode> = {
    'foto-ok': <TextoRico valor={t.midiaFotoOk} linha />,
    'video-ok': <TextoRico valor={t.midiaVideoOk} linha />,
    capa: <TextoRico valor={t.midiaCapaOk} linha />,
    removida: <TextoRico valor={t.midiaRemovidaOk} linha />,
  }
  const midia = one(query.midia)
  // Only fixed texts are shown: the URL carries a code, never a message
  const lote = midia === 'lote' ? batchNotice(one(query.ok), one(query.falhas), one(query.codigo)) : undefined
  const isError = midia === 'erro' || lote?.error === true
  const notice = lote ? lote.text : midia === 'erro' ? uploadErrorMessage(one(query.codigo)) : midia ? mediaOk[midia] : undefined
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
      <p className="type-eyebrow text-muted"><TextoRico valor={t.topo} linha /></p>
      <h1 id="titulo-editar-anuncio" className="type-display mt-2">
        <TextoRico valor={t.editarTitulo} linha />
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
      {ad.legacy && (
        <TextoRico valor={t.editarAvisoAntigo} role="note" className="mt-6 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body" />
      )}
      {ad.status === 'rascunho' && (
        <TextoRico valor={t.editarAvisoRascunho} role="note" className="mt-6 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body" />
      )}
      {ad.status === 'aprovado' ? (
        <p role="note" className="mt-6 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body">
          <TextoRico valor={t.editarAvisoPublicado} linha />
        </p>
      ) : (
        <p className="mt-4 max-w-[680px] text-body text-muted"><TextoRico valor={t.editarAvisoSalvar} linha /></p>
      )}
      <AdForm
        textos={t}
        action={salvarAnuncio}
        categories={categories}
        adId={ad.id}
        legacy={ad.legacy}
        initial={{
          apelido: ad.apelido,
          euSou: ad.euSou === null ? '' : String(ad.euSou),
          cidade: ad.cidade,
          texto: ad.texto,
          whatsapp: ad.whatsapp,
          telegram: ad.telegram,
          emailContato: ad.emailContato,
          links: ad.links,
          observacao: ad.observacao,
        }}
      />
      <OwnerMediaManager adId={ad.id} media={ad.media} tier={tier} legacy={ad.legacy} />
    </section>
  )
}
