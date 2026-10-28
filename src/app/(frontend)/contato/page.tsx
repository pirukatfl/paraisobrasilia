import type { Metadata } from 'next'

import { ContactBlock } from '@/components/ContactBlock'
import { MapEmbed } from '@/components/MapEmbed'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

// Per request (no database at build); data from the tagged cache ('contact').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('contato')
  return buildPageMetadata({ title: t.titulo, description: t.descricaoGoogle, path: '/contato' })
}

export default async function ContactPage() {
  const [contact, t] = await Promise.all([getContact(), getTextos('contato')])
  return (
    <section aria-labelledby="titulo-contato">
      <h1 id="titulo-contato" className="type-display">
        {t.titulo}
      </h1>
      <TextoRico valor={t.intro} className="mt-4 max-w-[680px] text-body text-muted" />
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
