import type { ReactNode } from 'react'

import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import type { AccessStatus } from '@/lib/assinantes/access'
import { validUntilLabel } from '@/lib/assinantes/periods'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

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
  title?: ReactNode
}) {
  const t = await getTextos('areaAssinante')
  const whatsapp = whatsappHref && (
    <ExternalLink href={whatsappHref} className="btn-secondary">
      <TextoRico valor={t.assWhatsapp} linha />
    </ExternalLink>
  )
  return (
    <div className="max-w-[560px] rounded-xl border border-line bg-surface p-6">
      {title && <h2 className="type-heading mb-4">{title}</h2>}
      {access.state === 'ativa' && (
        <>
          <p className="text-body">
            <TextoRico valor={t.assAtivaAntes} linha /> <span className="font-semibold text-accent"><TextoRico valor={t.assAtivaSelo} linha /></span>
          </p>
          <p className="mt-2 text-body"><TextoRico valor={t.assValidaAte} vars={{ data: access.validUntilLabel ?? '' }} linha /></p>
          <p className="type-label mt-2 text-muted">
            {access.daysLeft === 1 ? (
              <TextoRico valor={t.assFalta1} linha />
            ) : (
              <TextoRico valor={t.assFaltam} vars={{ dias: access.daysLeft ?? 0 }} linha />
            )}
          </p>
        </>
      )}
      {access.state === 'vencida' && (
        <>
          <p className="text-body">
            <TextoRico valor={t.assVenceu} vars={{ data: access.lastEndedAt ? validUntilLabel(access.lastEndedAt) : '' }} linha />
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              <TextoRico valor={t.assRenovar} linha />
            </Link>
            {whatsapp}
          </div>
        </>
      )}
      {access.state === 'sem-assinatura' && (
        <>
          <p className="text-body"><TextoRico valor={t.assSemAssinatura} linha /></p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/assine-ja" className="btn-primary">
              <TextoRico valor={t.assVerPlanos} linha />
            </Link>
            {whatsapp}
          </div>
        </>
      )}
      {access.state === 'encerrada' && (
        <>
          <p className="text-body"><TextoRico valor={t.assEncerrada} linha /></p>
          {whatsapp && <div className="mt-6 flex">{whatsapp}</div>}
        </>
      )}
    </div>
  )
}
