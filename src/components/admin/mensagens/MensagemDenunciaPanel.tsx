'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { messageReasonLabel } from '../../../lib/mensagens/rules'

/**
 * "Denúncia" panel on a message report in /admin (REC-03): reason, details, a link to the reported
 * account and the three ways to close it. Thin client over POST /api/message-reports/:id/resolver
 * (staff only, audited). The captured messages are in the read-only field below.
 */
type Report = {
  id: number
  motivo: string
  detalhes?: string | null
  urgente?: boolean
  status: 'aberta' | 'resolvida' | 'descartada'
  reported?: number | { id: number } | null
  reportedApelido?: string | null
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

export function MensagemDenunciaPanel() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const admin = config.routes.admin
  const api = `${config.serverURL ?? ''}${config.routes.api}/message-reports`

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
        if (!res.ok) throw new Error(json.message ?? 'Erro')
        if (!cancelled) {
          setReport(json)
          setLoadError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(`Não foi possível carregar a denúncia: ${err.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [api, id, version])

  if (!id) return null

  const act = async (acao: 'descartar' | 'resolver' | 'suspender') => {
    setError(null)
    setStatus(null)
    if (acao !== 'descartar' && nota.trim().length < 3) {
      setError('Escreva uma nota para resolver ou suspender.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${api}/${id}/resolver`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, nota }),
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) throw new Error(json.message ?? 'Não foi possível concluir.')
      setStatus(
        acao === 'suspender'
          ? 'Mensagens da pessoa suspensas e denúncias fechadas.'
          : acao === 'resolver'
            ? 'Denúncia resolvida.'
            : 'Denúncia descartada.',
      )
      setNota('')
      setVersion((v) => v + 1)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reportedId = report && (typeof report.reported === 'object' && report.reported ? report.reported.id : (report.reported as number | null | undefined))
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
            {messageReasonLabel(report.motivo)} · {STATUS_LABEL[report.status]}
          </p>
          {report.detalhes && <p style={{ margin: 'calc(var(--base) * 0.5) 0 0', whiteSpace: 'pre-line' }}>{report.detalhes}</p>}
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
            {reportedId ? (
              <a href={`${admin}/collections/assinantes/${reportedId}`}>Abrir a conta de {report.reportedApelido ?? 'quem foi denunciado'}</a>
            ) : (
              <span>A conta foi apagada. Apelido: {report.reportedApelido}</span>
            )}
          </p>
          {report.nota && <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>Nota: {report.nota}</p>}
          {open && (
            <>
              <label
                htmlFor="denuncia-nota"
                style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'calc(var(--base) * 0.75)' }}
              >
                Nota (obrigatória para Resolver e Suspender; fica no Registro de ações)
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
                <button type="button" onClick={() => act('suspender')} disabled={busy || !reportedId} style={buttonStyle(true, busy || !reportedId)}>
                  Suspender mensagens
                </button>
                <button type="button" onClick={() => act('resolver')} disabled={busy} style={buttonStyle(false, busy)}>
                  Resolver
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
