import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conteúdo exclusivo',
  robots: { index: false, follow: false },
}

export default async function ExclusivoPage() {
  const check = await requireActiveSubscription('/area-do-assinante/exclusivo')
  if (check.inactive) {
    // No restricted markup at all when the subscription is not active (T-03-05)
    const contact = await getContact()
    return (
      <section aria-labelledby="titulo-exclusivo">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <p className="type-eyebrow text-muted">Área do assinante</p>
        <h1 id="titulo-exclusivo" className="type-display mt-2">
          Conteúdo exclusivo
        </h1>
        <div className="mt-8">
          <SubscriptionStatus
            access={check.access}
            whatsappHref={contact.whatsapp ? whatsappUrl(contact.whatsapp) : null}
            title="Sua assinatura não está ativa"
          />
        </div>
      </section>
    )
  }
  // Phase 4 replaces this content (ClassiSex, recados); keep the guard above.
  return (
    <section aria-labelledby="titulo-exclusivo">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-exclusivo" className="type-display mt-2">
        Conteúdo exclusivo
      </h1>
      <p className="mt-4 max-w-[680px] text-body">
        Você está na área restrita do Paraíso. Em breve: perfis do ClassiSex com fotos, vídeos e contatos, e os
        recados dos assinantes.
      </p>
    </section>
  )
}
