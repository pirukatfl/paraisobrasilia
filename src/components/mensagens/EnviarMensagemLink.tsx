import Link from 'next/link'

/** "Enviar mensagem" on someone else's ad or recado (D-02). The target id is public; the recipient is derived on the server. */
export function EnviarMensagemLink({ origem, id }: { origem: 'anuncio' | 'recado'; id: number }) {
  return (
    <Link href={`/area-do-assinante/mensagens/nova?${origem}=${id}`} className="btn-secondary mt-4 inline-flex self-start">
      Enviar mensagem
    </Link>
  )
}
