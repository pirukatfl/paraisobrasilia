import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components/EmptyState'
import { ExternalLink } from '@/components/ExternalLink'
import { WhatsAppIcon } from '@/components/icons'
import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { emailEnabled } from '@/lib/email/config'
import { getActivePlans, type PlanDTO } from '@/lib/assinantes/plans'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import type { Textos } from '@/lib/textos/areas'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

// Per request (no database at build); data from the tagged caches ('plans', 'contact').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('assine')
  return buildPageMetadata({ title: t.googleTitulo, description: t.googleDescricao, path: '/assine-ja' })
}

function PlanCard({ plan, whatsapp, t }: { plan: PlanDTO; whatsapp: string; t: Textos<'assine'> }) {
  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-6">
      <h3 className="type-heading">{plan.name}</h3>
      <p className="type-label mt-2 text-muted">{plan.durationLabel}</p>
      <div className="mt-4">
        {plan.promoLabel ? (
          <p className="flex flex-col">
            <s className="type-label text-muted">{preencher(t.cartaoDe, { preco: plan.priceLabel })}</s>
            <span className="type-display text-accent">{preencher(t.cartaoPor, { preco: plan.promoLabel })}</span>
          </p>
        ) : (
          <p className="type-display">{plan.priceLabel}</p>
        )}
      </div>
      {plan.description && <p className="mt-4 text-body text-muted">{plan.description}</p>}
      <div className="mt-6 flex flex-1 items-end">
        {plan.paymentUrl ? (
          // T-03-13: outbound PagBank link, https only (validated in the panel), no opener/referrer
          <a href={plan.paymentUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
            {t.cartaoPagar}
            <span className="sr-only"> o plano {plan.name} no PagBank (abre em nova aba)</span>
          </a>
        ) : (
          whatsapp && (
            <ExternalLink
              href={whatsappUrl(whatsapp, preencher(t.cartaoWhatsappMensagem, { plano: plan.name }))}
              className="btn-secondary w-full"
            >
              {t.cartaoWhatsapp}
            </ExternalLink>
          )
        )}
      </div>
    </li>
  )
}

export default async function AssineJaPage() {
  const [plans, contact, t] = await Promise.all([getActivePlans(), getContact(), getTextos('assine')])
  return (
    <section aria-labelledby="titulo-assine">
      <p className="type-eyebrow text-muted">{t.topoEtiqueta}</p>
      <h1 id="titulo-assine" className="type-display mt-2">
        {t.topoTitulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">{t.topoTexto}</p>

      <PlanComparison signupLink={emailEnabled()} assineLink={false} id="comparativo-assine" />

      {plans.length === 0 ? (
        <EmptyState
          heading={t.semPlanosTitulo}
          body={t.semPlanosTexto}
          actions={[{ href: '/contato', label: t.semPlanosBotao, variant: 'primary' }]}
        />
      ) : (
        <section aria-labelledby="titulo-planos" className="mt-8">
          <h2 id="titulo-planos" className="sr-only">
            Planos
          </h2>
          <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} whatsapp={contact.whatsapp} t={t} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-como" className="mt-12 max-w-[680px]">
        <h2 id="titulo-como" className="type-heading">
          {t.comoTitulo}
        </h2>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-6 text-body">
          <li>
            {emailEnabled() ? (
              <>
                {t.comoPasso1Antes}{' '}
                <Link href="/cadastro" className="underline">
                  {t.comoPasso1Link}
                </Link>{' '}
                {t.comoPasso1Depois}
              </>
            ) : (
              t.comoPasso1SemCadastro
            )}
          </li>
          <li>{t.comoPasso2}</li>
          <li>{t.comoPasso3}</li>
          <li>{t.comoPasso4}</li>
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {contact.whatsapp && (
            <ExternalLink href={whatsappUrl(contact.whatsapp, t.comprovanteMensagem)} className="btn-primary gap-2">
              <WhatsAppIcon />
              {t.comoBotaoComprovante}
            </ExternalLink>
          )}
          <Link href="/entrar" className="btn-secondary">
            {t.comoBotaoEntrar}
          </Link>
        </div>
      </section>
    </section>
  )
}
