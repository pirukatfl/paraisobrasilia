'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Unread messages number next to "Mensagens" in the members menu (D-04). The members layout does
 * not re-run on client navigation, so this island refetches on every pathname change and when the
 * tab becomes visible again. No polling timer.
 */
export function UnreadBadge() {
  const pathname = usePathname()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/area-do-assinante/mensagens/nao-lidas', { cache: 'no-store', credentials: 'same-origin' })
        const json = (await res.json()) as { count?: number }
        if (!cancelled) setCount(typeof json.count === 'number' ? json.count : 0)
      } catch {
        if (!cancelled) setCount(0)
      }
    }
    void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname])

  if (count <= 0) return null
  return (
    <span
      aria-label={`${count > 99 ? '99+' : count} mensagens não lidas`}
      className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-bg"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
