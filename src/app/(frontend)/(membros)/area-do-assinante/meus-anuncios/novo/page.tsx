import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { AdForm } from '@/components/classisex/AdForm'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { TIER_LIMITS, tierOf } from '@/lib/assinantes/tier'
import { criarAnuncio } from '@/lib/classisex/actions'
import { getActiveAdCategories } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Novo anúncio',
  robots: { index: false, follow: false },
}

// Needs a login only: free accounts create ads too (G-02); the tier sets the media limits
export default async function NovoAnuncioPage() {
  const check = await requireActiveSubscription('/area-do-assinante/meus-anuncios/novo')
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-novo-anuncio" className="type-display mt-2">
        Novo anúncio
      </h1>
    </>
  )
  const tier = tierOf(check.access)
  const categories = await getActiveAdCategories()
  return (
    <section aria-labelledby="titulo-novo-anuncio">
      {header}
      <p className="mt-4 max-w-[680px] text-body text-muted">
        O anúncio aparece no ClassiSex depois que a equipe aprovar. Na área aberta, aparecem só o apelido, o tipo, o texto sem contatos e a foto de capa.
      </p>
      {tier === 'gratis' && (
        <p role="note" className="mt-4 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body">
          Conta gratuita: 1 foto e nenhum vídeo. Assinantes enviam até 10 fotos e 2 vídeos.
        </p>
      )}
      <AdForm
        action={criarAnuncio}
        withMedia
        limits={TIER_LIMITS[tier]}
        categories={categories}
        initial={{
          apelido: '',
          euSou: '',
          cidade: '',
          texto: '',
          whatsapp: check.assinante.whatsapp ?? '',
          telegram: '',
        }}
      />
      {tier === 'gratis' && <PlanComparison id="comparativo-novo-anuncio" />}
    </section>
  )
}
