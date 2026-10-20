import { EnviarMensagemLink } from '@/components/mensagens/EnviarMensagemLink'
import type { RecadoDTO } from '@/lib/recados/dto'

/** One recado on the members board. The apelido is all that identifies the author. */
export function RecadoCard({ recado }: { recado: RecadoDTO }) {
  const titleId = `recado-${recado.id}`
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="type-heading">
          {recado.apelido}
        </h3>
        {recado.isOwn && <p className="type-eyebrow text-accent">Seu recado</p>}
      </div>
      <p className="mt-2 whitespace-pre-line text-body">{recado.texto}</p>
      <p className="type-label mt-3 text-muted">Publicado em {recado.publishedLabel}</p>
      {!recado.isOwn && <EnviarMensagemLink origem="recado" id={recado.id} />}
    </article>
  )
}
