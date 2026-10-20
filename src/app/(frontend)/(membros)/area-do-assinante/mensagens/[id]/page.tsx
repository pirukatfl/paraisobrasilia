import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { MessageForm } from '@/components/mensagens/MessageForm'
import { ThreadView } from '@/components/mensagens/ThreadView'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { responderMensagem } from '@/lib/mensagens/actions'
import { getThreadFor } from '@/lib/mensagens/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conversa',
  robots: { index: false, follow: false },
}

/** One conversation (REC-02). Only its two participants get anything but a 404 (T-05-05). */
export default async function ConversaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const raw = (await searchParams).antes
  const antesNum = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? ''), 10)
  const antes = Number.isInteger(antesNum) && antesNum > 0 ? antesNum : undefined
  const check = await requireActiveSubscription(`/area-do-assinante/mensagens/${encodeURIComponent(id)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-conversa">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <h1 id="titulo-conversa" className="type-display mt-2">
          Mensagens
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const thread = await getThreadFor(check.assinante.id, id, antes)
  if (!thread) notFound()
  return (
    <section aria-labelledby="titulo-conversa">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Mensagens</p>
      <h1 id="titulo-conversa" className="type-display mt-2">
        Conversa com {thread.outroApelido}
      </h1>
      <p className="type-label mt-2 text-muted">{thread.assunto}</p>
      <ThreadView thread={thread} />
      <section aria-labelledby="titulo-responder" className="mt-8">
        <h2 id="titulo-responder" className="type-heading">
          Responder
        </h2>
        <MessageForm action={responderMensagem} hidden={{ conversa: String(thread.id) }} submitLabel="Enviar" rows={3} />
      </section>
      <p className="mt-8">
        <Link href="/area-do-assinante/mensagens" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Voltar para Mensagens
        </Link>
      </p>
    </section>
  )
}
