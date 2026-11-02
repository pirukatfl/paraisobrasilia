import React from 'react'

import { OfflineRetry } from './OfflineRetry'

export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main style={{ maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 12px', fontWeight: 600 }}>Você está sem conexão</h1>
      <p style={{ margin: '0 0 28px', lineHeight: 1.6, color: '#FFB2BD' }}>
        Não deu para carregar a página. Confira sua internet e tente de novo.
      </p>
      <OfflineRetry />
    </main>
  )
}
