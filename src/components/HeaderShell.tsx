'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Sticky header wrapper: gains a soft shadow and a solid background once the page has scrolled. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [rolou, setRolou] = useState(false)
  const ticking = useRef(false)

  useEffect(() => {
    const atualizar = () => {
      ticking.current = false
      setRolou(window.scrollY > 8)
    }
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(atualizar)
    }
    atualizar()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      data-scrolled={rolou ? '' : undefined}
      // The shadow lives on a pseudo-element so .header-line's own gold hairline (box-shadow) stays untouched
      className={`header-line sticky top-0 z-30 bg-bg after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-black/40 after:to-transparent after:transition-opacity after:duration-200 after:ease-[var(--ease-out-expo)] ${
        rolou ? 'after:opacity-100' : 'after:opacity-0'
      }`}
    >
      {children}
    </header>
  )
}
