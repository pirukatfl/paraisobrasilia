import type { Metadata } from 'next'
import Link from 'next/link'

import { FormField } from '@/components/assinantes/FormField'
import { ExternalLink } from '@/components/ExternalLink'
import { pedirNovaSenha } from '@/lib/assinantes/actions'
import { emailEnabled } from '@/lib/email/config'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Depends on runtime configuration (SMTP) and the query string: per request, never cached
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('conta')
  return {
    ...buildPageMetadata({ title: textoPuro(t.esqueciGoogleTitulo), description: textoPuro(t.esqueciGoogleDescricao), path: '/esqueci-senha' }),
    robots: { index: false, follow: false },
  }
}

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string | string[]; erro?: string | string[] }>
}) {
  const params = await searchParams
  const enviado = params.enviado === '1'
  const limite = params.erro === 'limite'
  const [contact, t] = await Promise.all([getContact(), getTextos('conta')])
  const enabled = emailEnabled()

  return (
    <section aria-labelledby="titulo-esqueci" className="max-w-[440px]">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.etiqueta} linha /></p>
      <h1 id="titulo-esqueci" className="type-display mt-2">
        <TextoRico valor={t.esqueciTitulo} linha />
      </h1>
      {!enabled ? (
        <>
          <p className="mt-6 text-body text-muted">
            <TextoRico valor={t.esqueciSemEmail} linha />
          </p>
          {contact.whatsapp && (
            <ExternalLink href={whatsappUrl(contact.whatsapp)} className="btn-primary mt-6">
              <TextoRico valor={t.botaoWhatsapp} linha />
            </ExternalLink>
          )}
        </>
      ) : (
        <>
          {enviado && (
            <TextoRico valor={t.esqueciEnviado} role="status" className="mt-6 rounded-lg border border-line bg-surface px-4 py-2 text-body text-text" />
          )}
          {limite && (
            <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
              Muitos pedidos. Tente de novo em 1 hora ou fale com a equipe pelo WhatsApp.
            </p>
          )}
          <p className="mt-6 text-body text-muted"><TextoRico valor={t.esqueciIntro} linha /></p>
          {/* Plain form + server action: works without client JS */}
          <form action={pedirNovaSenha} className="mt-6 flex flex-col gap-4">
            <FormField id="email" name="email" type="email" label={<TextoRico valor={t.campoEmail} linha />} autoComplete="email" />
            <button type="submit" className="btn-primary mt-2">
              <TextoRico valor={t.esqueciBotao} linha />
            </button>
          </form>
        </>
      )}
      <p className="mt-6">
        <Link href="/entrar" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          <TextoRico valor={t.esqueciVoltar} linha />
        </Link>
      </p>
    </section>
  )
}
