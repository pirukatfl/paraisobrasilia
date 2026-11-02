import type { Metadata } from 'next'

import { MidiaEnvioForm } from '@/components/midia/MidiaEnvioForm'
import { TextoRico } from '@/components/TextoRico'
import { uploadErrorMessage } from '@/lib/classisex/media-messages'
import { ENVIO_MIDIA_MESSAGES } from '@/lib/midia-enviada/regras'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

// Open page without nudity: indexable and in the sitemap (the answer pages stay noindex).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('enviarMidia')
  return buildPageMetadata({
    title: textoPuro(t.googleTitulo),
    description: textoPuro(t.googleDescricao),
    path: '/enviar-fotos-e-videos',
  })
}

/** Messages for ?erro=<codigo> (answer of the no-JavaScript fallback of the form). */
const ERRO_MESSAGES: Record<string, string> = {
  invalido: 'Confira os campos do formulário e tente de novo. Se o problema continuar, ative o JavaScript do navegador para ver qual campo falhou.',
  envios: ENVIO_MIDIA_MESSAGES.envios,
  erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.',
}

function erroMessage(code: string | undefined): string | undefined {
  if (!code) return undefined
  return ERRO_MESSAGES[code] ?? uploadErrorMessage(code)
}

/** Open form: anyone can send photos and videos to the team, signed in or not. Nothing is published by it. */
export default async function EnviarMidiaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTextos('enviarMidia')
  const raw = (await searchParams).erro
  const erro = erroMessage(typeof raw === 'string' ? raw.slice(0, 40) : undefined)
  return (
    <section aria-labelledby="titulo-enviar-midia">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.topo} linha /></p>
      <h1 id="titulo-enviar-midia" className="type-display mt-2">
        <TextoRico valor={t.titulo} linha />
      </h1>
      <TextoRico valor={t.intro} className="mt-4 max-w-[680px] text-body text-muted" />
      <MidiaEnvioForm erro={erro} textos={t} />
    </section>
  )
}
