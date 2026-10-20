import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { AdForm } from '@/components/classisex/AdForm'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { criarAnuncio } from '@/lib/classisex/actions'
import { getActiveAdCategories } from '@/lib/classisex/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Novo anúncio',
  robots: { index: false, follow: false },
}

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
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-novo-anuncio">
        {header}
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const categories = await getActiveAdCategories()
  return (
    <section aria-labelledby="titulo-novo-anuncio">
      {header}
      <p className="mt-4 max-w-[680px] text-body text-muted">
        O anúncio aparece no ClassiSex depois que a equipe aprovar. Na área aberta, aparecem só o apelido, o tipo e uma foto desfocada.
      </p>
      <AdForm
        action={criarAnuncio}
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
    </section>
  )
}
