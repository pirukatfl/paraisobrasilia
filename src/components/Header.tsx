import Link from 'next/link'

import { MobileMenu } from '@/components/MobileMenu'
import { Nav } from '@/components/Nav'
import { getAssinante } from '@/lib/assinantes/session'
import { getMemberNavItems, getNavItems } from '@/lib/site/nav'
import { getTextos } from '@/lib/textos/queries'

async function isLoggedIn(): Promise<boolean> {
  try {
    return (await getAssinante()) !== null
  } catch {
    // No database (e.g. build-time prerender): public menu
    return false
  }
}

/** Logged-in subscribers get their own single menu (quick menu-logado); everyone else the public one. */
export async function Header() {
  const logado = await isLoggedIn()
  const t = await getTextos('geral')
  const items = logado ? getMemberNavItems(t) : getNavItems(t)
  return (
    <header className="header-line relative z-30 bg-bg">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2 lg:px-8">
        <Link
          href="/"
          aria-label="Paraíso Brasília — página inicial"
          className="inline-flex min-h-11 min-w-11 items-center"
        >
          <picture>
            <source type="image/webp" srcSet="/brand/logo-320.webp 1x, /brand/logo-640.webp 2x" />
            <img
              src="/brand/logo-640.png"
              alt="Paraíso Brasília"
              width={500}
              height={421}
              className="h-10 w-auto lg:h-12"
            />
          </picture>
        </Link>
        <Nav items={items} logado={logado} />
        <MobileMenu items={items} logado={logado} />
      </div>
    </header>
  )
}
