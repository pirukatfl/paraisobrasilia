'use client'

import React from 'react'

export function OfflineRetry() {
  return (
    <button type="button" onClick={() => window.location.reload()}>
      Tentar novamente
    </button>
  )
}
