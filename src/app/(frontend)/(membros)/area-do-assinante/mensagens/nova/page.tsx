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
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('mensagens')
  return { title: textoPuro(t.googleNovo), robots: { index: false, follow: false } }
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * New conversation from a visible ad (?anuncio=) of someone else (D-02, R-01).
 * The recipient is never in the URL or the form: the server derives it (T-05-10).
 */
export default async function NovaMensagemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const t = await getTextos('mensagens')
  const alvo = first(params.anuncio) ?? ''
  const here = `/area-do-assinante/mensagens/nova?anuncio=${encodeURIComponent(alvo)}`
  const check = await requireActiveSubscription(here)
  const head = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted"><TextoRico valor={t.novoEyebrow} linha /></p>
    </>
  )
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-nova">
        {head}
        <h1 id="titulo-nova" className="type-display mt-2">
          <TextoRico valor={t.novoTitulo} linha />
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  // Old ?recado= links (and no target at all) lead to the Recados list: nothing is created (R-05)
  if (!alvo) redirect('/area-do-assinante/mensagens')
  const target = await getComposeTarget(check.assinante.id, alvo, check.assinante.apelido)
  if (target.state === 'nao-encontrado') notFound()
  if (target.state === 'existente') redirect(`/area-do-assinante/mensagens/${target.conversationId}`)
  if (target.state === 'propria') {
    return (
      <section aria-labelledby="titulo-nova">
        {head}
        <h1 id="titulo-nova" className="type-display mt-2">
          <TextoRico valor={t.novoTitulo} linha />
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
          <TextoRico valor={t.novoTitulo} linha />
        </h1>
        <p role="alert" className="mt-4 max-w-[560px] rounded-lg border border-line bg-surface px-4 py-2 text-body">
          {target.message}
        </p>
        <p className="mt-8">
          <Link href="/area-do-assinante/mensagens" className="type-label text-muted underline underline-offset-4 hover:text-accent">
            <TextoRico valor={t.voltar} linha />
          </Link>
        </p>
      </section>
    )
  }
  return (
    <section aria-labelledby="titulo-nova">
      {head}
      <h1 id="titulo-nova" className="type-display mt-2">
        <TextoRico valor={t.novoTituloPara} vars={{ nome: target.recipientApelido }} linha />
      </h1>
      <p className="type-label mt-2 text-muted">{target.assunto}</p>
      <MessageForm
        action={iniciarConversa}
        hidden={{ alvo }}
        askApelido={!target.apelido}
        initialApelido={target.apelido}
        submitLabel={<TextoRico valor={t.formEnviar} linha />}
        textos={t}
      />
      <p className="mt-8">
        <Link href="/area-do-assinante/mensagens" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          <TextoRico valor={t.voltar} linha />
        </Link>
      </p>
    </section>
  )
}
