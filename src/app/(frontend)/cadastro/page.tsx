import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PlanComparison } from '@/components/assinantes/PlanComparison'
import { ResendForm } from '@/components/assinantes/ResendForm'
import { SignupForm } from '@/components/assinantes/SignupForm'
import { ExternalLink } from '@/components/ExternalLink'
import { getAssinante } from '@/lib/assinantes/session'
import { emailEnabled } from '@/lib/email/config'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

// Depends on the session and on runtime configuration (SMTP): per request, never cached
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Criar conta grátis',
    description: 'Crie uma conta gratuita no Paraíso Brasília e publique seu anúncio no ClassiSex.',
    path: '/cadastro',
  }),
  robots: { index: false, follow: false },
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string | string[]; erro?: string | string[] }>
}) {
  if (await getAssinante()) redirect('/area-do-assinante')
  const params = await searchParams
  const enabled = emailEnabled()
  const enviado = enabled && params.enviado === '1'
  const limite = enabled && params.erro === 'limite'
  const contact = await getContact()

  return (
    <section aria-labelledby="titulo-cadastro">
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-cadastro" className="type-display mt-2">
        Criar conta grátis
      </h1>

      {!enabled ? (
        <div className="mt-6 max-w-[560px]">
          <p role="status" className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text">
            O cadastro pelo site está fechado no momento. Fale com a equipe pelo WhatsApp.
          </p>
          {contact.whatsapp && (
            <ExternalLink href={whatsappUrl(contact.whatsapp)} className="btn-primary mt-4">
              Chamar no WhatsApp
            </ExternalLink>
          )}
        </div>
      ) : enviado ? (
        <div className="mt-6 max-w-[560px]">
          <p role="status" className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text">
            Enviamos um link para o seu e-mail. Abra o link para ativar a conta (vale por 7 dias). Olhe também a caixa
            de spam.
          </p>
          <h2 className="type-heading mt-8">Não recebeu?</h2>
          <ResendForm />
        </div>
      ) : (
        <>
          {limite && (
            <p role="alert" className="mt-6 max-w-[440px] rounded-lg border border-danger px-4 py-2 text-body text-text">
              Muitas tentativas. Tente de novo em 1 hora.
            </p>
          )}
          <p className="mt-4 max-w-[560px] text-body text-muted">
            Com a conta gratuita você publica seus anúncios no ClassiSex (até 3, com 1 foto cada). Assinantes veem todos
            os anúncios, com contatos, e mandam recados privados entre si.
          </p>
          <SignupForm />
        </>
      )}

      <PlanComparison />

      <p className="mt-8">
        <Link href="/entrar" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          Já tem conta? Entrar
        </Link>
      </p>
    </section>
  )
}
