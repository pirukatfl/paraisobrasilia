import Link from 'next/link'
import type { ReactNode } from 'react'

import type { TextoRico as EstadoRico } from '@/lib/textos/rico'

import { TextoRico } from './TextoRico'

type Action = { href: string; label: ReactNode; variant: 'primary' | 'secondary' }

/** Elegant empty state (UI-SPEC S9): surface card with heading, body and actions. */
export function EmptyState({ heading, body, actions }: { heading: ReactNode; body: string | EstadoRico; actions: Action[] }) {
  return (
    <div className="mt-8 max-w-[560px] rounded-xl border border-line bg-surface p-6">
      <h2 className="type-heading">{heading}</h2>
      {typeof body === 'string' ? (
        <p className="mt-4 text-body text-muted">{body}</p>
      ) : (
        <TextoRico valor={body} className="mt-4 text-body text-muted" />
      )}
      {actions.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className={a.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}>
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
