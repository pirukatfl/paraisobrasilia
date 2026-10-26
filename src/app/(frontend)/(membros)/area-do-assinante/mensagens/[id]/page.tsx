import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { BlockReportPanel } from '@/components/mensagens/BlockReportPanel'
import { MessageForm } from '@/components/mensagens/MessageForm'
import { ThreadView } from '@/components/mensagens/ThreadView'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { responderMensagem } from '@/lib/mensagens/actions'
import { MENSAGEM_MESSAGES } from '@/lib/mensagens/rules'
import { getThreadFor, getThreadSafety } from '@/lib/mensagens/queries'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('mensagens')
  return { title: t.googleConversa, robots: { index: false, follow: false } }
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
  const t = await getTextos('mensagens')
  const query = await searchParams
  const raw = query.antes
  const antesNum = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? ''), 10)
  const antes = Number.isInteger(antesNum) && antesNum > 0 ? antesNum : undefined
  const check = await requireActiveSubscription(`/area-do-assinante/mensagens/${encodeURIComponent(id)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-conversa">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <h1 id="titulo-conversa" className="type-display mt-2">
          {t.titulo}
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const thread = await getThreadFor(check.assinante.id, id, antes)
  if (!thread) notFound()
  const { euBloqueei } = await getThreadSafety(check.assinante.id, id)
  return (
    <section aria-labelledby="titulo-conversa">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">{t.novoEyebrow}</p>
      <h1 id="titulo-conversa" className="type-display mt-2">
        {preencher(t.conversaTitulo, { nome: thread.outroApelido })}
      </h1>
      <p className="type-label mt-2 text-muted">{thread.assunto}</p>
      {query.erro === 'inesperado' && (
        <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
          Não foi possível concluir essa ação por um erro inesperado no servidor. Tente de novo; se continuar, avise a equipe.
        </p>
      )}
      <ThreadView thread={thread} />
      {euBloqueei ? (
        <p className="mt-8 max-w-[560px] text-body text-muted">{MENSAGEM_MESSAGES.voceBloqueou}</p>
      ) : (
        <section aria-labelledby="titulo-responder" className="mt-8">
          <h2 id="titulo-responder" className="type-heading">
            {t.responderTitulo}
          </h2>
          <MessageForm action={responderMensagem} hidden={{ conversa: String(thread.id) }} submitLabel={t.formEnviar} rows={3} textos={t} />
        </section>
      )}
      <BlockReportPanel conversaId={thread.id} euBloqueei={euBloqueei} textos={t} />
      <p className="mt-8">
        <Link href="/area-do-assinante/mensagens" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          {t.voltar}
        </Link>
      </p>
    </section>
  )
}
