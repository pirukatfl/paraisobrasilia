import Link from 'next/link'

import { getAccessStatus } from '@/lib/assinantes/access'
import { renewalNotice, type RenewalNotice } from '@/lib/assinantes/renewal'
import type { Textos } from '@/lib/textos/areas'
import { getAssinante } from '@/lib/assinantes/session'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'
import { TextoRico } from '@/components/TextoRico'

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

/** The "quando" of the notice goes into {quando} of the main text, so it is plain text there (renovUltimoDia, renovFaltam: soTexto). */
function quandoTexto(notice: Extract<RenewalNotice, { kind: 'expiring' }>, t: Textos<'areaAssinante'>): string {
  return notice.daysLeft <= 1 ? textoPuro(t.renovUltimoDia) : preencher(textoPuro(t.renovFaltam), { dias: notice.daysLeft })
}

/** Top strip telling a subscriber whose subscription is ending (or ended) to renew. */
export async function RenewalBanner() {
  const notice = await loadNotice()
  if (!notice) return null
  const t = await getTextos('areaAssinante')
  return (
    <div role="status" data-testid="aviso-renovacao" className="bg-ruby text-text">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 lg:px-8">
        <p className="type-label">
          {notice.kind === 'expired' ? (
            <TextoRico valor={t.renovVenceu} vars={{ data: notice.endedLabel }} linha />
          ) : (
            <TextoRico valor={t.renovVence} vars={{ data: notice.validUntilLabel, quando: quandoTexto(notice, t) }} linha />
          )}
        </p>
        <Link href="/assine-ja" className="type-label inline-flex min-h-11 items-center font-semibold text-gold underline underline-offset-4">
          <TextoRico valor={t.renovBotao} linha />
        </Link>
      </div>
    </div>
  )
}
