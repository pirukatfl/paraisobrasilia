import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { PartyDetails } from '@/components/party/PartyDetails'
import { formatPartyDate, formatPartyTime } from '@/lib/format/date'
import { getPartyBySlug } from '@/lib/parties/queries'
import { buildPartyMetadata } from '@/lib/seo/metadata'

// ISR on demand: no page is prerendered at build (the Docker/CI build has no database).
// Each party page is generated on its first request, cached, and expired by the
// 'party:{slug}' tag on publish/edit/unpublish or after 600 s.
export const revalidate = 600
export const dynamicParams = true

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return []
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const party = await getPartyBySlug(slug)
  if (!party) return { title: 'Página não encontrada' }
  return buildPartyMetadata(party)
}

export default async function PartyPage({ params }: Props) {
  const { slug } = await params
  const party = await getPartyBySlug(slug)
  if (!party) notFound()

  return (
    <article className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <FlyerFrame
          flyer={party.flyer}
          sizes="(max-width: 1024px) 100vw, 40vw"
          priority
          minRatio={0}
          maxHeightClass="max-h-[85vh]"
          className="rounded-lg lg:sticky lg:top-8"
        />
      </div>

      <div className="max-w-[680px] lg:col-span-7">
        <Link href="/" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          ← Ver todas as festas
        </Link>

        <p className="type-label mt-4 flex flex-col gap-2 text-gold">
          <span>{formatPartyDate(party.startsAt)}</span>
          <span>A partir das {formatPartyTime(party.startsAt)}</span>
        </p>

        {party.isPast && (
          <p className="type-label mt-4 inline-block rounded border border-danger px-2 py-1 text-danger">
            Esta festa já aconteceu
          </p>
        )}

        <h1 className="type-display mt-4">{party.title}</h1>

        {party.summary && <p className="mt-4 text-body text-muted">{party.summary}</p>}

        <PartyDetails party={party} />

        {party.isPast && (
          <Link href="/" className="btn-primary mt-12">
            Ver próximas festas
          </Link>
        )}
      </div>
    </article>
  )
}
