import type { ReactNode } from 'react'

/** Outbound link: new tab, no referrer/opener (T-02-03), sr-only hint for screen readers. */
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}
