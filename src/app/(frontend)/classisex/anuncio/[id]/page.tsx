import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Comentarios } from '@/components/classisex/Comentarios'
import { TextoRico } from '@/components/TextoRico'
import { CONVERSA_NA_AREA_ABERTA } from '@/lib/classisex/comentarios/rules'
import { getComentarios, getViewer } from '@/lib/classisex/comentarios/queries'
import { getPublicAd } from '@/lib/classisex/public'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'

// Per request: the session decides what the page shows; the data comes from tagged caches.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('classisex')
  // User-written content: not indexed, links still followed
  return { title: textoPuro(t.comentarioPaginaGoogleTitulo), robots: { index: false, follow: true } }
}

/**
 * One ad in the open area with its conversation (pedido do cliente 2026-11-03). The ad is the public
 * read model (text with contacts removed, cover photo); comments are redacted on the server for
 * everyone who is not an active subscriber. A hidden ad (pending, refused, unpublished) is a 404.
 */
export default async function AnuncioPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d{1,12}$/.test(id)) notFound()
  const adId = Number(id)
  const [t, ad, sessao] = await Promise.all([getTextos('classisex'), getPublicAd(adId), getViewer()])
  if (!ad) notFound()
  const comentarios = CONVERSA_NA_AREA_ABERTA
    ? await getComentarios(adId, { verContatos: sessao.verContatos, assinanteId: sessao.assinanteId })
    : null
  if (CONVERSA_NA_AREA_ABERTA && !comentarios) notFound()
  return (
    <article aria-labelledby="titulo-anuncio" className="max-w-[720px]">
      <h1 id="titulo-anuncio" className="type-display">
        {ad.apelido}
      </h1>
      <p className="type-label mt-2 text-muted">
        {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </p>
      {ad.foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- cover card, served as is
        <img
          src={ad.foto.previewUrl}
          alt="Foto do anúncio"
          width={480}
          height={360}
          decoding="async"
          className="mt-6 aspect-[4/3] w-full max-w-[480px] rounded-lg object-cover"
        />
      ) : null}
      {ad.texto && <p className="mt-6 whitespace-pre-line break-words text-body">{ad.texto}</p>}
      <p className="mt-6">
        {sessao.verContatos ? (
          <Link href={`/area-do-assinante/classisex/${ad.id}`} className="btn-primary">
            <TextoRico valor={t.comentarioVerCompleto} linha />
          </Link>
        ) : (
          <Link href="/assine-ja" className="btn-primary">
            <TextoRico valor={t.cardPublicoAssine} linha />
          </Link>
        )}
      </p>
      {comentarios && (
        <Comentarios
          adId={ad.id}
          comentarios={comentarios}
          viewer={sessao.viewer}
          verContatos={sessao.verContatos}
          entrarHref={`/entrar?next=${encodeURIComponent(`/classisex/anuncio/${ad.id}`)}`}
          textos={t}
        />
      )}
      <p className="mt-10">
        <Link href="/classisex" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.anuncioVoltar} linha />
        </Link>
      </p>
    </article>
  )
}
