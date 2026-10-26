import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { AdForm } from '@/components/classisex/AdForm'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { TIER_LIMITS, tierOf } from '@/lib/assinantes/tier'
import { criarAnuncio } from '@/lib/classisex/actions'
import { getActiveAdCategories } from '@/lib/classisex/queries'
import { getTextos } from '@/lib/textos/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('meusAnuncios')
  return { title: t.novoGoogleTitulo, robots: { index: false, follow: false } }
}

// Needs a login only: free accounts create ads too (G-02); the tier sets the media limits
export default async function NovoAnuncioPage() {
  const check = await requireActiveSubscription('/area-do-assinante/meus-anuncios/novo')
  const t = await getTextos('meusAnuncios')
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">{t.topo}</p>
      <h1 id="titulo-novo-anuncio" className="type-display mt-2">
        {t.novoTitulo}
      </h1>
    </>
  )
  const tier = tierOf(check.access)
  const categories = await getActiveAdCategories()
  return (
    <section aria-labelledby="titulo-novo-anuncio">
      {header}
      <p className="mt-4 max-w-[680px] text-body text-muted">
        {t.novoIntro}
      </p>
      {tier === 'gratis' && (
        <p role="note" className="mt-4 max-w-[680px] rounded-lg border border-accent px-4 py-2 text-body">
          {t.novoAvisoGratis}
        </p>
      )}
      <AdForm
        textos={t}
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
