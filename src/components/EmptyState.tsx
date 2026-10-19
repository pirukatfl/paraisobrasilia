import Link from 'next/link'

type Action = { href: string; label: string; variant: 'primary' | 'secondary' }

/** Elegant empty state (UI-SPEC S9): surface card with heading, body and actions. */
export function EmptyState({ heading, body, actions }: { heading: string; body: string; actions: Action[] }) {
  return (
    <div className="mt-8 max-w-[560px] rounded-xl border border-line bg-surface p-6">
      <h2 className="type-heading">{heading}</h2>
      <p className="mt-4 text-body text-muted">{body}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={a.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
