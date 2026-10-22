'use client'

import { useConfig, useDocumentInfo, useForm } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * "Moderação" panel at the top of an ad in /admin (PAINEL-07, D-03). Thin client over the
 * staff-only endpoints in src/lib/classisex/endpoints.ts. The public preview text comes from the
 * server (redactContacts), so staff see exactly what visitors will see (T-04-01).
 */

type Status = 'pendente' | 'aprovado' | 'recusado' | 'despublicado' | 'rascunho'

type View = {
  id: number
  status: Status
  statusLabel: string
  motivo: string | null
  publicApelido: string
  publicCidade: string | null
  publicTexto: string
  euSouLabel: string
  contaAutor: 'Conta gratuita' | 'Assinante'
  rascunhoDaEquipe: boolean
  removed: number
  removedApelido: number
  contato: { whatsapp: string | null; telegram: string | null }
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
  aprovar: 'Anúncio aprovado: já aparece no ClassiSex.',
  recusar: 'Anúncio recusado. O anunciante vê o motivo em Meus anúncios.',
  despublicar: 'Anúncio despublicado.',
}

export function ModeracaoPanel() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const { dispatchFields, setModified } = useForm()
  const router = useRouter()
  const api = `${config.serverURL ?? ''}${config.routes.api}/ads/${id}`

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

          <p style={{ margin: 'calc(var(--base) * 0.25) 0 0' }}>
            Conta do anunciante:{' '}
            {view.contaAutor === 'Conta gratuita'
              ? 'Conta gratuita — no ClassiSex aparece só a capa, sem vídeos.'
              : 'Assinante'}
          </p>

          <div role="region" aria-labelledby="moderacao-publico" style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
            <h4 id="moderacao-publico" style={{ margin: 0 }}>
              Como aparece na área aberta
            </h4>
            <p style={quote}>
              <strong>
                {view.publicApelido} · {view.euSouLabel}
                {view.publicCidade ? ` · ${view.publicCidade}` : ''}
              </strong>
              {'\n'}
              {view.publicTexto}
              {'\n'}(com uma foto desfocada)
            </p>
            <p style={{ margin: 'calc(var(--base) * 0.25) 0 0', opacity: 0.8 }}>
              {view.removedApelido > 0
                ? 'O apelido tem um contato escondido: edite o apelido ou recuse o anúncio.'
                : view.removed > 0
                  ? 'O site escondeu contatos do texto (aparece "[contato só para assinantes]"). Confira se não sobrou nenhum escrito de outro jeito, como número por extenso, antes de aprovar.'
                  : 'Visitantes e contas gratuitas leem o apelido, o tipo, a cidade e o texto, com uma foto desfocada. Confira se não há contato escrito de outro jeito e veja as fotos antes de aprovar.'}
            </p>
          </div>

          <div style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
            <h4 style={{ margin: 0 }}>Contatos (só assinantes veem)</h4>
            <ul style={{ margin: 'calc(var(--base) * 0.25) 0 0', paddingLeft: '1.25rem' }}>
              {view.contato.whatsapp && <li>WhatsApp: {view.contato.whatsapp}</li>}
              {view.contato.telegram && <li>Telegram: @{view.contato.telegram}</li>}
            </ul>
          </div>

          {s === 'rascunho' && view.rascunhoDaEquipe ? (
            <div style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                Rascunho do site antigo, escrito pela equipe. Só a equipe vê. Troque o anunciante pelo dono certo
                (ele envia pelo site), ou confira o texto, os contatos e as fotos e aprove para publicar. Para
                descartar, apague o anúncio.
              </p>
              <div style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
                <button type="button" onClick={() => act('aprovar')} disabled={busy} style={buttonStyle('primary', busy)}>
                  Aprovar e publicar
                </button>
              </div>
            </div>
          ) : s === 'rascunho' ? (
            <p style={{ margin: 'calc(var(--base) * 0.75) 0 0', fontWeight: 600 }}>
              Rascunho do anunciante, trazido do site antigo. Só o anunciante pode enviar para análise.
            </p>
          ) : (
            <>
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
              placeholder="Ex.: telefone no texto; foto sem autorização"
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
              disabled={busy || s !== 'aprovado'}
              style={buttonStyle('danger', busy || s !== 'aprovado')}
            >
              Despublicar
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
