import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PartyDetails } from '@/components/party/PartyDetails'
import { formatPartyDate, formatPartyTime } from '@/lib/format/date'
import { getAllPartySlugs, getPartyBySlug } from '@/lib/parties/queries'

export const revalidate = 600

export async function generateStaticParams() {
  const slugs = await getAllPartySlugs()
  return slugs.map((slug) => ({ slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PartyPage({ params }: Props) {
  const { slug } = await params
  const party = await getPartyBySlug(slug)
  if (!party) notFound()

  const ratio = party.flyerFormat === 'square' ? 'aspect-square' : 'aspect-[4/5]'

  return (
    <article className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className={`relative ${ratio} w-full overflow-hidden rounded-lg lg:sticky lg:top-8`}>
          <Image
            src={party.flyer.url}
            alt={party.flyer.alt}
            width={party.flyer.width}
            height={party.flyer.height}
            sizes="(max-width: 1024px) 100vw, 40vw"
            priority
            className="h-full w-full object-cover"
          />
        </div>
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
