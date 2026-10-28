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
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** Address card with "Como chegar" and WhatsApp buttons (UI-SPEC S8). */
export async function ContactBlock({ contact }: { contact: ContactDTO }) {
  const t = await getTextos('contato')
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
          {contact.postalCode && <span className="text-body text-muted"><TextoRico valor={t.cep} vars={{ cep: contact.postalCode }} linha /></span>}
        </span>
      </address>
      {contact.hours && <p className="type-label mt-4 text-gold">{contact.hours}</p>}

      <div className="mt-6 flex flex-col gap-2">
        <ExternalLink href={googleMapsUrl(contact)} className="btn-primary w-full">
          <TextoRico valor={t.botaoGoogleMaps} linha />
        </ExternalLink>
        <ExternalLink href={wazeUrl(contact)} className="btn-primary w-full">
          <TextoRico valor={t.botaoWaze} linha />
        </ExternalLink>
        <ExternalLink href={whatsappUrl(contact.whatsapp)} className="btn-primary w-full gap-2">
          <WhatsAppIcon />
          <TextoRico valor={t.botaoWhatsapp} linha />
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
              <TextoRico valor={t.instagram} vars={{ usuario: contact.instagram ?? '' }} linha />
            </ExternalLink>
          </li>
        )}
      </ul>
    </div>
  )
}
