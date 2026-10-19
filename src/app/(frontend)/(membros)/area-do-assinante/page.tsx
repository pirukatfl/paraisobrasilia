import type { Metadata } from 'next'

import { requireAssinante } from '@/lib/assinantes/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Área do assinante',
  robots: { index: false, follow: false },
}

export default async function AreaDoAssinantePage() {
  const assinante = await requireAssinante('/area-do-assinante')
  return (
    <section aria-labelledby="titulo-area">
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-area" className="type-display mt-2">
        Olá, {assinante.name}
      </h1>
    </section>
  )
}
