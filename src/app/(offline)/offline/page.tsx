import React from 'react'

import { OfflineRetry } from './OfflineRetry'

export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main className="off">
      {/* Logo pré-guardada pelo service worker; <img> simples porque o otimizador não existe offline */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-320.webp" alt="Paraíso Brasília" width={320} height={269} />
      <h1>Você está sem conexão</h1>
      <p>Não deu para carregar esta página. Confira sua internet e tente de novo.</p>
      <OfflineRetry />
    </main>
  )
}
