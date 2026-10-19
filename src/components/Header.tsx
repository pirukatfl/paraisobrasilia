import Link from 'next/link'

import { MobileMenu } from '@/components/MobileMenu'
import { Nav } from '@/components/Nav'
import { getNavItems } from '@/lib/site/nav'

export function Header() {
  const items = getNavItems({ hasModels: false })
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
        <Nav items={items} />
        <MobileMenu items={items} />
      </div>
    </header>
  )
}
