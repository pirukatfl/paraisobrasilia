import Link from 'next/link'

import { getAccessStatus } from '@/lib/assinantes/access'
import { renewalNotice, type RenewalNotice } from '@/lib/assinantes/renewal'
import type { Textos } from '@/lib/textos/areas'
import { getAssinante } from '@/lib/assinantes/session'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

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

function noticeText(notice: RenewalNotice, t: Textos<'areaAssinante'>): string {
  if (notice.kind === 'expired') return preencher(t.renovVenceu, { data: notice.endedLabel })
  const quando = notice.daysLeft <= 1 ? t.renovUltimoDia : preencher(t.renovFaltam, { dias: notice.daysLeft })
  return preencher(t.renovVence, { data: notice.validUntilLabel, quando })
}

/** Top strip telling a subscriber whose subscription is ending (or ended) to renew. */
export async function RenewalBanner() {
  const notice = await loadNotice()
  if (!notice) return null
  const t = await getTextos('areaAssinante')
  return (
    <div role="status" data-testid="aviso-renovacao" className="bg-ruby text-text">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 lg:px-8">
        <p className="type-label">{noticeText(notice, t)}</p>
        <Link href="/assine-ja" className="type-label inline-flex min-h-11 items-center font-semibold text-gold underline underline-offset-4">
          {t.renovBotao}
        </Link>
      </div>
    </div>
  )
}
