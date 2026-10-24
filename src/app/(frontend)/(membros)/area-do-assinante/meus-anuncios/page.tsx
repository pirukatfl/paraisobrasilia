import type { Metadata } from 'next'
import Link from 'next/link'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { OwnerAdCard } from '@/components/classisex/OwnerAdCard'
import { getAccessStatus } from '@/lib/assinantes/access'
import { requireAssinante } from '@/lib/assinantes/session'
import { tierOf } from '@/lib/assinantes/tier'
import { SITE_ANTIGO_AVISO } from '@/lib/classisex/dto'
import { getOwnAds } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Meus anúncios',
  robots: { index: false, follow: false },
}

const OK: Record<string, string> = {
  enviado: 'Anúncio enviado. Ele aparece no ClassiSex depois que a equipe aprovar.',
  apagado: 'Anúncio apagado.',
}

/**
 * Owner list (CLAS-03). Needs only a login (G-02): free accounts create and edit ads too, with the
 * limits of their tier; an expired payer keeps editing and deleting (G-05, LGPD).
 */
export default async function MeusAnunciosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string | string[]; erro?: string | string[] }>
}) {
  const assinante = await requireAssinante('/area-do-assinante/meus-anuncios')
  const [ads, access, params] = await Promise.all([getOwnAds(assinante.id), getAccessStatus(assinante.id), searchParams])
  const tier = tierOf(access)
  const hasOldAds = ads.some((ad) => ad.antigo)
  const ok = typeof params.ok === 'string' ? OK[params.ok] : undefined
  return (
    <section aria-labelledby="titulo-meus-anuncios">
      <PasswordBanner mustChangePassword={assinante.mustChangePassword} />
      {ok && (
        <p role="status" className="mb-8 rounded-lg border border-line bg-surface px-4 py-2 text-body">
          {ok}
        </p>
      )}
      {params.erro === 'nao-encontrado' && (
        <p role="alert" className="mb-8 rounded-lg border border-danger px-4 py-2 text-body">
          Anúncio não encontrado.
        </p>
      )}
      {params.erro === 'inesperado' && (
        <p role="alert" className="mb-8 rounded-lg border border-danger px-4 py-2 text-body">
          Não foi possível apagar o anúncio por um erro inesperado no servidor. Tente de novo; se continuar, avise a equipe.
        </p>
      )}
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-meus-anuncios" className="type-display mt-2">
        Meus anúncios
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Você pode ter até 3 anúncios ativos (em análise ou publicados). Todo anúncio novo ou editado passa pela
        equipe antes de aparecer no ClassiSex.
      </p>
      {hasOldAds && (
        <p role="note" className="mt-6 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body">
          {SITE_ANTIGO_AVISO}
        </p>
      )}
      <Link href="/area-do-assinante/meus-anuncios/novo" className="btn-primary mt-6">
        Novo anúncio
      </Link>
      {ads.length === 0 ? (
        <p className="mt-8 text-body">Você ainda não tem anúncios.</p>
      ) : (
        <div className="mt-8 flex max-w-[720px] flex-col gap-4">
          {ads.map((ad) => (
            <OwnerAdCard key={ad.id} ad={ad} canEdit />
          ))}
        </div>
      )}
      {tier === 'gratis' && <PlanComparison id="comparativo-meus-anuncios" />}
    </section>
  )
}
