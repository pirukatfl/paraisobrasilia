import type { Metadata } from 'next'

import { ContoEnvioForm } from '@/components/contos/ContoEnvioForm'
import { uploadErrorMessage } from '@/lib/classisex/media-messages'
import { CONTO_ENVIO_MESSAGES } from '@/lib/contos/envio-rules'
import { getTextos } from '@/lib/textos/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('enviarConto')
  return { title: t.googleTitulo, robots: { index: false, follow: false } }
}

/** Messages for ?erro=<codigo> (answer of the no-JavaScript fallback of the form). */
const ERRO_MESSAGES: Record<string, string> = {
  invalido: 'Confira os campos do formulário e tente de novo. Se o problema continuar, ative o JavaScript do navegador para ver qual campo falhou.',
  envios: CONTO_ENVIO_MESSAGES.envios,
  erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.',
}

function erroMessage(code: string | undefined): string | undefined {
  if (!code) return undefined
  return ERRO_MESSAGES[code] ?? uploadErrorMessage(code)
}

/** Open form: anyone can send a conto, signed in or not. It is published only after staff approve it. */
export default async function EnviarContoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTextos('enviarConto')
  const raw = (await searchParams).erro
  const erro = erroMessage(typeof raw === 'string' ? raw.slice(0, 40) : undefined)
  return (
    <section aria-labelledby="titulo-enviar-conto">
      <p className="type-eyebrow text-muted">{t.topo}</p>
      <h1 id="titulo-enviar-conto" className="type-display mt-2">
        {t.titulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        {t.intro}
      </p>
      <ContoEnvioForm erro={erro} textos={t} />
    </section>
  )
}
