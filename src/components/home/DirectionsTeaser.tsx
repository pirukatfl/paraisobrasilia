import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import { WhatsAppIcon } from '@/components/icons'
import { type ContactDTO, googleMapsEmbedUrl, whatsappUrl } from '@/lib/site/contact'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** Home "Como chegar" teaser: address, hours, link to /contato with a lazy Google Maps embed when coordinates are set. */
export async function DirectionsTeaser({ contact }: { contact: ContactDTO }) {
  const t = await getTextos('inicio')
  return (
    <section aria-labelledby="titulo-como-chegar-home" className="mt-12 rounded-xl border border-line bg-surface p-4 lg:p-6">
      <h2 id="titulo-como-chegar-home" className="type-heading">
        <TextoRico valor={t.comoChegarTitulo} linha />
      </h2>
      <address className="mt-4 flex flex-col not-italic">
        <span className="text-body">{contact.addressLine}</span>
        <span className="text-body">{contact.addressDetail}</span>
      </address>
      {contact.hours && <p className="type-label mt-4 text-gold">{contact.hours}</p>}
      {contact.lat !== null && contact.lng !== null && (
        <iframe
          title="Mapa com a localização do Paraíso Brasília"
          src={googleMapsEmbedUrl(contact.lat, contact.lng)}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer"
          className="mt-6 aspect-[4/3] w-full rounded-xl border border-line bg-surface lg:aspect-[16/7]"
        />
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/contato" className="btn-primary">
          <TextoRico valor={t.comoChegarBotao} linha />
        </Link>
        <ExternalLink
          href={whatsappUrl(contact.whatsapp)}
          className="type-label inline-flex min-h-11 items-center gap-2 text-accent underline-offset-4 hover:underline"
        >
          <WhatsAppIcon />
          <TextoRico valor={t.comoChegarWhatsapp} linha />
        </ExternalLink>
      </div>
    </section>
  )
}
