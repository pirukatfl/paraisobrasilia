import type { Metadata } from 'next'
import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('enviarConto')
  return { title: textoPuro(t.enviadoGoogleTitulo), robots: { index: false, follow: false } }
}

export default async function ContoEnviadoPage() {
  const t = await getTextos('enviarConto')
  return (
    <section aria-labelledby="titulo-enviado">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.enviadoTopo} linha /></p>
      <h1 id="titulo-enviado" className="type-display mt-2">
        <TextoRico valor={t.enviadoTitulo} linha />
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        <TextoRico valor={t.enviadoTexto} linha />
      </p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/contos" className="btn-primary">
          <TextoRico valor={t.enviadoBotaoContos} linha />
        </Link>
        <Link href="/cadastro" className="btn-secondary">
          <TextoRico valor={t.enviadoBotaoConta} linha />
        </Link>
      </p>
    </section>
  )
}
