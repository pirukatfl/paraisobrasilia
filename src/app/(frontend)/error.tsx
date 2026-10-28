'use client'

import Link from 'next/link'

import { useTextosGerais } from '@/lib/textos/TextosGeraisProvider'
import { TextoRico } from '@/components/TextoRico'

// Generic on purpose: the same screen serves every page, so it never names a section.
// Never render error.message or stack traces (T-01-14); the digest is only an opaque id that
// matches the server log line, so the team can find the real cause.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTextosGerais()
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center" role="alert">
      <h1 className="type-heading text-danger"><TextoRico valor={t.erroTitulo} linha /></h1>
      <TextoRico valor={t.erroTexto} className="mt-4 text-body" />
      {error.digest && <p className="type-label mt-4 text-muted"><TextoRico valor={t.erroCodigo} vars={{ codigo: error.digest }} linha /></p>}
      <div className="mt-8 flex flex-col items-center gap-4">
        <button type="button" onClick={() => reset()} className="btn-primary">
          <TextoRico valor={t.erroBotao} linha />
        </button>
        <Link href="/" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.erroVoltar} linha />
        </Link>
      </div>
    </section>
  )
}
