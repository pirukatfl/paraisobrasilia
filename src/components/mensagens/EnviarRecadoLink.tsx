import Link from 'next/link'

/**
 * "Enviar recado" on the ad of a paying member (R-02). The target id is public; the recipient is
 * derived on the server and canSend decides again there. `origem` stays only while the mural exists.
 */
export function EnviarRecadoLink({ origem = 'anuncio', id }: { origem?: 'anuncio' | 'recado'; id: number }) {
  return (
    <Link href={`/area-do-assinante/mensagens/nova?${origem}=${id}`} className="btn-secondary mt-4 inline-flex self-start">
      Enviar recado
    </Link>
  )
}
