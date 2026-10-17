import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Paraíso Brasília',
  description: 'Casa de festas Paraíso Brasília: próximas festas.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
