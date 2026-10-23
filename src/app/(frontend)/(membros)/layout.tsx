import Link from 'next/link'
import type { ReactNode } from 'react'

import { UnreadBadge } from '@/components/mensagens/UnreadBadge'
import { sair } from '@/lib/assinantes/actions'

// Members area: always rendered per request (private, no-store).
export const dynamic = 'force-dynamic'

const LINKS: { href: string; label: string; badge?: boolean }[] = [
  { href: '/area-do-assinante', label: 'Minha assinatura' },
  { href: '/area-do-assinante/classisex', label: 'ClassiSex' },
  { href: '/area-do-assinante/mensagens', label: 'Recados', badge: true },
  { href: '/area-do-assinante/contos', label: 'Contos' },
  { href: '/area-do-assinante/dicas-hot', label: 'Dicas Hot' },
  { href: '/area-do-assinante/meus-anuncios', label: 'Meus anúncios' },
  { href: '/area-do-assinante/senha', label: 'Trocar senha' },
]

/**
 * Chrome only. Authorization lives in each page (and each server action) via the DAL in
 * src/lib/assinantes/session.ts: Next layouts do not re-run on client navigation and do not
 * gate child segments or actions.
 */
export default function MembrosLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav aria-label="Área do assinante" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex min-w-max items-center gap-6 border-b border-line">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="type-eyebrow -mb-px inline-flex min-h-11 items-center border-b-2 border-transparent text-muted hover:text-accent"
              >
                {l.label}
                {l.badge && <UnreadBadge />}
              </Link>
            </li>
          ))}
          <li>
            <form action={sair}>
              <button
                type="submit"
                className="type-eyebrow inline-flex min-h-11 cursor-pointer items-center text-muted hover:text-accent"
              >
                Sair
              </button>
            </form>
          </li>
        </ul>
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  )
}
