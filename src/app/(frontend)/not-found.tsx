import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

export default async function NotFound() {
  const t = await getTextos('geral')
  return (
    <section className="mx-auto mt-12 max-w-[480px] text-center">
      <h1 className="type-heading"><TextoRico valor={t.naoEncontradaTitulo} linha /></h1>
      <p className="mt-4 text-body"><TextoRico valor={t.naoEncontradaTexto} linha /></p>
      <Link href="/" className="btn-primary mt-8">
        <TextoRico valor={t.naoEncontradaBotao} linha />
      </Link>
    </section>
  )
}
