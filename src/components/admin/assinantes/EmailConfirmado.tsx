'use client'

import { useConfig, useDocumentInfo, useField } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { mensagemDaResposta, mensagemDeExcecao } from '../../../lib/errors'

/**
 * "E-mail confirmado" on the subscriber page (G-01): shows the state and lets staff mark it for
 * someone who cannot get the confirmation e-mail. Posts to the staff-only endpoint, which audits it.
 */
export function EmailConfirmado({ path }: { path: string }) {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const { value } = useField<string>({ path })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!id) return null
  const confirmed = value === 'Sim'

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${config.routes.api}/assinantes/${id}/email-confirmado`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmado: !confirmed }),
      })
      if (!res.ok) {
        setError(`Não foi possível alterar: ${mensagemDaResposta(res.status, await res.json().catch(() => null))}`)
      } else router.refresh()
    } catch (err) {
      setError(`Não foi possível alterar: ${mensagemDeExcecao(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <label className="field-label">E-mail confirmado</label>
      <p style={{ margin: '4px 0' }}>
        {confirmed
          ? 'Sim: a pessoa pode entrar.'
          : 'Não: a pessoa ainda não clicou no link do e-mail e não consegue entrar.'}
      </p>
      <button type="button" className="btn btn--style-secondary btn--size-small" onClick={toggle} disabled={busy}>
        {confirmed ? 'Marcar como não confirmado' : 'Marcar e-mail como confirmado'}
      </button>
      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
