import Link from 'next/link'

import type { InboxItemDTO } from '@/lib/mensagens/dto'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** Conversations of the viewer, newest first. */
export async function InboxList({ items }: { items: InboxItemDTO[] }) {
  const t = await getTextos('mensagens')
  return (
    <ul className="mt-6 tabular-nums flex max-w-[720px] flex-col gap-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/area-do-assinante/mensagens/${c.id}`}
            className="press flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 transition-[background-color,border-color] duration-[var(--duration-fast)] hover:border-primary-hover hover:bg-surface-2 focus-visible:bg-surface-2"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="type-heading">{c.outroApelido}</span>
              <span className="type-label text-muted">{c.quando}</span>
            </span>
            <span className="type-label text-muted">{c.assunto}</span>
            <span className="flex items-center gap-2 text-body">
              {c.naoLida && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
              {c.naoLida && <span className="type-eyebrow text-accent"><TextoRico valor={t.novaMarca} linha /></span>}
              <span className={c.naoLida ? 'font-semibold' : undefined}>{c.ultimo}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
