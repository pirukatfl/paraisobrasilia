'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { sair } from '@/lib/assinantes/actions'
import { isActivePath, type NavItem } from '@/lib/site/nav'
import { useTextosGerais } from '@/lib/textos/TextosGeraisProvider'
import { TextoRico } from '@/components/TextoRico'

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
          const active = isActivePath(item.href, pathname, item.exact)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`type-eyebrow inline-flex min-h-11 whitespace-nowrap items-center border-b-2 transition-colors duration-150 hover:text-accent focus-visible:text-accent ${
                  active ? 'border-accent text-text' : 'border-transparent text-muted'
                }`}
              >
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
