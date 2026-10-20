import type { Metadata } from 'next'
import Link from 'next/link'

import { ResendForm } from '@/components/assinantes/ResendForm'
import { confirmarEmail } from '@/lib/assinantes/actions'

// The token comes from the e-mail link: never cached, never indexed, never sent as a referrer
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirmar e-mail',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; erro?: string | string[] }>
}) {
  const params = await searchParams
  const token = typeof params.token === 'string' && /^[a-f0-9]{40}$/.test(params.token) ? params.token : ''
  const invalido = !token || params.erro === 'invalido'

  return (
    <section aria-labelledby="titulo-confirmar" className="max-w-[440px]">
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-confirmar" className="type-display mt-2">
        Confirmar e-mail
      </h1>
      {invalido ? (
        <>
          <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
            Link inválido ou já usado.
          </p>
          <p className="mt-4 text-body text-muted">Digite o e-mail da conta para receber um link novo.</p>
          <ResendForm />
        </>
      ) : (
        <>
          <p className="mt-6 text-body text-muted">Falta só um clique para ativar a sua conta gratuita.</p>
          {/* POST: link scanners that only open the e-mail link cannot use up the token */}
          <form action={confirmarEmail} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-primary">
              Confirmar meu e-mail
            </button>
          </form>
        </>
      )}
      <p className="mt-6">
        <Link href="/entrar" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          Ir para Entrar
        </Link>
      </p>
    </section>
  )
}
