import type { ReactNode } from 'react'

/** Outbound link: new tab, no referrer/opener (T-02-03), sr-only hint for screen readers. */
export function ExternalLink({
  href,
  className,
  rel = 'noopener noreferrer',
  children,
}: {
  href: string
  className?: string
  /** Replaces the default rel (keep noopener noreferrer in it) */
  rel?: string
  children: ReactNode
}) {
  return (
    <a href={href} target="_blank" rel={rel} className={className}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}
