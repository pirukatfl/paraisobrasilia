import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import type { AccessStatus } from '@/lib/assinantes/access'
import { validUntilLabel } from '@/lib/assinantes/periods'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

/**
 * "Minha assinatura" panel (ASS-03): situation, valid-until date and the next step.
 * Server component; dates in Brasília (validUntilLabel).
 */
export async function SubscriptionStatus({
  access,
  whatsappHref,
  title,
}: {
  access: AccessStatus
  whatsappHref: string | null
  title?: string
}) {
  const t = await getTextos('areaAssinante')
  const whatsapp = whatsappHref && (
    <ExternalLink href={whatsappHref} className="btn-secondary">
      {t.assWhatsapp}
    </ExternalLink>
  )
  return (
    <div className="max-w-[560px] rounded-xl border border-line bg-surface p-6">
      {title && <h2 className="type-heading mb-4">{title}</h2>}
      {access.state === 'ativa' && (
        <>
          <p className="text-body">
            {t.assAtivaAntes} <span className="font-semibold text-accent">{t.assAtivaSelo}</span>
          </p>
          <p className="mt-2 text-body">{preencher(t.assValidaAte, { data: access.validUntilLabel ?? '' })}</p>
          <p className="type-label mt-2 text-muted">
            {access.daysLeft === 1 ? t.assFalta1 : preencher(t.assFaltam, { dias: access.daysLeft ?? 0 })}
          </p>
        </>
      )}
      {access.state === 'vencida' && (
        <>
          <p className="text-body">
            {preencher(t.assVenceu, { data: access.lastEndedAt ? validUntilLabel(access.lastEndedAt) : '' })}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              {t.assRenovar}
            </Link>
            {whatsapp}
          </div>
        </>
      )}
      {access.state === 'sem-assinatura' && (
        <>
          <p className="text-body">{t.assSemAssinatura}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              {t.assVerPlanos}
            </Link>
            {whatsapp}
          </div>
        </>
      )}
      {access.state === 'encerrada' && (
        <>
          <p className="text-body">{t.assEncerrada}</p>
          {whatsapp && <div className="mt-6 flex">{whatsapp}</div>}
        </>
      )}
    </div>
  )
}
