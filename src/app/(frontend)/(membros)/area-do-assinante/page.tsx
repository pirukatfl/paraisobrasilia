import type { Metadata } from 'next'

import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import { getAccessStatus } from '@/lib/assinantes/access'
import { requireAssinante } from '@/lib/assinantes/session'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Área do assinante',
  robots: { index: false, follow: false },
}

export default async function AreaDoAssinantePage() {
  const assinante = await requireAssinante('/area-do-assinante')
  const [access, contact] = await Promise.all([getAccessStatus(assinante.id), getContact()])
  return (
    <section aria-labelledby="titulo-area">
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-area" className="type-display mt-2">
        Olá, {assinante.name}
      </h1>
      <section aria-labelledby="titulo-minha" className="mt-8">
        <h2 id="titulo-minha" className="type-heading mb-4">
          Minha assinatura
        </h2>
        <SubscriptionStatus access={access} whatsappHref={contact.whatsapp ? whatsappUrl(contact.whatsapp) : null} />
      </section>
      <section aria-labelledby="titulo-conta" className="mt-8">
        <h2 id="titulo-conta" className="type-heading">
          Dados da conta
        </h2>
        <p className="mt-2 text-body text-muted">E-mail: {assinante.email}</p>
      </section>
    </section>
  )
}
