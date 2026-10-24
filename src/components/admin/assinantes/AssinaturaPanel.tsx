'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { renewalWindow, validUntilLabel } from '../../../lib/assinantes/periods'
import { mensagemDaResposta, mensagemDeExcecao } from '../../../lib/errors'

/**
 * "Assinatura" panel on the subscriber page in /admin (PAINEL-05): situation, release/renew
 * with the payment record, and end access now. A thin client over the staff-only endpoints
 * (src/lib/assinantes/endpoints.ts); the server recomputes every date — the preview here is
 * advisory only (T-03-15).
 */

type Situacao = {
  assinante: { id: number; name: string; email: string; whatsapp: string | null }
  access: {
    state: 'ativa' | 'vencida' | 'encerrada' | 'sem-assinatura'
    validUntil: string | null
    validUntilLabel: string | null
    daysLeft: number | null
    lastEndedAt: string | null
  }
  plans: { id: number; name: string; durationDays: number; price: number; promoPrice: number | null }[]
}

const METHODS = [
  { label: 'Pix', value: 'pix' },
  { label: 'PagBank (cartão/boleto pelo link)', value: 'pagbank' },
  { label: 'Dinheiro', value: 'dinheiro' },
  { label: 'Transferência', value: 'transferencia' },
  { label: 'Cortesia', value: 'cortesia' },
  { label: 'Outro', value: 'outro' },
]

const COURTESY = 'cortesia-outro-prazo'

const todayInBrasilia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )

function situationLine(s: Situacao['access']): string {
  switch (s.state) {
    case 'ativa':
      return `Situação: Ativa — válida até ${s.validUntilLabel}${
        s.daysLeft !== null ? ` (${s.daysLeft === 1 ? 'falta 1 dia' : `faltam ${s.daysLeft} dias`})` : ''
      }`
    case 'vencida':
      return `Situação: Vencida em ${s.lastEndedAt ? validUntilLabel(s.lastEndedAt) : ''}`
    case 'encerrada':
      return 'Situação: Encerrada'
    default:
      return 'Situação: Sem assinatura'
  }
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: 'calc(var(--base) * 1)',
  marginBottom: 'calc(var(--base) * 1.5)',
  background: 'var(--theme-elevation-50)',
}
const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) * 0.75)', marginTop: 'calc(var(--base) * 0.75)' }
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180, flex: '1 1 180px' }
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--theme-elevation-250)',
  borderRadius: 'var(--style-radius-s, 3px)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-text)',
  font: 'inherit',
}
const buttonStyle = (variant: 'primary' | 'danger' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 'var(--style-radius-s, 3px)',
  border: variant === 'secondary' ? '1px solid var(--theme-elevation-400)' : 'none',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  background:
    variant === 'primary' ? 'var(--theme-elevation-1000)' : variant === 'danger' ? 'var(--theme-error-500)' : 'transparent',
  color: variant === 'primary' ? 'var(--theme-elevation-0)' : variant === 'danger' ? '#fff' : 'var(--theme-text)',
})

async function fetchSituacao(url: string): Promise<Situacao> {
  const res = await fetch(url, { credentials: 'include' })
  const json = (await res.json().catch(() => ({}))) as Situacao & { message?: string }
  if (!res.ok) throw new Error(mensagemDaResposta(res.status, json))
  return json
}

export function AssinaturaPanel() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const router = useRouter()
  const api = `${config.serverURL ?? ''}${config.routes.api}/assinantes/${id}`

  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [planChoice, setPlanChoice] = useState('')
  const [days, setDays] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('pix')
  const [paidAt, setPaidAt] = useState(todayInBrasilia())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [link, setLink] = useState<{ url: string; whatsappUrl: string | null } | null>(null)
  const [linkStatus, setLinkStatus] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchSituacao(`${api}/situacao`).then(
      (data) => {
        if (cancelled) return
        setSituacao(data)
        setLoadError(null)
      },
      (err: Error) => {
        if (!cancelled) setLoadError(`Não foi possível carregar a assinatura: ${mensagemDeExcecao(err)}`)
      },
    )
    return () => {
      cancelled = true
    }
  }, [api, id, version])

  const plan = situacao?.plans.find((p) => String(p.id) === planChoice) ?? null
  const durationDays = planChoice === COURTESY ? Number(days) : (plan?.durationDays ?? 0)

  const preview = useMemo(() => {
    if (!situacao || !Number.isInteger(durationDays) || durationDays < 1) return null
    const current =
      situacao.access.state === 'ativa' && situacao.access.validUntil ? new Date(situacao.access.validUntil) : null
    const { endsAt } = renewalWindow({ now: new Date(), currentAccessUntil: current, durationDays })
    return validUntilLabel(endsAt)
  }, [situacao, durationDays])

  if (!id) return null // create screen: the account does not exist yet

  const onPlanChange = (value: string) => {
    setPlanChoice(value)
    const chosen = situacao?.plans.find((p) => String(p.id) === value)
    if (chosen) setAmount(String(chosen.promoPrice ?? chosen.price))
    if (value === COURTESY) {
      setAmount('0')
      setMethod('cortesia')
    }
  }

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${api}/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) throw new Error(mensagemDaResposta(res.status, json))
    return json
  }

  const liberar = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const result = await post('liberar', {
        planId: planChoice === COURTESY ? null : planChoice || null,
        durationDays: planChoice === COURTESY ? Number(days) : undefined,
        amount: amount === '' ? undefined : Number(amount.replace(',', '.')),
        method,
        paidAt: paidAt ? `${paidAt}T12:00:00.000-03:00` : undefined,
        note,
      })
      const verb = result.action === 'acesso-renovado' ? 'Acesso renovado' : 'Acesso liberado'
      setStatus(`${verb} até ${result.validUntilLabel}.`)
      setNote('')
      reload()
      router.refresh()
    } catch (err) {
      setError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  const encerrar = async () => {
    const reason = window.prompt('Motivo do encerramento')
    if (reason === null) return
    if (!window.confirm(`Encerrar o acesso de ${situacao?.assinante.name ?? 'este assinante'} agora?`)) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await post('encerrar', { reason })
      setStatus('Acesso encerrado.')
      reload()
      router.refresh()
    } catch (err) {
      setError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  const gerarLink = async () => {
    setBusy(true)
    setLinkError(null)
    setLinkStatus(null)
    try {
      const result = await post('link-senha', {})
      setLink({ url: String(result.url), whatsappUrl: (result.whatsappUrl as string | null) ?? null })
      setLinkStatus('Link gerado. Links anteriores deixaram de valer.')
    } catch (err) {
      setLinkError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  const copiar = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      setLinkStatus('Link copiado.')
    } catch {
      setLinkStatus('Selecione o link e copie manualmente.')
    }
  }

  const active = situacao?.access.state === 'ativa'

  return (
    <section aria-labelledby="assinatura-titulo" style={box}>
      <h3 id="assinatura-titulo" style={{ margin: 0 }}>
        Assinatura
      </h3>
      {loadError && <p role="alert">{loadError}</p>}
      {situacao && (
        <>
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0', fontWeight: 600 }}>{situationLine(situacao.access)}</p>

          <div style={row}>
            <label style={fieldStyle} htmlFor="assinatura-plano">
              Plano
              <select
                id="assinatura-plano"
                value={planChoice}
                onChange={(e) => onPlanChange(e.target.value)}
                style={inputStyle}
              >
                <option value="">Escolha…</option>
                {situacao.plans.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} ({p.durationDays} dias)
                  </option>
                ))}
                <option value={COURTESY}>Cortesia / outro prazo</option>
              </select>
            </label>
            {planChoice === COURTESY && (
              <label style={fieldStyle} htmlFor="assinatura-dias">
                Dias de acesso
                <input
                  id="assinatura-dias"
                  type="number"
                  min={1}
                  step={1}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  style={inputStyle}
                />
              </label>
            )}
            <label style={fieldStyle} htmlFor="assinatura-valor">
              Valor pago (R$)
              <input
                id="assinatura-valor"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle} htmlFor="assinatura-forma">
              Forma de pagamento
              <select id="assinatura-forma" value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldStyle} htmlFor="assinatura-data">
              Data do pagamento
              <input
                id="assinatura-data"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <div style={row}>
            <label style={{ ...fieldStyle, flex: '1 1 100%' }} htmlFor="assinatura-obs">
              Observação
              <input
                id="assinatura-obs"
                value={note}
                placeholder="Ex.: comprovante recebido no WhatsApp em 19/10"
                onChange={(e) => setNote(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          {preview && <p style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>Acesso até {preview}</p>}
          <div style={row}>
            <button
              type="button"
              onClick={liberar}
              disabled={busy || !preview}
              style={{ ...buttonStyle('primary'), opacity: busy || !preview ? 0.6 : 1 }}
            >
              {active ? 'Renovar' : 'Liberar acesso'}
            </button>
            {active && (
              <button type="button" onClick={encerrar} disabled={busy} style={buttonStyle('danger')}>
                Encerrar acesso agora
              </button>
            )}
          </div>
          {status && (
            <p role="status" style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
              {status}
            </p>
          )}
          {error && (
            <p role="alert" style={{ marginTop: 'calc(var(--base) * 0.75)', color: 'var(--theme-error-500)' }}>
              {error}
            </p>
          )}

          <div
            role="group"
            aria-labelledby="assinatura-senha-titulo"
            style={{ marginTop: 'calc(var(--base) * 1.5)', borderTop: '1px solid var(--theme-elevation-150)' }}
          >
            <h4 id="assinatura-senha-titulo" style={{ margin: 'calc(var(--base) * 1) 0 0' }}>
              Senha
            </h4>
            <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
              Para definir uma senha provisória, use o campo Senha desta ficha.
            </p>
            <div style={row}>
              <button type="button" onClick={gerarLink} disabled={busy} style={buttonStyle('secondary')}>
                Gerar link de nova senha
              </button>
            </div>
            {link && (
              <>
                <div style={row}>
                  <label style={{ ...fieldStyle, flex: '1 1 100%' }} htmlFor="assinatura-link">
                    Link de nova senha
                    <input
                      id="assinatura-link"
                      readOnly
                      value={link.url}
                      onFocus={(e) => e.target.select()}
                      style={inputStyle}
                    />
                  </label>
                </div>
                <div style={row}>
                  <button type="button" onClick={copiar} style={buttonStyle('secondary')}>
                    Copiar
                  </button>
                  {link.whatsappUrl && (
                    <a
                      href={link.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}
                    >
                      Enviar pelo WhatsApp
                    </a>
                  )}
                </div>
                <p style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>Vale por 48 horas e só pode ser usado uma vez.</p>
              </>
            )}
            {linkStatus && (
              <p role="status" style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
                {linkStatus}
              </p>
            )}
            {linkError && (
              <p role="alert" style={{ marginTop: 'calc(var(--base) * 0.75)', color: 'var(--theme-error-500)' }}>
                {linkError}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
