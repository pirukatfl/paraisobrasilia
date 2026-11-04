import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Gallery } from '@/components/Gallery'
import { contactHref } from '@/lib/gallery/contact'
import { countLabel } from '@/components/ModelGrid'
import { getModelContactForViewer, getPublishedModel, lockModelItems, viewerIsActiveSubscriber } from '@/lib/gallery/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'
import { TextoRico } from '@/components/TextoRico'

// Per request (no database at build); data from the tagged cache ('models').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getPublishedModel((await params).slug)
  if (!model) return { title: 'Modelo não encontrada' }
  return buildPageMetadata({
    title: model.name,
    description: model.description ?? preencher(textoPuro((await getTextos('modelos')).descricaoReserva), { nome: model.name }),
    path: `/modelos/${model.slug}`,
    image: model.ogImage ?? undefined,
  })
}

/** MIDIA-07: one page per published model — name, short description, optional contact (active subscribers only) and the photo gallery. */
export default async function ModelPage({ params }: Props) {
  const model = await getPublishedModel((await params).slug)
  if (!model) notFound()
  const [t, contact, assinanteAtivo] = await Promise.all([
    getTextos('modelos'),
    getModelContactForViewer(model.slug),
    viewerIsActiveSubscriber(),
  ])
  const items = lockModelItems(model.items, assinanteAtivo)
  const fotosTrancadas = items.some((i) => i.locked)
  const convite = !contact && model.hasContact
  return (
    <article aria-labelledby="titulo-modelo">
      <p className="type-eyebrow text-muted">
        <Link href="/modelos" className="hover:text-accent">
          <TextoRico valor={t.linkLista} linha />
        </Link>
      </p>
      <h1 id="titulo-modelo" className="type-display mt-2">
        {model.name}
      </h1>
      <p className="type-label mt-2 text-muted">{countLabel(model.photoCount, model.videoCount, t)}</p>
      {model.description && (
        <p className="mt-4 max-w-[680px] whitespace-pre-line text-body text-muted">{model.description}</p>
      )}
      {contact && (
        <p className="mt-4 text-body">
          <span className="type-label text-muted">Contato: </span>
          {contactHref(contact) ? (
            <a
              href={contactHref(contact) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-accent"
            >
              {contact}
            </a>
          ) : (
            <span>{contact}</span>
          )}
        </p>
      )}
      {fotosTrancadas && (
        <p className="mt-4 text-body text-muted">
          Só a primeira foto é aberta ao público. As demais são exclusivas para assinantes.{' '}
          <Link href="/assine-ja" className="underline underline-offset-4 hover:text-accent">
            Assine já
          </Link>
          .
        </p>
      )}
      <Gallery items={items} contact={contact} />
      <p className="mt-12">
        <Link href="/modelos" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.linkVerTodas} linha />
        </Link>
      </p>
    </article>
  )
}
