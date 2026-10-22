'use client'

import { useConfig } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { podeAprovarNaLista, postJson, type ApproveReply } from './aprovar-lista'

/**
 * "Aprovar" in each row of the Anúncios list (staff, /admin). Only for ads waiting for approval and the
 * team drafts from the old site. Calls the same endpoint as the Moderação panel (POST /api/ads/:id/aprovar),
 * so the moderation rules, the contact / text checks and the audit log are the ones of the single approval.
 */
export function AprovarCelula({ rowData }: { rowData?: Record<string, unknown> }) {
  const { config } = useConfig()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = Number(rowData?.id)
  if (done) return <span role="status">Aprovado</span>
  if (!rowData || !podeAprovarNaLista(rowData as { status?: string; origemLegado?: string | null })) return null

  const approve = async () => {
    setBusy(true)
    setError(null)
    try {
      await postJson<ApproveReply>(`${config.serverURL ?? ''}${config.routes.api}/ads/${id}/aprovar`, {})
      setDone(true)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
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
        aria-label={`Aprovar o anúncio ${String(rowData.resumo ?? id)}`}
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
