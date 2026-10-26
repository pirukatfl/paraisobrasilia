import type { Metadata } from 'next'
import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('classisex')
  return { title: t.recebidoGoogleTitulo, robots: { index: false, follow: false } }
}

export default async function AnuncioRecebidoPage() {
  const t = await getTextos('classisex')
  return (
    <section aria-labelledby="titulo-recebido">
      <p className="type-eyebrow text-muted">{t.recebidoTopo}</p>
      <h1 id="titulo-recebido" className="type-display mt-2">
        {t.recebidoTitulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        {t.recebidoTexto}
      </p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/classisex" className="btn-primary">
          {t.recebidoBotaoVer}
        </Link>
        <Link href="/cadastro" className="btn-secondary">
          {t.recebidoBotaoConta}
        </Link>
      </p>
    </section>
  )
}
