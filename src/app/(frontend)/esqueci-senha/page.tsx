import type { Metadata } from 'next'
import Link from 'next/link'

import { FormField } from '@/components/assinantes/FormField'
import { ExternalLink } from '@/components/ExternalLink'
import { pedirNovaSenha } from '@/lib/assinantes/actions'
import { emailEnabled } from '@/lib/email/config'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

// Depends on runtime configuration (SMTP) and the query string: per request, never cached
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Esqueci minha senha',
    description: 'Peça um link para criar uma nova senha da área de assinantes do Paraíso Brasília.',
    path: '/esqueci-senha',
  }),
  robots: { index: false, follow: false },
}

export const NEUTRAL_MESSAGE =
  'Se o e-mail existir, enviamos um link para criar uma nova senha. Olhe também a caixa de spam.'

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string | string[]; erro?: string | string[] }>
}) {
  const params = await searchParams
  const enviado = params.enviado === '1'
  const limite = params.erro === 'limite'
  const contact = await getContact()
  const enabled = emailEnabled()

  return (
    <section aria-labelledby="titulo-esqueci" className="max-w-[440px]">
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-esqueci" className="type-display mt-2">
        Esqueci minha senha
      </h1>
      {!enabled ? (
        <>
          <p className="mt-6 text-body text-muted">
            Fale com a equipe pelo WhatsApp: ela envia um link para você criar uma nova senha.
          </p>
          {contact.whatsapp && (
            <ExternalLink href={whatsappUrl(contact.whatsapp)} className="btn-primary mt-6">
              Chamar no WhatsApp
            </ExternalLink>
          )}
        </>
      ) : (
        <>
          {enviado && (
            <p role="status" className="mt-6 rounded-lg border border-line bg-surface px-4 py-2 text-body text-text">
              {NEUTRAL_MESSAGE}
            </p>
          )}
          {limite && (
            <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
              Muitos pedidos. Tente de novo em 1 hora ou fale com a equipe pelo WhatsApp.
            </p>
          )}
          <p className="mt-6 text-body text-muted">Digite o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
          {/* Plain form + server action: works without client JS */}
          <form action={pedirNovaSenha} className="mt-6 flex flex-col gap-4">
            <FormField id="email" name="email" type="email" label="E-mail" autoComplete="email" />
            <button type="submit" className="btn-primary mt-2">
              Enviar link
            </button>
          </form>
        </>
      )}
      <p className="mt-6">
        <Link href="/entrar" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          Voltar para Entrar
        </Link>
      </p>
    </section>
  )
}
