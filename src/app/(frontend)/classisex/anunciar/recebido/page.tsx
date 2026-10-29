import type { Metadata } from 'next'
import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('classisex')
  return { title: textoPuro(t.recebidoGoogleTitulo), robots: { index: false, follow: false } }
}

export default async function AnuncioRecebidoPage() {
  const t = await getTextos('classisex')
  return (
    <section aria-labelledby="titulo-recebido">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.recebidoTopo} linha /></p>
      <h1 id="titulo-recebido" className="type-display mt-2">
        <TextoRico valor={t.recebidoTitulo} linha />
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        <TextoRico valor={t.recebidoTexto} linha />
      </p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/classisex" className="btn-primary">
          <TextoRico valor={t.recebidoBotaoVer} linha />
        </Link>
        <Link href="/cadastro" className="btn-secondary">
          <TextoRico valor={t.recebidoBotaoConta} linha />
        </Link>
      </p>
    </section>
  )
}
