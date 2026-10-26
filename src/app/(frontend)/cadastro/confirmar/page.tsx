import type { Metadata } from 'next'
import Link from 'next/link'

import { ResendForm } from '@/components/assinantes/ResendForm'
import { confirmarEmail } from '@/lib/assinantes/actions'
import { getTextos } from '@/lib/textos/queries'

// The token comes from the e-mail link: never cached, never indexed, never sent as a referrer
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('conta')
  return {
    title: t.confirmarGoogleTitulo,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; erro?: string | string[] }>
}) {
  const [params, t] = await Promise.all([searchParams, getTextos('conta')])
  const token = typeof params.token === 'string' && /^[a-f0-9]{40}$/.test(params.token) ? params.token : ''
  const invalido = !token || params.erro === 'invalido'

  return (
    <section aria-labelledby="titulo-confirmar" className="max-w-[440px]">
      <p className="type-eyebrow text-muted">{t.etiqueta}</p>
      <h1 id="titulo-confirmar" className="type-display mt-2">
        {t.confirmarTitulo}
      </h1>
      {invalido ? (
        <>
          <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
            Link inválido ou já usado.
          </p>
          <p className="mt-4 text-body text-muted">{t.confirmarLinkNovo}</p>
          <ResendForm />
        </>
      ) : (
        <>
          <p className="mt-6 text-body text-muted">{t.confirmarFalta}</p>
          {/* POST: link scanners that only open the e-mail link cannot use up the token */}
          <form action={confirmarEmail} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-primary">
              {t.confirmarBotao}
            </button>
          </form>
        </>
      )}
      <p className="mt-6">
        <Link href="/entrar" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          {t.confirmarIrEntrar}
        </Link>
      </p>
    </section>
  )
}
