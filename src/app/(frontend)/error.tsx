'use client'

import Link from 'next/link'

import { preencher } from '@/lib/textos/mesclar'
import { useTextosGerais } from '@/lib/textos/TextosGeraisProvider'

// Generic on purpose: the same screen serves every page, so it never names a section.
// Never render error.message or stack traces (T-01-14); the digest is only an opaque id that
// matches the server log line, so the team can find the real cause.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTextosGerais()
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center" role="alert">
      <h1 className="type-heading text-danger">{t.erroTitulo}</h1>
      <p className="mt-4 text-body">
        {t.erroTexto}
      </p>
      {error.digest && <p className="type-label mt-4 text-muted">{preencher(t.erroCodigo, { codigo: error.digest })}</p>}
      <div className="mt-8 flex flex-col items-center gap-4">
        <button type="button" onClick={() => reset()} className="btn-primary">
          {t.erroBotao}
        </button>
        <Link href="/" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          {t.erroVoltar}
        </Link>
      </div>
    </section>
  )
}
