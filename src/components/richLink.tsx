import type { ReactNode } from 'react'

// T-02-04b: only http(s), mailto, tel and site-relative links become anchors; anything else renders as text.
export const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i

/** Anchor for a link node: safe URLs only, external ones open in a new tab; an unsafe URL leaves just its text. */
export function renderLink(url: string, children: ReactNode, key?: string | number): ReactNode {
  if (!SAFE_HREF.test(url)) return <span key={key}>{children}</span>
  if (/^https?:\/\//i.test(url)) {
    return (
      <a key={key} href={url} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    )
  }
  return (
    <a key={key} href={url}>
      {children}
    </a>
  )
}
