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

// Per request (no database at build); data from the tagged caches ('plans', 'contact').
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Assine Já',
  description:
    'Planos de assinatura do Paraíso Brasília: acesso à área de assinantes com perfis, fotos e contatos. Pague pelo PagBank e envie o comprovante pelo WhatsApp.',
  path: '/assine-ja',
})

const RECEIPT_TEXT =
  'Olá! Fiz o pagamento da assinatura e vou enviar o comprovante. Meu nome: … Meu e-mail: …'

function PlanCard({ plan, whatsapp }: { plan: PlanDTO; whatsapp: string }) {
  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-6">
      <h3 className="type-heading">{plan.name}</h3>
      <p className="type-label mt-2 text-muted">{plan.durationLabel}</p>
      <div className="mt-4">
        {plan.promoLabel ? (
          <p className="flex flex-col">
            <s className="type-label text-muted">de {plan.priceLabel}</s>
            <span className="type-display text-accent">por {plan.promoLabel}</span>
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
            Pagar
            <span className="sr-only"> o plano {plan.name} no PagBank (abre em nova aba)</span>
          </a>
        ) : (
          whatsapp && (
            <ExternalLink
              href={whatsappUrl(whatsapp, `Olá! Quero assinar o plano ${plan.name}.`)}
              className="btn-secondary w-full"
            >
              Combinar pelo WhatsApp
            </ExternalLink>
          )
        )}
      </div>
    </li>
  )
}

export default async function AssineJaPage() {
  const [plans, contact] = await Promise.all([getActivePlans(), getContact()])
  return (
    <section aria-labelledby="titulo-assine">
      <p className="type-eyebrow text-muted">Assinatura</p>
      <h1 id="titulo-assine" className="type-display mt-2">
        Assine Já
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        A assinatura libera a área de assinantes do Paraíso: perfis completos do ClassiSex com fotos, vídeos e
        contatos, e recados privados entre assinantes.
      </p>

      <PlanComparison signupLink={emailEnabled()} assineLink={false} id="comparativo-assine" />

      {plans.length === 0 ? (
        <EmptyState
          heading="Planos"
          body="Os planos estão sendo atualizados. Fale com a gente pelo WhatsApp."
          actions={[{ href: '/contato', label: 'Fale com a gente', variant: 'primary' }]}
        />
      ) : (
        <section aria-labelledby="titulo-planos" className="mt-8">
          <h2 id="titulo-planos" className="sr-only">
            Planos
          </h2>
          <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} whatsapp={contact.whatsapp} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-como" className="mt-12 max-w-[680px]">
        <h2 id="titulo-como" className="type-heading">
          Como assinar
        </h2>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-6 text-body">
          <li>
            {emailEnabled() ? (
              <>
                Crie sua conta grátis em <Link href="/cadastro" className="underline">/cadastro</Link> — ou entre, se já tem.
              </>
            ) : (
              'Envie seu nome e e-mail pelo WhatsApp; a equipe cria sua conta.'
            )}
          </li>
          <li>Escolha o plano e pague pelo link do PagBank.</li>
          <li>Envie o comprovante pelo WhatsApp com o e-mail da sua conta.</li>
          <li>A equipe libera a assinatura na sua conta (sem senha nova).</li>
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {contact.whatsapp && (
            <ExternalLink href={whatsappUrl(contact.whatsapp, RECEIPT_TEXT)} className="btn-primary gap-2">
              <WhatsAppIcon />
              Enviar comprovante pelo WhatsApp
            </ExternalLink>
          )}
          <Link href="/entrar" className="btn-secondary">
            Já é assinante? Entrar
          </Link>
        </div>
      </section>
    </section>
  )
}
