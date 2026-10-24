'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { reasonLabel } from '../../../lib/classisex/report-rules'
import { mensagemDaResposta, mensagemDeExcecao } from '../../../lib/errors'

/**
 * "Denúncia" panel on a report in /admin (D-08): the reason and details, a link to the ad, and the
 * two ways to close it. Thin client over POST /api/ad-reports/:id/resolver (staff only, audited).
 */
type Report = {
  id: number
  motivo: string
  detalhes?: string | null
  urgente?: boolean
  status: 'aberta' | 'resolvida' | 'descartada'
  ad?: number | { id: number } | null
  adSnapshot?: string | null
  nota?: string | null
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: 'calc(var(--base) * 1)',
  marginBottom: 'calc(var(--base) * 1.5)',
  background: 'var(--theme-elevation-50)',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--theme-elevation-250)',
  borderRadius: 'var(--style-radius-s, 3px)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-text)',
  font: 'inherit',
}
const buttonStyle = (danger: boolean, disabled: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 'var(--style-radius-s, 3px)',
  border: danger ? 'none' : '1px solid var(--theme-elevation-400)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  font: 'inherit',
  fontWeight: 600,
  background: danger ? 'var(--theme-error-500)' : 'transparent',
  color: danger ? '#fff' : 'var(--theme-text)',
})

const STATUS_LABEL = { aberta: 'Aberta', resolvida: 'Resolvida', descartada: 'Descartada' } as const

export function DenunciaPanel() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const admin = config.routes.admin
  const api = `${config.serverURL ?? ''}${config.routes.api}/ad-reports`

  const [report, setReport] = useState<Report | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`${api}/${id}?depth=0`, { credentials: 'include' })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as Report & { message?: string }
        if (!res.ok) throw new Error(mensagemDaResposta(res.status, json))
        if (!cancelled) {
          setReport(json)
          setLoadError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(`Não foi possível carregar a denúncia: ${mensagemDeExcecao(err)}`)
      })
    return () => {
      cancelled = true
    }
  }, [api, id, version])

  if (!id) return null

  const act = async (acao: 'despublicar' | 'descartar') => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`${api}/${id}/resolver`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, nota }),
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string; closed?: number }
      if (!res.ok) throw new Error(mensagemDaResposta(res.status, json))
      setStatus(acao === 'despublicar' ? 'Anúncio despublicado e denúncias fechadas.' : 'Denúncia descartada.')
      setNota('')
      setVersion((v) => v + 1)
      router.refresh()
    } catch (err) {
      setError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  const adId = report && (typeof report.ad === 'object' && report.ad ? report.ad.id : (report.ad as number | null | undefined))
  const open = report?.status === 'aberta'

  return (
    <section aria-labelledby="denuncia-titulo" style={box}>
      <h3 id="denuncia-titulo" style={{ margin: 0 }}>
        Denúncia
      </h3>
      {loadError && <p role="alert">{loadError}</p>}
      {report && (
        <>
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0', fontWeight: 600 }}>
            {report.urgente ? 'Urgente · ' : ''}
            {reasonLabel(report.motivo)} · {STATUS_LABEL[report.status]}
          </p>
          {report.detalhes && <p style={{ margin: 'calc(var(--base) * 0.5) 0 0', whiteSpace: 'pre-line' }}>{report.detalhes}</p>}
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
            {adId ? (
              <a href={`${admin}/collections/ads/${adId}`}>Abrir o anúncio</a>
            ) : (
              <span>O anúncio foi apagado. Resumo: {report.adSnapshot}</span>
            )}
          </p>
          {report.nota && <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>Nota: {report.nota}</p>}
          {open && (
            <>
              <label
                htmlFor="denuncia-nota"
                style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'calc(var(--base) * 0.75)' }}
              >
                Nota (opcional; vira o motivo mostrado ao anunciante ao despublicar)
                <textarea
                  id="denuncia-nota"
                  rows={2}
                  maxLength={300}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) * 0.75)', marginTop: 'calc(var(--base) * 0.75)' }}>
                <button type="button" onClick={() => act('despublicar')} disabled={busy || !adId} style={buttonStyle(true, busy || !adId)}>
                  Despublicar o anúncio
                </button>
                <button type="button" onClick={() => act('descartar')} disabled={busy} style={buttonStyle(false, busy)}>
                  Descartar
                </button>
              </div>
            </>
          )}
          {status && (
            <p role="status" style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>
              {status}
            </p>
          )}
          {error && (
            <p role="alert" style={{ margin: 'calc(var(--base) * 0.75) 0 0', color: 'var(--theme-error-500)' }}>
              {error}
            </p>
          )}
        </>
      )}
    </section>
  )
}
