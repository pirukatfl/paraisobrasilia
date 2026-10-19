import type { Metadata } from 'next'

import { ContactBlock } from '@/components/ContactBlock'
import { MapEmbed } from '@/components/MapEmbed'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getContact } from '@/lib/site/queries'

// Per request (no database at build); data from the tagged cache ('contact').
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Contato e como chegar',
  description: 'Endereço, mapa e WhatsApp do Paraíso Brasília, no Núcleo Rural Lago Oeste, Sobradinho – DF.',
  path: '/contato',
})

export default async function ContactPage() {
  const contact = await getContact()
  return (
    <section aria-labelledby="titulo-contato">
      <h1 id="titulo-contato" className="type-display">
        Contato e como chegar
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Estamos no Núcleo Rural Lago Oeste, em Sobradinho. Fale com a gente pelo WhatsApp para reservas e dúvidas.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ContactBlock contact={contact} />
        </div>
        <div className="lg:col-span-7">
          <MapEmbed lat={contact.lat} lng={contact.lng} />
        </div>
      </div>
    </section>
  )
}
