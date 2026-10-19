import { ExternalLink } from '@/components/ExternalLink'
import type { MemberAdDTO } from '@/lib/classisex/dto'

/** Contact buttons of a full ad (members only, D-05). Only the filled contacts appear. */
export function ContactLinks({ contato }: { contato: MemberAdDTO['contato'] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {contato.whatsapp && (
        <ExternalLink href={contato.whatsapp.href} className="btn-primary">
          WhatsApp
        </ExternalLink>
      )}
      {contato.telegram && (
        <ExternalLink href={contato.telegram.href} className="btn-secondary">
          Telegram {contato.telegram.label}
        </ExternalLink>
      )}
      {contato.email && (
        <a href={contato.email.href} className="btn-secondary">
          E-mail {contato.email.label}
        </a>
      )}
    </div>
  )
}
