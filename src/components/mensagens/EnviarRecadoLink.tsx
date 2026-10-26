import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'

/**
 * "Enviar recado" on the ad of a paying member (R-02). The target id is public; the recipient is
 * derived on the server and canSend decides again there.
 */
export async function EnviarRecadoLink({ id }: { id: number }) {
  const t = await getTextos('mensagens')
  return (
    <Link href={`/area-do-assinante/mensagens/nova?anuncio=${id}`} className="btn-secondary mt-4 inline-flex self-start">
      {t.enviarRecadoLink}
    </Link>
  )
}
