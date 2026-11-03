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

/** External links open another site: no referrer, no opener, no SEO credit. */
const EXTERNAL_REL = 'noopener noreferrer nofollow'

// Active/hover underline is a background (no pseudo-element), so it can never detach from the item
const linkClasses = (active: boolean) =>
  `type-eyebrow inline-flex min-h-11 whitespace-nowrap items-center border-b-2 border-transparent bg-linear-to-r from-accent to-accent bg-no-repeat bg-origin-border bg-bottom-left transition-[color,background-size] duration-200 ease-[var(--ease-out-expo)] hover:text-accent focus-visible:text-accent hover:bg-[length:100%_2px] focus-visible:bg-[length:100%_2px] ${
    active ? 'text-text bg-[length:100%_2px]' : 'text-muted bg-[length:0%_2px]'
  }`

// Dropdown arrives from 4px above (opacity + translate, 150ms); instant where @starting-style is unsupported
const dropdownMotion =
  'transition-[opacity,translate] duration-150 ease-[var(--ease-out-expo)] starting:-translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'

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
      className="relative flex items-center"
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
      <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClasses(active)}>
        <TextoRico valor={item.label} linha />
      </Link>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Submenu de ${textoPuro(item.label)}`}
        onClick={() =>
          setState((cur) => (cur?.path === pathname && cur.mode === 'pinned' ? null : { path: pathname, mode: 'pinned' }))
        }
        className="inline-flex min-h-11 min-w-6 cursor-pointer items-center justify-center text-muted hover:text-accent focus-visible:text-accent"
      >
        <ChevronDownIcon size={16} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          id={menuId}
          className={`${dropdownMotion} absolute left-0 top-full z-50 min-w-44 rounded-lg border border-line bg-surface py-1 shadow-lg`}
        >
          {children.map((child) => (
            <li key={child.key}>
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

/** Account entries of a logged-in subscriber, grouped under "Minha conta" on the desktop menu (the mobile menu lists them all). */
const ACCOUNT_KEYS = ['meus-anuncios', 'minha-assinatura', 'trocar-senha']

/**
 * "Minha conta": a button-only trigger (the group has no page of its own; "Minha assinatura" is one of its entries),
 * opens on hover, on focus and with the button; Esc closes it and returns focus to the button. Holds the account links
 * and Sair (a form submit button). Only in the DOM while open, like NavDropdown.
 */
function AccountDropdown({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const t = useTextosGerais()
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

  const active = items.some((c) => isActivePath(c.href, pathname, c.exact))
  return (
    <li
      ref={rootRef}
      className="relative flex items-center"
      onMouseEnter={() => setState((cur) => cur ?? { path: pathname, mode: 'hover' })}
      onMouseLeave={() => setState((cur) => (cur?.mode === 'hover' ? null : cur))}
      onFocus={(event) => {
        if (event.currentTarget.contains(event.relatedTarget) || !event.target.matches(':focus-visible')) return
        setState((cur) => cur ?? { path: pathname, mode: 'pinned' })
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setState(null)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() =>
          setState((cur) => (cur?.path === pathname && cur.mode === 'pinned' ? null : { path: pathname, mode: 'pinned' }))
        }
        className={`${linkClasses(active)} cursor-pointer gap-1`}
      >
        <TextoRico valor={t.menuMinhaConta} linha />
        <ChevronDownIcon size={16} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul id={menuId} className={`${dropdownMotion} absolute right-0 top-full z-50 min-w-44 rounded-lg border border-line bg-surface py-1 shadow-lg`}>
          {items.map((child) => (
            <li key={child.key}>
              <Link
                href={child.href}
                aria-current={isActivePath(child.href, pathname, child.exact) ? 'page' : undefined}
                className="type-label flex min-h-11 items-center whitespace-nowrap px-4 text-text hover:text-accent focus-visible:text-accent"
              >
                <TextoRico valor={child.label} linha />
              </Link>
            </li>
          ))}
          <li>
            <form action={sair}>
              <button
                type="submit"
                className="type-label flex min-h-11 w-full cursor-pointer items-center whitespace-nowrap px-4 text-left text-text hover:text-accent focus-visible:text-accent"
              >
                <TextoRico valor={t.menuSair} linha />
              </button>
            </form>
          </li>
        </ul>
      )}
    </li>
  )
}

/**
 * Desktop inline navigation (xl and up), always on ONE line. Active item: accent underline + aria-current.
 * Logged in: the account entries (Meus anúncios, Minha assinatura, Trocar senha) and Sair live in "Minha conta",
 * the last item; the subscribers' external link stays inline right before it.
 */
export function Nav({ items, logado = false }: { items: NavItem[]; logado?: boolean }) {
  const pathname = usePathname() ?? '/'
  const principais = logado ? items.filter((item) => !ACCOUNT_KEYS.includes(item.key)) : items
  const conta = logado ? items.filter((item) => ACCOUNT_KEYS.includes(item.key)) : []
  return (
    <nav aria-label="Principal" className="hidden xl:block">
      <ul className="flex items-center gap-4 min-[1440px]:gap-5">
        {principais.map((item) => {
          if (item.children?.length) return <NavDropdown key={item.key} item={item} pathname={pathname} />
          if (item.external) {
            return (
              <li key={item.key}>
                <a href={item.href} target="_blank" rel={EXTERNAL_REL} className={linkClasses(false)}>
                  <TextoRico valor={item.label} linha />
                </a>
              </li>
            )
          }
          const active = isActivePath(item.href, pathname, item.exact)
          return (
            <li key={item.key}>
              <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClasses(active)}>
                <TextoRico valor={item.label} linha />
              </Link>
            </li>
          )
        })}
        {logado && <AccountDropdown items={conta} pathname={pathname} />}
      </ul>
    </nav>
  )
}
