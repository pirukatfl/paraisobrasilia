'use client'

// Shows only the UI-SPEC copy: never render error.message or stack traces (T-01-14).
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center" role="alert">
      <h1 className="type-heading text-danger">Não foi possível carregar as festas agora.</h1>
      <p className="mt-4 text-body">Pode ser uma instabilidade momentânea. Tente novamente em alguns instantes.</p>
      <button type="button" onClick={() => reset()} className="btn-primary mt-8">
        Tentar de novo
      </button>
    </section>
  )
}
