import type { Metadata } from 'next'

import { ContoEnvioForm } from '@/components/contos/ContoEnvioForm'
import { uploadErrorMessage } from '@/lib/classisex/media-messages'
import { CONTO_ENVIO_MESSAGES } from '@/lib/contos/envio-rules'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'
import { ENVIO_PROMOCAO_PARAM } from '@/lib/site/links'
import { tituloDaParticipacao } from '@/lib/site/promocao'
import { getPromocao } from '@/lib/site/promocao-queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('enviarConto')
  return { title: textoPuro(t.googleTitulo), robots: { index: false, follow: false } }
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
  const params = await searchParams
  const raw = params.erro
  // ?promocao=1 only counts while the promotion is on and inside its period; otherwise it is ignored
  const tituloPromocao =
    params[ENVIO_PROMOCAO_PARAM] === '1' ? tituloDaParticipacao(await getPromocao(), new Date()) : null
  const erro = erroMessage(typeof raw === 'string' ? raw.slice(0, 40) : undefined)
  return (
    <section aria-labelledby="titulo-enviar-conto">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.topo} linha /></p>
      <h1 id="titulo-enviar-conto" className="type-display mt-2">
        <TextoRico valor={t.titulo} linha />
      </h1>
      {tituloPromocao !== null && (
        <div
          role="note"
          data-promocao-quadro
          className="mt-4 max-w-[680px] rounded-lg border border-gold/40 bg-surface px-4 py-3 font-bold text-text"
        >
          <TextoRico valor={t.promocaoQuadro} vars={{ titulo: tituloPromocao }} linha />
        </div>
      )}
      <TextoRico valor={t.intro} className="mt-4 max-w-[680px] text-body text-muted" />
      <ContoEnvioForm erro={erro} textos={t} participando={tituloPromocao !== null} />
    </section>
  )
}
