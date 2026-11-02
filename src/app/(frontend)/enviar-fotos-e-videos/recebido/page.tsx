import type { Metadata } from 'next'
import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('enviarMidia')
  return { title: textoPuro(t.enviadoGoogleTitulo), robots: { index: false, follow: false } }
}

export default async function MidiaRecebidaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTextos('enviarMidia')
  const params = await searchParams
  const raw = params.falhas
  const participou = params.promocao === '1'
  const falhas = typeof raw === 'string' && /^\d{1,2}$/.test(raw) ? Number(raw) : 0
  return (
    <section aria-labelledby="titulo-enviado">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.enviadoTopo} linha /></p>
      <h1 id="titulo-enviado" className="type-display mt-2">
        <TextoRico valor={participou ? t.promocaoEnviadoTitulo : t.enviadoTitulo} linha />
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        <TextoRico valor={participou ? t.promocaoEnviadoTexto : t.enviadoTexto} linha />
      </p>
      {falhas > 0 && (
        <TextoRico valor={t.enviadoFalhas} vars={{ n: falhas }} role="note" className="mt-4 max-w-[680px] text-body" />
      )}
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/" className="btn-primary">
          <TextoRico valor={t.enviadoBotaoInicio} linha />
        </Link>
      </p>
    </section>
  )
}
