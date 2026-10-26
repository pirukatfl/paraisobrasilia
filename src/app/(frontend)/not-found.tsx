import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'

export default async function NotFound() {
  const t = await getTextos('geral')
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center">
      <h1 className="type-heading">{t.naoEncontradaTitulo}</h1>
      <p className="mt-4 text-body">{t.naoEncontradaTexto}</p>
      <Link href="/" className="btn-primary mt-8">
        {t.naoEncontradaBotao}
      </Link>
    </section>
  )
}
