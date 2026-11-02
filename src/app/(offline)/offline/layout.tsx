import type { Metadata, Viewport } from 'next'
import { Manrope, Playfair_Display } from 'next/font/google'
import React from 'react'

export const metadata: Metadata = {
  title: 'Sem conexão · Paraíso Brasília',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#8B1538' }

// Mesmas fontes do site: os arquivos já ficam no cache do service worker após a primeira visita
const playfair = Playfair_Display({ weight: ['500', '600'], subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const manrope = Manrope({ weight: ['400', '600'], subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

const ESTILO = `
:root{--bg:#0E0B0D;--text:#F3E9EC;--accent:#FFB2BD;--primary:#8B1538;--primary-hover:#B81D48}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:var(--bg);color:var(--text);font-family:var(--font-manrope),system-ui,sans-serif;line-height:1.6}
::selection{background:var(--primary);color:#fff}
.off{max-width:420px;padding:32px 24px;text-align:center}
.off img{display:block;margin:0 auto 32px;width:120px;height:auto}
.off h1{font-family:var(--font-playfair),Georgia,serif;font-weight:500;font-size:clamp(1.75rem,6vw,2.25rem);line-height:1.15;margin:0 0 12px;text-wrap:balance}
.off p{margin:0 0 32px;color:var(--accent);text-wrap:pretty}
.off button{min-height:44px;padding:0 28px;border:0;border-radius:8px;background:var(--primary);color:#fff;font:600 1rem var(--font-manrope),system-ui,sans-serif;cursor:pointer;transition:background-color .15s,transform .15s}
.off button:hover{background:var(--primary-hover)}
.off button:active{transform:scale(.97)}
.off button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
`

// Layout raiz próprio e mínimo: sem Header, cookies, AgeGate nem banco. Pré-guardado pelo service worker.
export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${manrope.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
