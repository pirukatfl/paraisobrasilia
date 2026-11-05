'use client'

import { useConfig } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { postJson } from './aprovar-lista'
import { mensagemDeExcecao } from '../../../lib/errors'

/**
 * "Aprovar" in each row of the Comentários list (staff, /admin). Only for comments "Em análise":
 * sets the status to "Publicado" through the collection's own update (same access and hooks as the edit screen).
 */
export function AprovarComentarioCelula({ rowData }: { rowData?: Record<string, unknown> }) {
  const { config } = useConfig()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = Number(rowData?.id)
  if (done) return <span role="status">Aprovado</span>
  if (!rowData || rowData.status !== 'pendente') return null

  const approve = async () => {
    setBusy(true)
    setError(null)
    try {
      await postJson(`${config.serverURL ?? ''}${config.routes.api}/ad-comments/${id}`, { status: 'publicado' }, 'PATCH')
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <button
        type="button"
        onClick={approve}
        disabled={busy}
        aria-label={`Aprovar o comentário ${String(rowData.resumo ?? id)}`}
        style={{
          padding: '4px 12px',
          borderRadius: 'var(--style-radius-s, 3px)',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
          font: 'inherit',
          fontWeight: 600,
          background: 'var(--theme-elevation-1000)',
          color: 'var(--theme-elevation-0)',
        }}
      >
        {busy ? 'Aprovando…' : 'Aprovar'}
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--theme-error-500)', maxWidth: 260, whiteSpace: 'normal' }}>
          {error}
        </span>
      )}
    </div>
  )
}
