import Link from 'next/link'
import type { ReactNode } from 'react'

import type { TextoRico as EstadoRico } from '@/lib/textos/rico'

import { TextoRico } from './TextoRico'

type Action = { href: string; label: ReactNode; variant: 'primary' | 'secondary' }

/** Elegant empty state (UI-SPEC S9): surface card with heading, body and actions. */
export function EmptyState({ heading, body, actions }: { heading: ReactNode; body: string | EstadoRico; actions: Action[] }) {
  return (
    <div className="mt-8 max-w-[560px] rounded-xl border border-line bg-surface p-6">
      <svg aria-hidden="true" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gold">
        <circle cx="20" cy="20" r="15" />
        <path d="M13 24c2 2.5 4.2 3.5 7 3.5s5-1 7-3.5" />
        <path d="M14.5 16.5h.01M25.5 16.5h.01" strokeWidth="2" />
      </svg>
      <h2 className="type-heading">{heading}</h2>
      {typeof body === 'string' ? (
        <p className="mt-4 text-body text-muted">{body}</p>
      ) : (
        <TextoRico valor={body} className="mt-4 text-body text-muted" />
      )}
      {actions.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className={`press ${a.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}`}>
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
