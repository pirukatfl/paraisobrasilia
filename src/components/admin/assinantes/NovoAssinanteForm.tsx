'use client'

import { useConfig } from '@payloadcms/ui'
import { useState } from 'react'

import { mensagemDaResposta, mensagemDeExcecao } from '../../../lib/errors'

export type PlanOption = { id: number; name: string; durationDays: number; amount: number }

type Result = {
  assinante: { id: number; name: string; email: string }
  access: { validUntilLabel: string } | null
  link: { url: string; expiresAt: string; whatsappUrl: string | null }
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
const NO_ACCESS = 'sem-acesso'

const todayInBrasilia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )

const group: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: 'calc(var(--base) * 1)',
  marginBottom: 'calc(var(--base) * 1)',
  background: 'var(--theme-elevation-50)',
}
const legend: React.CSSProperties = { fontWeight: 600, padding: 0, marginBottom: 'calc(var(--base) * 0.25)' }
const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) * 0.75)', marginTop: 'calc(var(--base) * 0.5)' }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200, flex: '1 1 200px' }
const hint: React.CSSProperties = { fontSize: '0.85em', color: 'var(--theme-elevation-600)', fontWeight: 400 }
const input: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--theme-elevation-250)',
  borderRadius: 'var(--style-radius-s, 3px)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-text)',
  font: 'inherit',
}
const button = (variant: 'primary' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 'var(--style-radius-s, 3px)',
  border: variant === 'secondary' ? '1px solid var(--theme-elevation-400)' : 'none',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
  background: variant === 'primary' ? 'var(--theme-elevation-1000)' : 'transparent',
  color: variant === 'primary' ? 'var(--theme-elevation-0)' : 'var(--theme-text)',
})

export function NovoAssinanteForm({ plans, adminRoute }: { plans: PlanOption[]; adminRoute: string }) {
  const { config } = useConfig()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [planChoice, setPlanChoice] = useState('')
  const [days, setDays] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('pix')
  const [paidAt, setPaidAt] = useState(todayInBrasilia())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const grants = planChoice !== '' && planChoice !== NO_ACCESS
  const courtesy = planChoice === COURTESY

  const onPlanChange = (value: string) => {
    setPlanChoice(value)
    const chosen = plans.find((p) => String(p.id) === value)
    if (chosen) {
      setAmount(String(chosen.amount))
      if (method === 'cortesia') setMethod('pix')
    }
    if (value === COURTESY) {
      setAmount('0')
      setMethod('cortesia')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!planChoice) {
      setError('Escolha o plano, ou "Só criar a conta, sem acesso".')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${config.serverURL ?? ''}${config.routes.api}/assinantes/cadastro-completo`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          whatsapp,
          ...(grants
            ? {
                planId: courtesy ? null : planChoice,
                durationDays: courtesy ? Number(days) : undefined,
                amount: amount === '' ? undefined : Number(amount.replace(',', '.')),
                method,
                paidAt: paidAt ? `${paidAt}T12:00:00.000-03:00` : undefined,
                note,
              }
            : {}),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) throw new Error(mensagemDaResposta(res.status, json))
      setResult(json as unknown as Result)
    } catch (err) {
      setError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(`${label} copiado.`)
    } catch {
      setCopied('Selecione o texto e copie manualmente.')
    }
  }

  const reset = () => {
    setName('')
    setEmail('')
    setWhatsapp('')
    setPlanChoice('')
    setDays('')
    setAmount('')
    setMethod('pix')
    setPaidAt(todayInBrasilia())
    setNote('')
    setResult(null)
    setCopied(null)
  }

  if (result) {
    return (
      <section aria-labelledby="novo-pronto">
        <h1 id="novo-pronto" style={{ marginTop: 0 }}>
          {result.assinante.name} foi cadastrado
        </h1>
        <p style={{ marginTop: 0 }}>
          {result.access
            ? `Acesso liberado até ${result.access.validUntilLabel}.`
            : 'A conta foi criada sem acesso. Libere um plano na ficha quando o pagamento chegar.'}
        </p>
        <div style={group}>
          <label style={field} htmlFor="novo-link">
            Link para a pessoa criar a senha (vale 48 horas, uso único)
            <input id="novo-link" readOnly value={result.link.url} onFocus={(e) => e.currentTarget.select()} style={input} />
          </label>
          <div style={row}>
            <button type="button" onClick={() => copy(result.link.url, 'Link')} style={button('primary')}>
              Copiar link
            </button>
            {result.link.whatsappUrl ? (
              <a href={result.link.whatsappUrl} target="_blank" rel="noreferrer" style={button('secondary')}>
                Enviar por WhatsApp
              </a>
            ) : (
              <span style={hint}>Sem WhatsApp na ficha: copie o link e envie pelo canal que preferir.</span>
            )}
          </div>
          <p role="status" style={{ ...hint, minHeight: '1.4em' }}>
            {copied}
          </p>
        </div>
        <div style={row}>
          <a href={`${adminRoute}/collections/assinantes/${result.assinante.id}`} style={button('secondary')}>
            Abrir a ficha
          </a>
          <button type="button" onClick={reset} style={button('secondary')}>
            Cadastrar outro assinante
          </button>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={submit}>
      <h1 style={{ marginTop: 0 }}>Novo assinante</h1>
      <p style={{ marginTop: 0 }}>Cria a conta, libera o plano e gera o link para a pessoa definir a senha, tudo de uma vez.</p>

      <fieldset style={group}>
        <legend style={legend}>Quem é</legend>
        <div style={row}>
          <label style={field} htmlFor="novo-nome">
            Nome ou apelido
            <input id="novo-nome" required value={name} onChange={(e) => setName(e.target.value)} style={input} autoComplete="off" />
          </label>
          <label style={field} htmlFor="novo-email">
            E-mail
            <input id="novo-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={input} autoComplete="off" />
          </label>
          <label style={field} htmlFor="novo-whatsapp">
            WhatsApp (opcional)
            <input
              id="novo-whatsapp"
              inputMode="numeric"
              placeholder="5561999998888"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              style={input}
              autoComplete="off"
            />
            <span style={hint}>Só números, com 55 e DDD. Permite enviar o link direto pelo WhatsApp.</span>
          </label>
        </div>
      </fieldset>

      <fieldset style={group}>
        <legend style={legend}>Plano</legend>
        <div style={row}>
          <label style={field} htmlFor="novo-plano">
            Plano
            <select id="novo-plano" required value={planChoice} onChange={(e) => onPlanChange(e.target.value)} style={input}>
              <option value="">Escolha…</option>
              {plans.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.durationDays} dias)
                </option>
              ))}
              <option value={COURTESY}>Cortesia / outro prazo</option>
              <option value={NO_ACCESS}>Só criar a conta, sem acesso</option>
            </select>
          </label>
          {courtesy && (
            <label style={field} htmlFor="novo-dias">
              Dias de acesso
              <input id="novo-dias" type="number" min={1} step={1} required value={days} onChange={(e) => setDays(e.target.value)} style={input} />
            </label>
          )}
        </div>
        {grants && (
          <div style={row}>
            <label style={field} htmlFor="novo-valor">
              Valor pago (R$)
              <input id="novo-valor" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={input} />
            </label>
            <label style={field} htmlFor="novo-forma">
              Forma de pagamento
              <select id="novo-forma" value={method} onChange={(e) => setMethod(e.target.value)} style={input}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={field} htmlFor="novo-data">
              Data do pagamento
              <input id="novo-data" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} style={input} />
            </label>
            <label style={{ ...field, flex: '1 1 100%' }} htmlFor="novo-obs">
              Observação (opcional)
              <input id="novo-obs" value={note} onChange={(e) => setNote(e.target.value)} style={input} />
            </label>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} style={{ ...button('primary'), opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Criando…' : 'Criar assinante e gerar link'}
      </button>
    </form>
  )
}
