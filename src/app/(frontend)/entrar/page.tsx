import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { FormField } from '@/components/assinantes/FormField'
import { ResendForm } from '@/components/assinantes/ResendForm'
import { ExternalLink } from '@/components/ExternalLink'
import { emailEnabled } from '@/lib/email/config'
import { entrar } from '@/lib/assinantes/actions'
import { safeNext } from '@/lib/assinantes/redirect'
import { getAssinante } from '@/lib/assinantes/session'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'

// Reads the session cookie: rendered per request, never cached (T-03-05)
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('conta')
  return {
    ...buildPageMetadata({ title: t.entrarGoogleTitulo, description: t.entrarGoogleDescricao, path: '/entrar' }),
    robots: { index: false, follow: false },
  }
}

const ERRORS: Record<string, string> = {
  credenciais: 'E-mail ou senha incorretos.',
  bloqueado: 'Muitas tentativas. Aguarde 10 minutos ou fale com a equipe pelo WhatsApp.',
  inesperado: 'Não foi possível entrar por um erro inesperado no servidor. Tente de novo em instantes; se continuar, avise a equipe.',
  'nao-confirmado': 'Confirme seu e-mail antes de entrar. Enviamos o link quando você criou a conta.',
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; erro?: string | string[]; confirmado?: string | string[] }>
}) {
  const params = await searchParams
  const next = safeNext(typeof params.next === 'string' ? params.next : undefined)
  if (await getAssinante()) redirect(next)

  const erro = typeof params.erro === 'string' ? ERRORS[params.erro] : undefined
  const naoConfirmado = params.erro === 'nao-confirmado' && emailEnabled()
  const confirmado = params.confirmado === '1'
  const [contact, t] = await Promise.all([getContact(), getTextos('conta')])

  return (
    <section aria-labelledby="titulo-entrar" className="max-w-[440px]">
      <p className="type-eyebrow text-muted">{t.etiqueta}</p>
      <h1 id="titulo-entrar" className="type-display mt-2">
        {t.entrarTitulo}
      </h1>
      {confirmado && (
        <p role="status" className="mt-6 rounded-lg border border-line bg-surface px-4 py-2 text-body text-text">
          {t.entrarConfirmado}
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
          {erro}
        </p>
      )}
      {naoConfirmado && <ResendForm id="entrar-reenviar" />}
      {/* Plain form + server action: works without client JS */}
      <form action={entrar} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <FormField id="email" name="email" type="email" label={t.campoEmail} autoComplete="username" />
        <FormField id="password" name="password" type="password" label={t.entrarCampoSenha} autoComplete="current-password" />
        <button type="submit" className="btn-primary mt-2">
          {t.entrarBotao}
        </button>
      </form>
      <p className="mt-6 text-body text-muted">
        {emailEnabled() ? (
          <>
            <Link
              href="/esqueci-senha"
              className="type-label inline-flex min-h-11 items-center text-accent underline underline-offset-4"
            >
              {t.entrarEsqueci}
            </Link>
            <br />
            {t.entrarSemEmail}{' '}
          </>
        ) : (
          <>{t.entrarEsqueciSemEmail} </>
        )}
        {contact.whatsapp && (
          <ExternalLink
            href={whatsappUrl(contact.whatsapp)}
            className="text-accent underline underline-offset-4"
          >
            {t.botaoWhatsapp}
          </ExternalLink>
        )}
      </p>
      {emailEnabled() && (
        <p className="mt-4">
          <Link href="/cadastro" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
            {t.entrarCriarConta}
          </Link>
        </p>
      )}
      <p className="mt-2">
        <Link href="/assine-ja" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          {t.entrarAssine}
        </Link>
      </p>
    </section>
  )
}
