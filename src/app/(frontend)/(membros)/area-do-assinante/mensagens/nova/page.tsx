import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { MessageForm } from '@/components/mensagens/MessageForm'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { iniciarConversa } from '@/lib/mensagens/actions'
import { getComposeTarget } from '@/lib/mensagens/queries'
import { MENSAGEM_MESSAGES } from '@/lib/mensagens/rules'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Novo recado',
  robots: { index: false, follow: false },
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * New conversation from a visible ad (?anuncio=) or recado (?recado=) of someone else (D-02).
 * The recipient is never in the URL or the form: the server derives it (T-05-10).
 */
export default async function NovaMensagemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const anuncio = first(params.anuncio)
  const recado = first(params.recado)
  const origem = anuncio ? 'anuncio' : recado ? 'recado' : null
  const alvo = anuncio ?? recado ?? ''
  const here = `/area-do-assinante/mensagens/nova?${origem ?? 'anuncio'}=${encodeURIComponent(alvo)}`
  const check = await requireActiveSubscription(here)
  const head = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Recados</p>
    </>
  )
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-nova">
        {head}
        <h1 id="titulo-nova" className="type-display mt-2">
          Novo recado
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  if (!origem) notFound()
  const target = await getComposeTarget(check.assinante.id, origem, alvo, check.assinante.apelido)
  if (target.state === 'nao-encontrado') notFound()
  if (target.state === 'existente') redirect(`/area-do-assinante/mensagens/${target.conversationId}`)
  if (target.state === 'propria') {
    return (
      <section aria-labelledby="titulo-nova">
        {head}
        <h1 id="titulo-nova" className="type-display mt-2">
          Novo recado
        </h1>
        <p role="alert" className="mt-4 max-w-[560px] rounded-lg border border-line bg-surface px-4 py-2 text-body">
          {MENSAGEM_MESSAGES.propria}
        </p>
      </section>
    )
  }
  if (target.state === 'indisponivel') {
    return (
      <section aria-labelledby="titulo-nova">
        {head}
        <h1 id="titulo-nova" className="type-display mt-2">
          Novo recado
        </h1>
        <p role="alert" className="mt-4 max-w-[560px] rounded-lg border border-line bg-surface px-4 py-2 text-body">
          {target.message}
        </p>
        <p className="mt-8">
          <Link href="/area-do-assinante/mensagens" className="type-label text-muted underline underline-offset-4 hover:text-accent">
            Voltar para Recados
          </Link>
        </p>
      </section>
    )
  }
  return (
    <section aria-labelledby="titulo-nova">
      {head}
      <h1 id="titulo-nova" className="type-display mt-2">
        Recado para {target.recipientApelido}
      </h1>
      <p className="type-label mt-2 text-muted">{target.assunto}</p>
      <MessageForm
        action={iniciarConversa}
        hidden={{ origem, alvo }}
        askApelido={!target.apelido}
        initialApelido={target.apelido}
        submitLabel="Enviar"
      />
      <p className="mt-8">
        <Link href="/area-do-assinante/mensagens" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Voltar para Recados
        </Link>
      </p>
    </section>
  )
}
