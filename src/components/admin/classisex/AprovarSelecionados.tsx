'use client'

import { useConfig, useSelection } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { postJson, type BulkReply } from './aprovar-lista'
import { mensagemDaResposta, mensagemDeExcecao } from '../../../lib/errors'

/** Same cap as the server (BULK_APPROVE_MAX in src/lib/classisex/service.ts). */
const MAX = 200

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: 'calc(var(--base) * 0.75) calc(var(--base) * 1)',
  marginBottom: 'calc(var(--base) * 1)',
  background: 'var(--theme-elevation-50)',
}

/**
 * "Aprovar selecionados" above the Anúncios list (staff, /admin). The ads are ticked with the
 * list's own checkboxes (the top box ticks the whole page; "selecionar todos" covers every page).
 * Calls POST /api/ads/aprovar-lote, which runs the single-approval rules on each ad and answers with
 * the ones approved and, for the others, the reason; those stay as they were.
 */
export function AprovarSelecionados() {
  const { config } = useConfig()
  const router = useRouter()
  const { selectAll, selectedIDs, getQueryParams, count } = useSelection()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState<BulkReply | null>(null)

  // SelectAllStatus.AllAvailable (the enum is not exported by @payloadcms/ui): "select all N" across pages
  const allPages = String(selectAll) === 'allAvailable'
  const api = `${config.serverURL ?? ''}${config.routes.api}`
  const total = allPages ? count : selectedIDs.length

  const approve = async () => {
    setBusy(true)
    setError(null)
    setReply(null)
    try {
      let ids: (number | string)[] = selectedIDs
      if (allPages) {
        // Every page of the current filter: only the ads that can be approved here, ids only
        const query = getQueryParams({
          or: [
            { status: { equals: 'pendente' } },
            { and: [{ status: { equals: 'rascunho' } }, { origemLegado: { equals: 'equipe' } }] },
          ],
        })
        const res = await fetch(`${api}/ads${query}&limit=${MAX + 1}&depth=0&pagination=false&select[id]=true`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`Não foi possível listar os anúncios selecionados: ${mensagemDaResposta(res.status, await res.json().catch(() => null))}`)
        ids = ((await res.json()) as { docs: { id: number }[] }).docs.map((d) => d.id)
      }
      if (ids.length === 0) throw new Error('Nenhum anúncio para aprovar na seleção.')
      if (ids.length > MAX) throw new Error(`Aprove até ${MAX} anúncios por vez: filtre a lista ou marque menos.`)
      const result = await postJson<BulkReply>(`${api}/ads/aprovar-lote`, { ids })
      setReply(result)
      router.refresh()
    } catch (err) {
      setError(mensagemDeExcecao(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="aprovar-lote-titulo" style={box}>
      <h3 id="aprovar-lote-titulo" style={{ margin: 0, fontSize: '1rem' }}>
        Aprovar em massa
      </h3>
      <p style={{ margin: 'calc(var(--base) * 0.25) 0 calc(var(--base) * 0.5)' }}>
        Marque os anúncios na lista (a caixa do topo marca a página toda) e clique em &quot;Aprovar selecionados&quot;.
        Os que não passarem nas regras (contato, tamanho do texto, situação) ficam como estavam e são listados aqui.
      </p>
      <button
        type="button"
        onClick={approve}
        disabled={busy || total === 0}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--style-radius-s, 3px)',
          border: 'none',
          cursor: busy ? 'wait' : total === 0 ? 'not-allowed' : 'pointer',
          opacity: busy || total === 0 ? 0.5 : 1,
          font: 'inherit',
          fontWeight: 600,
          background: 'var(--theme-elevation-1000)',
          color: 'var(--theme-elevation-0)',
        }}
      >
        {busy ? 'Aprovando…' : `Aprovar selecionados (${total})`}
      </button>
      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)', margin: 'calc(var(--base) * 0.5) 0 0' }}>
          {error}
        </p>
      )}
      {reply && (
        <div role="status" style={{ marginTop: 'calc(var(--base) * 0.5)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {reply.aprovados.length === 1 ? '1 anúncio aprovado' : `${reply.aprovados.length} anúncios aprovados`}
            {reply.falhas.length > 0 &&
              `; ${reply.falhas.length} ${reply.falhas.length === 1 ? 'não foi aprovado' : 'não foram aprovados'}`}
            .
          </p>
          {reply.falhas.length > 0 && (
            <ul style={{ margin: 'calc(var(--base) * 0.25) 0 0', paddingLeft: '1.25rem' }}>
              {reply.falhas.map((f) => (
                <li key={f.id}>
                  <a href={`${config.routes.admin}/collections/ads/${f.id}`}>
                    #{f.id}
                    {f.resumo ? ` ${f.resumo}` : ''}
                  </a>
                  : {f.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
