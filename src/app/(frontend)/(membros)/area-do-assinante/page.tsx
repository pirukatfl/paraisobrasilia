import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { SubscriptionStatus } from '@/components/assinantes/SubscriptionStatus'
import Link from 'next/link'

import { getAccessStatus } from '@/lib/assinantes/access'
import { requireAssinante } from '@/lib/assinantes/session'
import { tierOf } from '@/lib/assinantes/tier'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('areaAssinante')
  return { title: textoPuro(t.googleTitulo), robots: { index: false, follow: false } }
}

export default async function AreaDoAssinantePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string | string[] }>
}) {
  const assinante = await requireAssinante('/area-do-assinante')
  const [access, contact, t] = await Promise.all([getAccessStatus(assinante.id), getContact(), getTextos('areaAssinante')])
  const { ok } = await searchParams
  const tier = tierOf(access)
  return (
    <section aria-labelledby="titulo-area">
      {ok === 'senha' && (
        <p role="status" className="mb-8 rounded-lg border border-line bg-surface px-4 py-2 text-body">
          <TextoRico valor={t.senhaAlterada} linha />
        </p>
      )}
      <PasswordBanner mustChangePassword={assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted"><TextoRico valor={t.etiqueta} linha /></p>
      <h1 id="titulo-area" className="type-display mt-2">
        <TextoRico valor={t.saudacao} vars={{ nome: assinante.name }} linha />
      </h1>
      <section aria-labelledby="titulo-minha" className="mt-8">
        <h2 id="titulo-minha" className="type-heading mb-4">
          <TextoRico valor={t.minhaTitulo} linha />
        </h2>
        <SubscriptionStatus access={access} whatsappHref={contact.whatsapp ? whatsappUrl(contact.whatsapp) : null} />
      </section>
      {tier === 'gratis' && (
        <section aria-labelledby="titulo-tipo-conta" className="mt-8 max-w-[560px]">
          <h2 id="titulo-tipo-conta" className="type-heading mb-2">
            <TextoRico valor={t.contaTitulo} vars={{ tipo: textoPuro(t.contaTipoGratuita) }} linha />
          </h2>
          <TextoRico valor={t.contaTexto} className="text-body" />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/area-do-assinante/meus-anuncios" className="btn-primary">
              <TextoRico valor={t.contaBotaoAnuncios} linha />
            </Link>
          </div>
          <PlanComparison id="comparativo-home" />
        </section>
      )}
      <section aria-labelledby="titulo-conta" className="mt-8">
        <h2 id="titulo-conta" className="type-heading">
          <TextoRico valor={t.dadosTitulo} linha />
        </h2>
        <p className="mt-2 text-body text-muted"><TextoRico valor={t.dadosEmail} vars={{ email: assinante.email }} linha /></p>
      </section>
    </section>
  )
}
