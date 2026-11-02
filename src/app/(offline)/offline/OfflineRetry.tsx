'use client'

import React from 'react'

export function OfflineRetry() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        minHeight: 44,
        padding: '0 28px',
        border: 0,
        borderRadius: 8,
        background: '#8B1538',
        color: '#fff',
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Tentar novamente
    </button>
  )
}
