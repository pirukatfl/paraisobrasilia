import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import type { AccessStatus } from '@/lib/assinantes/access'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

/** Restricted ClassiSex pages without active access: status panel only, no restricted markup (T-03-05). */
export async function InactivePanel({ access }: { access: AccessStatus }) {
  const contact = await getContact()
  return (
    <div className="mt-8">
      <SubscriptionStatus
        access={access}
        whatsappHref={contact.whatsapp ? whatsappUrl(contact.whatsapp) : null}
        title="Sua assinatura não está ativa"
      />
    </div>
  )
}
