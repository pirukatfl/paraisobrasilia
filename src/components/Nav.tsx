'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { ChevronDownIcon } from '@/components/icons'
import { sair } from '@/lib/assinantes/actions'
import { isActivePath, type NavItem } from '@/lib/site/nav'
import { useTextosGerais } from '@/lib/textos/TextosGeraisProvider'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

const linkClasses = (active: boolean) =>
  `type-eyebrow inline-flex min-h-11 whitespace-nowrap items-center border-b-2 transition-colors duration-150 hover:text-accent focus-visible:text-accent ${
    active ? 'border-accent text-text' : 'border-transparent text-muted'
  }`

/**
 * Item with submenu: the label stays a link to the parent page, a small button beside it opens the
 * submenu. Opens on hover, on focus and with the button; Esc closes it and returns focus to the button.
 * The submenu is only in the DOM while open, so the plain list of links stays the parents.
 */
function NavDropdown({ item, pathname }: { item: NavItem; pathname: string }) {
  const children = item.children ?? []
  // 'hover': open while the pointer is over the item; 'pinned': opened by keyboard focus or by the
  // button, stays until Esc, the button again or focus leaves. Tied to the path it was opened on:
  // navigating closes it by itself.
  const [state, setState] = useState<{ path: string; mode: 'hover' | 'pinned' } | null>(null)
  const open = state?.path === pathname
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setState(null)
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const active = isActivePath(item.href, pathname, item.exact) || children.some((c) => c.href.split('?')[0] === pathname)
  return (
    <li
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setState((cur) => cur ?? { path: pathname, mode: 'hover' })}
      onMouseLeave={() => setState((cur) => (cur?.mode === 'hover' ? null : cur))}
      onFocus={(event) => {
        // keyboard focus arriving from outside opens it; focus moving inside, or a mouse click, does not
        if (event.currentTarget.contains(event.relatedTarget) || !event.target.matches(':focus-visible')) return
        setState((cur) => cur ?? { path: pathname, mode: 'pinned' })
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setState(null)
      }}
    >
      <span className="inline-flex items-center">
        <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClasses(active)}>
          <TextoRico valor={item.label} linha />
        </Link>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`Submenu de ${textoPuro(item.label)}`}
          onClick={() => setState((cur) => (cur?.path === pathname && cur.mode === 'pinned' ? null : { path: pathname, mode: 'pinned' }))}
          className="inline-flex min-h-11 min-w-6 cursor-pointer items-center justify-center text-muted hover:text-accent focus-visible:text-accent"
        >
          <ChevronDownIcon size={16} className={open ? 'rotate-180' : undefined} />
        </button>
      </span>
      {open && (
        <ul
          id={menuId}
          className="absolute left-0 top-full z-50 min-w-44 rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          {children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="type-label flex min-h-11 items-center whitespace-nowrap px-4 text-text hover:text-accent focus-visible:text-accent"
              >
                <TextoRico valor={child.label} linha />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Desktop inline navigation (≥ 1024px). Active item: accent underline + aria-current. */
export function Nav({ items, logado = false }: { items: NavItem[]; logado?: boolean }) {
  const pathname = usePathname() ?? '/'
  const t = useTextosGerais()
  return (
    <nav aria-label="Principal" className="hidden xl:block">
      <ul
        className={
          logado ? 'flex flex-wrap items-center justify-end gap-x-4 gap-y-0' : 'flex items-center gap-4 xl:gap-5'
        }
      >
        {items.map((item) => {
          if (item.children?.length) return <NavDropdown key={item.href} item={item} pathname={pathname} />
          const active = isActivePath(item.href, pathname, item.exact)
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClasses(active)}>
                <TextoRico valor={item.label} linha />
              </Link>
            </li>
          )
        })}
        {logado && (
          <li>
            <form action={sair}>
              <button
                type="submit"
                className="type-eyebrow inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap text-muted hover:text-accent"
              >
                <TextoRico valor={t.menuSair} linha />
              </button>
            </form>
          </li>
        )}
      </ul>
    </nav>
  )
}
