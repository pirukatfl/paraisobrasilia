import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'

import { FormField } from '@/components/assinantes/FormField'
import { ExternalLink } from '@/components/ExternalLink'
import { definirNovaSenha } from '@/lib/assinantes/actions'
import { passwordLinkIsValid } from '@/lib/assinantes/service'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Token in the URL: per request, noindex, no third-party resources on this page (T-03-11)
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('conta')
  return { title: textoPuro(t.novaGoogleTitulo), robots: { index: false, follow: false } }
}

const ERRORS: Record<string, string> = {
  curta: 'A nova senha precisa ter pelo menos 8 caracteres.',
  diferente: 'As senhas não conferem.',
}

export default async function NovaSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; erro?: string | string[]; aviso?: string | string[] }>
}) {
  const [params, t] = await Promise.all([searchParams, getTextos('conta')])
  const token = typeof params.token === 'string' ? params.token : ''
  const erro = typeof params.erro === 'string' ? params.erro : ''
  const aviso = typeof params.aviso === 'string' ? params.aviso : ''
  const payload = await getPayload({ config })
  const valid = Boolean(token) && erro !== 'expirado' && (await passwordLinkIsValid(payload, token))

  if (!valid) {
    const contact = await getContact()
    return (
      <section aria-labelledby="titulo-nova-senha" className="max-w-[440px]">
        <p className="type-eyebrow text-muted"><TextoRico valor={t.etiqueta} linha /></p>
        <h1 id="titulo-nova-senha" className="type-display mt-2">
          <TextoRico valor={t.novaTitulo} linha />
        </h1>
        <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
          Este link expirou ou já foi usado. Peça um novo para a equipe pelo WhatsApp.
        </p>
        {contact.whatsapp && (
          <ExternalLink href={whatsappUrl(contact.whatsapp)} className="btn-primary mt-6">
            <TextoRico valor={t.botaoWhatsapp} linha />
          </ExternalLink>
        )}
      </section>
    )
  }

  const message = ERRORS[erro]
  return (
    <section aria-labelledby="titulo-nova-senha" className="max-w-[440px]">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.etiqueta} linha /></p>
      <h1 id="titulo-nova-senha" className="type-display mt-2">
        <TextoRico valor={t.novaTitulo} linha />
      </h1>
      {aviso === 'senha-curta' && (
        <p role="status" className="mt-6 rounded-lg border border-line bg-surface px-4 py-2 text-body text-text">
          <TextoRico valor={t.novaAvisoCurta} linha />
        </p>
      )}
      {message && (
        <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
          {message}
        </p>
      )}
      <form action={definirNovaSenha} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <FormField id="nova" name="nova" type="password" label={<TextoRico valor={t.novaCampoNova} linha />} autoComplete="new-password" />
        <FormField
          id="confirmacao"
          name="confirmacao"
          type="password"
          label={<TextoRico valor={t.novaCampoRepita} linha />}
          autoComplete="new-password"
        />
        <p className="type-label text-muted"><TextoRico valor={t.novaDica} linha /></p>
        <button type="submit" className="btn-primary mt-2">
          <TextoRico valor={t.novaBotao} linha />
        </button>
      </form>
    </section>
  )
}
