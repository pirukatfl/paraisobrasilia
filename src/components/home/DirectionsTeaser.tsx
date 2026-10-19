import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import { WhatsAppIcon } from '@/components/icons'
import { type ContactDTO, whatsappUrl } from '@/lib/site/contact'

/** Home "Como chegar" teaser: address, hours, link to /contato (no embedded map on the home: performance). */
export function DirectionsTeaser({ contact }: { contact: ContactDTO }) {
  return (
    <section aria-labelledby="titulo-como-chegar-home" className="mt-12 rounded-xl border border-line bg-surface p-4 lg:p-6">
      <h2 id="titulo-como-chegar-home" className="type-heading">
        Como chegar
      </h2>
      <address className="mt-4 flex flex-col not-italic">
        <span className="text-body">{contact.addressLine}</span>
        <span className="text-body">{contact.addressDetail}</span>
      </address>
      {contact.hours && <p className="type-label mt-4 text-gold">{contact.hours}</p>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/contato" className="btn-primary">
          Como chegar
        </Link>
        <ExternalLink
          href={whatsappUrl(contact.whatsapp)}
          className="type-label inline-flex min-h-11 items-center gap-2 text-accent underline-offset-4 hover:underline"
        >
          <WhatsAppIcon />
          Chamar no WhatsApp
        </ExternalLink>
      </div>
    </section>
  )
}
