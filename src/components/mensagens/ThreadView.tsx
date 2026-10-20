import Link from 'next/link'

import type { ThreadDTO } from '@/lib/mensagens/dto'

/** One conversation: my messages on the right ("Você"), theirs on the left. */
export function ThreadView({ thread }: { thread: ThreadDTO }) {
  return (
    <div className="mt-6 max-w-[720px]">
      {thread.temAnteriores && thread.antesDe !== null && (
        <p className="mb-4">
          <Link
            href={`/area-do-assinante/mensagens/${thread.id}?antes=${thread.antesDe}`}
            className="type-label text-accent underline underline-offset-4"
          >
            Ver mensagens anteriores
          </Link>
        </p>
      )}
      <ol aria-label="Mensagens" className="flex flex-col gap-3">
        {thread.mensagens.map((m) => (
          <li
            key={m.id}
            className={`flex max-w-[85%] flex-col rounded-xl border border-line p-3 ${
              m.minha ? 'self-end bg-surface' : 'self-start'
            }`}
          >
            <span className="type-eyebrow text-muted">{m.minha ? 'Você' : thread.outroApelido}</span>
            <span className="mt-1 whitespace-pre-line text-body">{m.texto}</span>
            <span className="type-label mt-1 text-muted">{m.quando}</span>
          </li>
        ))}
      </ol>
      <div id="fim" />
    </div>
  )
}
