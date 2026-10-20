'use client'

import { useConfig, useDocumentInfo, useForm } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * "Moderação" panel at the top of a recado in /admin (REC-04). Thin client over the staff-only
 * endpoints in src/lib/recados/endpoints.ts; the text shown is the stored (already redacted) text.
 */

type Status = 'pendente' | 'aprovado' | 'recusado' | 'despublicado'

type View = {
  id: number
  status: Status
  statusLabel: string
  motivo: string | null
  apelido: string
  texto: string
  contatosRemovidos: number
  fields: Record<string, unknown>
}

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: 'calc(var(--base) * 1)',
  marginBottom: 'calc(var(--base) * 1.5)',
  background: 'var(--theme-elevation-50)',
}
const quote: React.CSSProperties = {
  margin: 'calc(var(--base) * 0.5) 0 0',
  padding: 'calc(var(--base) * 0.5) calc(var(--base) * 0.75)',
  borderLeft: '3px solid var(--theme-elevation-400)',
  whiteSpace: 'pre-line',
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
const buttonStyle = (variant: 'primary' | 'danger' | 'secondary', disabled: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 'var(--style-radius-s, 3px)',
  border: variant === 'secondary' ? '1px solid var(--theme-elevation-400)' : 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  font: 'inherit',
  fontWeight: 600,
  background:
    variant === 'primary' ? 'var(--theme-elevation-1000)' : variant === 'danger' ? 'var(--theme-error-500)' : 'transparent',
  color: variant === 'primary' ? 'var(--theme-elevation-0)' : variant === 'danger' ? '#fff' : 'var(--theme-text)',
})

async function fetchView(url: string): Promise<View> {
  const res = await fetch(url, { credentials: 'include' })
  const json = (await res.json().catch(() => ({}))) as View & { message?: string }
  if (!res.ok) throw new Error(json.message ?? 'Erro')
  return json
}

const DONE: Record<string, string> = {
  aprovar: 'Recado aprovado: já aparece no mural.',
  recusar: 'Recado recusado. Quem escreveu vê o motivo em Recados.',
  despublicar: 'Recado despublicado.',
}

export function RecadoModeracaoPanel() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const { dispatchFields, setModified } = useForm()
  const router = useRouter()
  const api = `${config.serverURL ?? ''}${config.routes.api}/recados/${id}`

  const [view, setView] = useState<View | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchView(`${api}/moderacao`).then(
      (data) => {
        if (cancelled) return
        setView(data)
        setLoadError(null)
        // Keep the document form in sync so a later "Salvar" does not send the old situation back
        for (const [path, value] of Object.entries(data.fields)) {
          dispatchFields({ type: 'UPDATE', path, value, initialValue: value })
        }
        setModified(false)
      },
      (err: Error) => {
        if (!cancelled) setLoadError(`Não foi possível carregar a moderação: ${err.message}`)
      },
    )
    return () => {
      cancelled = true
    }
    // dispatchFields/setModified are stable form callbacks; reload only when the ad or version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, id, version])

  if (!id) return null // create screen: nothing to moderate yet

  const act = async (kind: 'aprovar' | 'recusar' | 'despublicar') => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`${api}/${kind}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'aprovar' ? {} : { motivo }),
      })
      const json = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) throw new Error(json.message ?? 'Não foi possível concluir.')
      setStatus(DONE[kind])
      setMotivo('')
      setVersion((v) => v + 1)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const s = view?.status
  const situation = view ? `Situação: ${view.statusLabel}${view.motivo ? ` — ${view.motivo}` : ''}` : ''

  return (
    <section aria-labelledby="moderacao-titulo" style={box}>
      <h3 id="moderacao-titulo" style={{ margin: 0 }}>
        Moderação
      </h3>
      {loadError && <p role="alert">{loadError}</p>}
      {view && (
        <>
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0', fontWeight: 600 }}>{situation}</p>

          <div role="region" aria-labelledby="moderacao-publico" style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
            <h4 id="moderacao-publico" style={{ margin: 0 }}>
              Como aparece no mural
            </h4>
            <p style={quote}>
              {view.apelido}: {view.texto}
            </p>
            <p style={{ margin: 'calc(var(--base) * 0.25) 0 0', opacity: 0.8 }}>
              {view.contatosRemovidos > 0
                ? `O sistema retirou ${view.contatosRemovidos} contato(s) do texto. Confira antes de aprovar.`
                : 'Só assinantes com acesso ativo veem o mural. Confira o texto antes de aprovar.'}
            </p>
          </div>

          <label
            htmlFor="moderacao-motivo"
            style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'calc(var(--base) * 0.75)' }}
          >
            Motivo (para Recusar ou Despublicar)
            <textarea
              id="moderacao-motivo"
              rows={2}
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: ofensivo; pede dinheiro"
              style={inputStyle}
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) * 0.75)', marginTop: 'calc(var(--base) * 0.75)' }}>
            <button
              type="button"
              onClick={() => act('aprovar')}
              disabled={busy || s === 'aprovado'}
              style={buttonStyle('primary', busy || s === 'aprovado')}
            >
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => act('recusar')}
              disabled={busy || s !== 'pendente'}
              style={buttonStyle('secondary', busy || s !== 'pendente')}
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={() => act('despublicar')}
              disabled={busy || (s !== 'aprovado' && s !== 'pendente')}
              style={buttonStyle('danger', busy || (s !== 'aprovado' && s !== 'pendente'))}
            >
              Despublicar
            </button>
          </div>
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
