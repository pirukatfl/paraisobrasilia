import Link from 'next/link'

import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import type { AccessStatus } from '@/lib/assinantes/access'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

/**
 * Restricted pages (ClassiSex board/detail, recados, contos) for an account without an
 * active subscription: a panel only, no restricted markup (T-03-05). A free account is told what the
 * free tier does and what paying adds (G-02, G-06).
 */
export async function InactivePanel({ access }: { access: AccessStatus }) {
  const contact = await getContact()
  const whatsappHref = contact.whatsapp ? whatsappUrl(contact.whatsapp) : null
  const never = access.state === 'sem-assinatura'
  return (
    <div className="mt-8">
      {never ? (
        <div className="max-w-[560px] rounded-xl border border-line bg-surface p-6">
          <h2 className="type-heading mb-4">Disponível para assinantes</h2>
          <p className="text-body">
            Com a conta gratuita você publica seus anúncios em Meus anúncios. Assine para ver todos os anúncios com
            contatos e mandar e receber recados.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              Assine Já
            </Link>
            <Link href="/area-do-assinante/meus-anuncios" className="btn-secondary">
              Meus anúncios
            </Link>
          </div>
        </div>
      ) : (
        <SubscriptionStatus access={access} whatsappHref={whatsappHref} title="Sua assinatura não está ativa" />
      )}
      <PlanComparison assineLink={false} id="comparativo-painel" />
    </div>
  )
}
