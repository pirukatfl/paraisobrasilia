import type { Metadata, Viewport } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Sem conexão · Paraíso Brasília',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#8B1538' }

// Layout raiz próprio e mínimo: sem Header, cookies, AgeGate nem banco. Pré-guardado pelo service worker.
export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#0E0B0D',
          color: '#F3E9EC',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
