import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Conto recebido',
  robots: { index: false, follow: false },
}

export default function ContoEnviadoPage() {
  return (
    <section aria-labelledby="titulo-enviado">
      <p className="type-eyebrow text-muted">Contos</p>
      <h1 id="titulo-enviado" className="type-display mt-2">
        Recebemos seu conto
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Recebemos seu conto. Ele aparece no site depois que a equipe aprovar.
      </p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/contos" className="btn-primary">
          Ver os contos
        </Link>
        <Link href="/cadastro" className="btn-secondary">
          Criar conta gratuita
        </Link>
      </p>
    </section>
  )
}
