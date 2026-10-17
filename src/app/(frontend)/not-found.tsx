import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center">
      <h1 className="type-heading">Página não encontrada</h1>
      <p className="mt-4 text-body">O endereço pode ter mudado ou a festa foi removida.</p>
      <Link href="/" className="btn-primary mt-8">
        Ver próximas festas
      </Link>
    </section>
  )
}
