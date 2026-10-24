'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { CloseIcon, MenuIcon } from '@/components/icons'
import { sair } from '@/lib/assinantes/actions'
import { isActivePath, type NavItem } from '@/lib/site/nav'

// Without JavaScript the panel is shown inline (UI-SPEC: no-JS fallback).
const NOSCRIPT_CSS = '[data-mobile-menu-panel]{display:block!important;position:static!important}[data-mobile-menu-button]{display:none!important}'

/** Disclosure menu for < 1024px (UI-SPEC Global — Header navigation). */
export function MobileMenu({ items, logado = false }: { items: NavItem[]; logado?: boolean }) {
  const pathname = usePathname() ?? '/'
  // Open state is tied to the path it was opened on: navigating closes the menu by itself.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = useCallback((value: boolean) => setOpenOn(value ? pathname : null), [pathname])
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false)
      if (refocus) buttonRef.current?.focus()
    },
    [setOpen],
  )

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  const linkClass = (item: NavItem) =>
    `type-eyebrow flex min-h-11 items-center ${isActivePath(item.href, pathname, item.exact) ? 'text-accent' : 'text-text'} hover:text-accent`

  return (
    <div className="xl:hidden">
      <noscript dangerouslySetInnerHTML={{ __html: `<style>${NOSCRIPT_CSS}</style>` }} />
      <button
        ref={buttonRef}
        type="button"
        data-mobile-menu-button
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        onClick={() => setOpen(!open)}
        className="type-label inline-flex min-h-11 min-w-11 items-center gap-2 rounded-lg px-2 text-text"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
        <span aria-hidden="true">Menu</span>
      </button>
      <div
        id={panelId}
        data-mobile-menu-panel
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface px-4 py-2 transition-opacity duration-150"
      >
        <nav aria-label="Menu">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    pathname === item.href || (!item.children && isActivePath(item.href, pathname, item.exact)) ? 'page' : undefined
                  }
                  className={linkClass(item)}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="pb-2 pl-4">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={pathname === child.href ? 'page' : undefined}
                          className={`type-label flex min-h-11 items-center ${pathname === child.href ? 'text-accent' : 'text-muted'} hover:text-accent`}
                          onClick={() => setOpen(false)}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {logado && (
              <li>
                <form action={sair}>
                  <button
                    type="submit"
                    className="type-eyebrow flex min-h-11 w-full cursor-pointer items-center text-left text-text hover:text-accent"
                  >
                    Sair
                  </button>
                </form>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  )
}
