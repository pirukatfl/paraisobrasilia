import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import Link from 'next/link'

import { getAccessStatus } from '@/lib/assinantes/access'
import { requireAssinante } from '@/lib/assinantes/session'
import { TIER_LABELS, tierOf } from '@/lib/assinantes/tier'
import { SITE_ANTIGO_AVISO } from '@/lib/classisex/dto'
import { getOwnAds } from '@/lib/classisex/queries'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Área do assinante',
  robots: { index: false, follow: false },
}

export default async function AreaDoAssinantePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string | string[] }>
}) {
  const assinante = await requireAssinante('/area-do-assinante')
  const [access, contact, ads] = await Promise.all([getAccessStatus(assinante.id), getContact(), getOwnAds(assinante.id)])
  const { ok } = await searchParams
  const tier = tierOf(access)
  return (
    <section aria-labelledby="titulo-area">
      {ok === 'senha' && (
        <p role="status" className="mb-8 rounded-lg border border-line bg-surface px-4 py-2 text-body">
          Senha alterada.
        </p>
      )}
      <PasswordBanner mustChangePassword={assinante.mustChangePassword} />
      {ads.some((ad) => ad.status === 'rascunho') && (
        <div role="note" className="mb-8 max-w-[680px] rounded-lg border border-accent px-4 py-3 text-body">
          <p>{SITE_ANTIGO_AVISO}</p>
          <Link href="/area-do-assinante/meus-anuncios" className="btn-primary mt-3">
            Ver meus anúncios
          </Link>
        </div>
      )}
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
      {tier === 'gratis' && (
        <section aria-labelledby="titulo-tipo-conta" className="mt-8 max-w-[560px]">
          <h2 id="titulo-tipo-conta" className="type-heading mb-2">
            Sua conta: {TIER_LABELS[tier]}
          </h2>
          <p className="text-body">
            Você pode publicar até 3 anúncios com 1 foto cada. Também lê os anúncios dos outros, sem os contatos e com as
            fotos desfocadas. Para ver o contato e as fotos e para trocar recados, assine.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/area-do-assinante/meus-anuncios" className="btn-primary">
              Meus anúncios
            </Link>
          </div>
          <PlanComparison id="comparativo-home" />
        </section>
      )}
      <section aria-labelledby="titulo-conta" className="mt-8">
        <h2 id="titulo-conta" className="type-heading">
          Dados da conta
        </h2>
        <p className="mt-2 text-body text-muted">E-mail: {assinante.email}</p>
      </section>
    </section>
  )
}
