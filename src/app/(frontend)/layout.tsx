import type { Metadata } from 'next'
import { Manrope, Playfair_Display } from 'next/font/google'
import React from 'react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { RenewalBanner } from '@/components/assinantes/RenewalBanner'
import { AgeGate } from '@/lib/age-gate/AgeGate'
import { AGE_HEAD_SCRIPT } from '@/lib/age-gate/head-script'
import { TextosGeraisProvider } from '@/lib/textos/TextosGeraisProvider'
import { getTextos } from '@/lib/textos/queries'

import './globals.css'

// Display and headings: Playfair Display (design system "Bordeaux & Crimson Desire")
const playfair = Playfair_Display({
  weight: ['500', '600'],
  // Portuguese is covered by the latin subset; latin-ext is no longer preloaded (MIDIA-03 budget)
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

// Interface and body: Manrope
const manrope = Manrope({
  weight: ['400', '600'],
  // Portuguese is covered by the latin subset; latin-ext is no longer preloaded (MIDIA-03 budget)
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const isProduction = process.env.SITE_ENV === 'production'

// Default title and description come from the panel (textos-geral); the template stays in code
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('geral')
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'),
    title: {
      default: t.googleTitulo,
      template: '%s · Paraíso Brasília',
    },
    description: t.googleDescricao,
    openGraph: {
      siteName: 'Paraíso Brasília',
      locale: 'pt_BR',
      type: 'website',
      images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Paraíso Brasília' }],
    },
    twitter: { card: 'summary_large_image' },
    // Staging and development must never be indexed (production flips this on).
    robots: isProduction ? { index: true, follow: true } : { index: false, follow: false },
    other: {
      // Adult-content labels: generic rating + RTA label (CLAUDE.md age-gate/SEO directive)
      rating: ['adult', 'RTA-5042-1996-1400-1577-RTA'],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await getTextos('geral')
  return (
    // suppressHydrationWarning: the head script may add data-age-ok before hydration
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Static constant, no user data (T-01-16) */}
        <script dangerouslySetInnerHTML={{ __html: AGE_HEAD_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <TextosGeraisProvider textos={t}>
          <AgeGate
            textos={{
              titulo: t.idadeTitulo,
              texto: t.idadeTexto,
              botaoEntrar: t.idadeBotaoEntrar,
              botaoSair: t.idadeBotaoSair,
            }}
          />
          <a
            href="#conteudo"
            className="type-label sr-only z-50 bg-surface px-4 py-2 text-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus:min-h-11 focus:items-center"
          >
            {t.pularConteudo}
          </a>
          <RenewalBanner />
          <Header />
          <main id="conteudo" className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-12 lg:px-8">
            {children}
          </main>
          <Footer />
        </TextosGeraisProvider>
      </body>
    </html>
  )
}
