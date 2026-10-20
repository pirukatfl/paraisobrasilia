import { apagarRecado } from '@/lib/recados/actions'
import type { OwnRecadoDTO } from '@/lib/recados/dto'

/** One recado in "Seus recados" (owner view): status, refusal reason, text, delete. */
export function OwnRecadoCard({ recado }: { recado: OwnRecadoDTO }) {
  const published = recado.status === 'aprovado' && recado.statusLabel === 'Publicado'
  return (
    <article className="rounded-xl border border-line bg-surface p-5" aria-label={`Recado: ${recado.statusLabel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`type-eyebrow ${published ? 'text-accent' : 'text-muted'}`}>
          {recado.motivo ? `${recado.statusLabel}: ${recado.motivo}` : recado.statusLabel}
        </p>
        <p className="type-label text-muted">Enviado em {recado.dateLabel}</p>
      </div>
      <p className="type-label mt-2 text-muted">{recado.apelido}</p>
      <p className="mt-2 whitespace-pre-line text-body">{recado.texto}</p>
      {recado.contatosRemovidos > 0 && (
        <p className="type-label mt-2 text-muted">
          Removemos {recado.contatosRemovidos} {recado.contatosRemovidos === 1 ? 'contato' : 'contatos'} do seu recado.
        </p>
      )}
      <details className="group mt-4">
        <summary className="btn-secondary cursor-pointer list-none">Apagar</summary>
        <form action={apagarRecado} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="id" value={recado.id} />
          <p className="text-body">Apagar este recado de vez?</p>
          <button type="submit" className="btn-primary">
            Sim, apagar
          </button>
        </form>
      </details>
    </article>
  )
}
