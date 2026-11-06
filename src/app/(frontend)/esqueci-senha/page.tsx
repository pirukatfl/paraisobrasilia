import type { Metadata } from 'next'
import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

// Reads contact data from the database: render on request, the build has no database (like /entrar)
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('conta')
  return {
    ...buildPageMetadata({ title: textoPuro(t.esqueciGoogleTitulo), description: textoPuro(t.esqueciGoogleDescricao), path: '/esqueci-senha' }),
    robots: { index: false, follow: false },
  }
}

export default async function EsqueciSenhaPage() {
  const [contact, t] = await Promise.all([getContact(), getTextos('conta')])

  return (
    <section aria-labelledby="titulo-esqueci" className="max-w-[440px]">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.etiqueta} linha /></p>
      <h1 id="titulo-esqueci" className="type-display mt-2">
        <TextoRico valor={t.esqueciTitulo} linha />
      </h1>
      <p className="mt-6 text-body text-muted">
        <TextoRico valor={t.esqueciSemEmail} linha />
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {contact.whatsapp && (
          <ExternalLink href={whatsappUrl(contact.whatsapp, 'Olá! Esqueci minha senha do site e preciso de ajuda.')} className="btn-primary">
            <TextoRico valor={t.botaoWhatsapp} linha />
          </ExternalLink>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}?subject=${encodeURIComponent('Esqueci minha senha')}`}
            className={contact.whatsapp ? 'btn-secondary' : 'btn-primary'}
          >
            <TextoRico valor={t.botaoEmail} linha />
          </a>
        )}
      </div>
      <p className="mt-6">
        <Link href="/entrar" className="type-label inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
          <TextoRico valor={t.esqueciVoltar} linha />
        </Link>
      </p>
    </section>
  )
}
