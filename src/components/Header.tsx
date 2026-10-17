import Link from 'next/link'

export function Header() {
  return (
    <header className="header-line bg-bg">
      <div className="mx-auto flex max-w-[1200px] items-center px-4 py-2 lg:px-8">
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
      </div>
    </header>
  )
}
