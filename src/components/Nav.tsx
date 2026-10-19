'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isActivePath, type NavItem } from '@/lib/site/nav'

/** Desktop inline navigation (≥ 1024px). Active item: accent underline + aria-current. */
export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? '/'
  return (
    <nav aria-label="Principal" className="hidden lg:block">
      <ul className="flex items-center gap-6">
        {items.map((item) => {
          const active = isActivePath(item.href, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`type-eyebrow inline-flex min-h-11 items-center border-b-2 transition-colors duration-150 hover:text-accent focus-visible:text-accent ${
                  active ? 'border-accent text-text' : 'border-transparent text-muted'
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
