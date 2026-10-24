'use client'

import Link from 'next/link'

// Generic on purpose: the same screen serves every page, so it never names a section.
// Never render error.message or stack traces (T-01-14); the digest is only an opaque id that
// matches the server log line, so the team can find the real cause.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center" role="alert">
      <h1 className="type-heading text-danger">Algo deu errado ao abrir esta página.</h1>
      <p className="mt-4 text-body">
        Pode ser uma instabilidade momentânea. Tente de novo em alguns instantes. Se continuar, avise a equipe informando o
        código abaixo.
      </p>
      {error.digest && <p className="type-label mt-4 text-muted">Código: {error.digest}</p>}
      <div className="mt-8 flex flex-col items-center gap-4">
        <button type="button" onClick={() => reset()} className="btn-primary">
          Tentar de novo
        </button>
        <Link href="/" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Voltar ao início
        </Link>
      </div>
    </section>
  )
}
