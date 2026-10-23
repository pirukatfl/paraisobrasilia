import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { VisitorAdForm } from '@/components/classisex/VisitorAdForm'
import { getAssinante } from '@/lib/assinantes/session'
import { getActiveAdCategories } from '@/lib/classisex/queries'
import { uploadErrorMessage } from '@/lib/classisex/media-messages'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Anunciar no ClassiSex',
  robots: { index: false, follow: false },
}

/** Messages for ?erro=<codigo> (answer of the no-JavaScript fallback of the form). */
const ERRO_MESSAGES: Record<string, string> = {
  invalido: 'Confira os campos do formulário e tente de novo. Se o problema continuar, ative o JavaScript do navegador para ver qual campo falhou.',
  envios: 'Muitos envios seguidos. Tente de novo mais tarde.',
  limite: 'Este e-mail já tem 3 anúncios em análise ou publicados. Espere a análise ou crie uma conta para gerenciar seus anúncios.',
  erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.',
}

function erroMessage(code: string | undefined): string | undefined {
  if (!code) return undefined
  return ERRO_MESSAGES[code] ?? uploadErrorMessage(code)
}

/**
 * Open ad form: anyone can post, signed in or not (client decision 2026-10-23). The page itself does not
 * need a session, but an account that happens to be signed in is sent to the members flow, which edits and
 * manages its ads.
 */
export default async function AnunciarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (await getAssinante()) redirect('/area-do-assinante/meus-anuncios/novo')
  const raw = (await searchParams).erro
  const erro = erroMessage(typeof raw === 'string' ? raw.slice(0, 40) : undefined)
  const categories = await getActiveAdCategories()
  return (
    <section aria-labelledby="titulo-anunciar">
      <p className="type-eyebrow text-muted">ClassiSex</p>
      <h1 id="titulo-anunciar" className="type-display mt-2">
        Anunciar no ClassiSex
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp ou Telegram) só os assinantes veem.
      </p>
      <VisitorAdForm categories={categories} erro={erro} />
    </section>
  )
}
