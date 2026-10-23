import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Anúncio recebido',
  robots: { index: false, follow: false },
}

export default function AnuncioRecebidoPage() {
  return (
    <section aria-labelledby="titulo-recebido">
      <p className="type-eyebrow text-muted">ClassiSex</p>
      <h1 id="titulo-recebido" className="type-display mt-2">
        Recebemos seu anúncio
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Ele aparece no ClassiSex depois da análise da equipe. Avisamos no e-mail informado.
      </p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/classisex" className="btn-primary">
          Ver o ClassiSex
        </Link>
        <Link href="/cadastro" className="btn-secondary">
          Criar conta gratuita
        </Link>
      </p>
    </section>
  )
}
