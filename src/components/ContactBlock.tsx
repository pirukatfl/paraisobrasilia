import { ExternalLink } from '@/components/ExternalLink'
import { InstagramIcon, MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from '@/components/icons'
import {
  type ContactDTO,
  googleMapsUrl,
  instagramUrl,
  telUrl,
  wazeUrl,
  whatsappUrl,
} from '@/lib/site/contact'

/** Address card with "Como chegar" and WhatsApp buttons (UI-SPEC S8). */
export function ContactBlock({ contact }: { contact: ContactDTO }) {
  const instagram = instagramUrl(contact.instagram)
  const textLink =
    'type-label inline-flex min-h-11 items-center gap-2 text-text underline-offset-4 hover:text-accent hover:underline'
  return (
    <div className="rounded-xl border border-line bg-surface p-4 lg:p-6">
      <address className="flex gap-2 not-italic">
        <MapPinIcon className="mt-0.5 shrink-0 text-muted" />
        <span className="flex flex-col">
          <span className="text-body">{contact.addressLine}</span>
          <span className="text-body">{contact.addressDetail}</span>
          {contact.postalCode && <span className="text-body text-muted">CEP {contact.postalCode}</span>}
        </span>
      </address>
      {contact.hours && <p className="type-label mt-4 text-gold">{contact.hours}</p>}

      <div className="mt-6 flex flex-col gap-2">
        <ExternalLink href={googleMapsUrl(contact)} className="btn-primary w-full">
          Como chegar — Google Maps
        </ExternalLink>
        <ExternalLink href={wazeUrl(contact)} className="btn-primary w-full">
          Como chegar — Waze
        </ExternalLink>
        <ExternalLink href={whatsappUrl(contact.whatsapp)} className="btn-primary w-full gap-2">
          <WhatsAppIcon />
          Chamar no WhatsApp
        </ExternalLink>
      </div>

      <ul className="mt-4 flex flex-col">
        {contact.phone && (
          <li>
            <a href={telUrl(contact.whatsapp)} className={textLink}>
              <PhoneIcon className="text-muted" />
              <span>
                <span className="sr-only">Telefone: </span>
                {contact.phone}
              </span>
            </a>
          </li>
        )}
        {contact.email && (
          <li>
            <a href={`mailto:${contact.email}`} className={textLink}>
              <MailIcon className="text-muted" />
              <span>
                <span className="sr-only">E-mail: </span>
                {contact.email}
              </span>
            </a>
          </li>
        )}
        {instagram && (
          <li>
            <ExternalLink href={instagram} className={textLink}>
              <InstagramIcon className="text-muted" />
              Instagram @{contact.instagram}
            </ExternalLink>
          </li>
        )}
      </ul>
    </div>
  )
}
