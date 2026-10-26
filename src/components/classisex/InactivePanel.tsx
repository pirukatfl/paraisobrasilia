import Link from 'next/link'

import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import type { AccessStatus } from '@/lib/assinantes/access'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'

/**
 * Restricted pages (ClassiSex board/detail, recados, contos) for an account without an
 * active subscription: a panel only, no restricted markup (T-03-05). A free account is told what the
 * free tier does and what paying adds (G-02, G-06).
 */
export async function InactivePanel({ access }: { access: AccessStatus }) {
  const [contact, t] = await Promise.all([getContact(), getTextos('areaAssinante')])
  const whatsappHref = contact.whatsapp ? whatsappUrl(contact.whatsapp) : null
  const never = access.state === 'sem-assinatura'
  return (
    <div className="mt-8">
      {never ? (
        <div className="max-w-[560px] rounded-xl border border-line bg-surface p-6">
          <h2 className="type-heading mb-4">{t.inativoTitulo}</h2>
          <p className="text-body">{t.inativoTexto}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              {t.inativoAssine}
            </Link>
            <Link href="/area-do-assinante/meus-anuncios" className="btn-secondary">
              {t.inativoAnuncios}
            </Link>
          </div>
        </div>
      ) : (
        <SubscriptionStatus access={access} whatsappHref={whatsappHref} title={t.inativoNaoAtiva} />
      )}
      <PlanComparison assineLink={false} id="comparativo-painel" />
    </div>
  )
}
