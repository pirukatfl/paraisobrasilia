import type { Metadata } from 'next'
import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('enviarConto')
  return { title: t.enviadoGoogleTitulo, robots: { index: false, follow: false } }
}

export default async function ContoEnviadoPage() {
  const t = await getTextos('enviarConto')
  return (
    <section aria-labelledby="titulo-enviado">
      <p className="type-eyebrow text-muted">{t.enviadoTopo}</p>
      <h1 id="titulo-enviado" className="type-display mt-2">
        {t.enviadoTitulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        {t.enviadoTexto}
      </p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/contos" className="btn-primary">
          {t.enviadoBotaoContos}
        </Link>
        <Link href="/cadastro" className="btn-secondary">
          {t.enviadoBotaoConta}
        </Link>
      </p>
    </section>
  )
}
