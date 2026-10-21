'use client'

import { useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SEM_DATA_LABEL } from '../../../lib/assinantes/site-antigo-label'

/**
 * Warning box on the record of an old subscriber who had no expiry date (M-02, client adjustment
 * 2026-10-21). Shows nothing unless the account carries the marker. "Dispensar aviso" posts to the
 * staff-only endpoint, which audits it; granting a subscription also clears the marker.
 */
export function AvisoSemData() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const flagged = useFormFields(([fields]) => fields.revisarAssinaturaAntiga?.value === true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!id || !flagged) return null

  async function dismiss() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${config.routes.api}/assinantes/${id}/dispensar-aviso-site-antigo`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) setError('Não foi possível dispensar o aviso. Tente de novo.')
      else router.refresh()
    } catch {
      setError('Não foi possível dispensar o aviso. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="note"
      data-testid="aviso-sem-data"
      style={{
        border: '1px solid var(--theme-warning-500, #d99a00)',
        background: 'var(--theme-warning-100, #fff6dd)',
        color: 'var(--theme-warning-900, #3d2c00)',
        borderRadius: 'var(--style-radius-m, 4px)',
        padding: 'var(--base)',
        marginBottom: 'var(--base)',
      }}
    >
      <strong style={{ display: 'block' }}>{SEM_DATA_LABEL}</strong>
      <p style={{ margin: '4px 0 8px' }}>
        No site antigo era assinante, mas sem data de vencimento. Combine com a casa: libere o acesso em
        &quot;Assinatura&quot; (o aviso some sozinho) ou dispense o aviso para deixar como conta gratuita.
      </p>
      <button type="button" className="btn btn--style-secondary btn--size-small" onClick={dismiss} disabled={busy}>
        Dispensar aviso
      </button>
      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
