import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import type { AccessStatus } from '@/lib/assinantes/access'
import { validUntilLabel } from '@/lib/assinantes/periods'

/**
 * "Minha assinatura" panel (ASS-03): situation, valid-until date and the next step.
 * Server component; dates in Brasília (validUntilLabel).
 */
export function SubscriptionStatus({
  access,
  whatsappHref,
  title,
}: {
  access: AccessStatus
  whatsappHref: string | null
  title?: string
}) {
  const whatsapp = whatsappHref && (
    <ExternalLink href={whatsappHref} className="btn-secondary">
      Falar no WhatsApp
    </ExternalLink>
  )
  return (
    <div className="max-w-[560px] rounded-xl border border-line bg-surface p-6">
      {title && <h2 className="type-heading mb-4">{title}</h2>}
      {access.state === 'ativa' && (
        <>
          <p className="text-body">
            Sua assinatura: <span className="font-semibold text-accent">Ativa</span>
          </p>
          <p className="mt-2 text-body">Válida até {access.validUntilLabel}</p>
          <p className="type-label mt-2 text-muted">
            {access.daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${access.daysLeft} dias`}
          </p>
        </>
      )}
      {access.state === 'vencida' && (
        <>
          <p className="text-body">
            Sua assinatura venceu em {access.lastEndedAt ? validUntilLabel(access.lastEndedAt) : ''}.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              Renovar
            </Link>
            {whatsapp}
          </div>
        </>
      )}
      {access.state === 'sem-assinatura' && (
        <>
          <p className="text-body">Sua conta ainda não tem uma assinatura ativa.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              Ver planos
            </Link>
            {whatsapp}
          </div>
        </>
      )}
      {access.state === 'encerrada' && (
        <>
          <p className="text-body">Seu acesso foi encerrado pela equipe. Fale com a gente pelo WhatsApp.</p>
          {whatsapp && <div className="mt-6 flex">{whatsapp}</div>}
        </>
      )}
    </div>
  )
}
