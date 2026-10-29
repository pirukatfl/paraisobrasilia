import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FlyerFrame } from '@/components/party/FlyerFrame'
import { PartyDetails } from '@/components/party/PartyDetails'
import { formatPartyDate, formatPartyTime } from '@/lib/format/date'
import { getPartyBySlug } from '@/lib/parties/queries'
import { buildPartyMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

// Rendered per request, like every other public page: the root layout reads the session
// cookie (logged-in menu, renewal banner), so ISR here failed at runtime with
// "Page changed from static to dynamic". The party data stays in the Next data cache
// (tag 'party:{slug}'), so staff edits still show at once.
export const dynamic = 'force-dynamic'

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
  const t = await getTextos('festas')

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
          <TextoRico valor={t.voltar} linha />
        </Link>

        <p className="type-label mt-4 flex flex-col gap-2 text-gold">
          <span>{formatPartyDate(party.startsAt)}</span>
          <span><TextoRico valor={t.horario} vars={{ hora: formatPartyTime(party.startsAt) }} linha /></span>
        </p>

        {party.isPast && (
          <p className="type-label mt-4 inline-block rounded border border-danger px-2 py-1 text-danger">
            <TextoRico valor={t.jaAconteceu} linha />
          </p>
        )}

        <h1 className="type-display mt-4">{party.title}</h1>

        {party.summary && <p className="mt-4 text-body text-muted">{party.summary}</p>}

        <PartyDetails party={party} />

        {party.isPast && (
          <Link href="/" className="btn-primary mt-12">
            <TextoRico valor={t.botaoProximas} linha />
          </Link>
        )}
      </div>
    </article>
  )
}
