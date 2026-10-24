import Link from 'next/link'

import { getAccessStatus } from '@/lib/assinantes/access'
import { renewalNotice, type RenewalNotice } from '@/lib/assinantes/renewal'
import { getAssinante } from '@/lib/assinantes/session'

async function loadNotice(): Promise<RenewalNotice | null> {
  try {
    const assinante = await getAssinante()
    if (!assinante) return null
    return renewalNotice(await getAccessStatus(assinante.id))
  } catch {
    // No database (e.g. build-time prerender): no banner
    return null
  }
}

function noticeText(notice: RenewalNotice): string {
  if (notice.kind === 'expired') {
    return `Sua assinatura venceu em ${notice.endedLabel}. Renove para voltar a ter acesso completo.`
  }
  const when = notice.daysLeft <= 1 ? 'último dia' : `faltam ${notice.daysLeft} dias`
  return `Sua assinatura vence em ${notice.validUntilLabel} (${when}). Renove para não perder o acesso.`
}

/** Top strip telling a subscriber whose subscription is ending (or ended) to renew. */
export async function RenewalBanner() {
  const notice = await loadNotice()
  if (!notice) return null
  return (
    <div role="status" data-testid="aviso-renovacao" className="bg-ruby text-text">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 lg:px-8">
        <p className="type-label">{noticeText(notice)}</p>
        <Link href="/assine-ja" className="type-label inline-flex min-h-11 items-center font-semibold text-gold underline underline-offset-4">
          Renovar agora
        </Link>
      </div>
    </div>
  )
}
