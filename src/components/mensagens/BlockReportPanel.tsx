'use client'

import { useActionState } from 'react'

import { bloquear, denunciarConversa, desbloquear } from '@/lib/mensagens/actions'
import { MESSAGE_REPORT_REASONS } from '@/lib/mensagens/rules'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

/**
 * Block / report controls of a thread (REC-03). The other person is derived on the server from
 * the conversation id; nothing identifying the other account is sent from here (T-05-05).
 */
export function BlockReportPanel({
  conversaId,
  euBloqueei,
  textos,
}: {
  conversaId: number
  euBloqueei: boolean
  textos: Textos<'mensagens'>
}) {
  const [state, formAction, pending] = useActionState(denunciarConversa, null)
  return (
    <div className="mt-10 flex max-w-[560px] flex-col gap-4">
      {euBloqueei ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-body">
            <TextoRico valor={textos.bloqueado} linha />
          </p>
          <form action={desbloquear}>
            <input type="hidden" name="conversa" value={conversaId} />
            <button type="submit" className="min-h-11 rounded-lg border border-line px-5 text-body text-text hover:border-accent">
              <TextoRico valor={textos.desbloquear} linha />
            </button>
          </form>
        </div>
      ) : (
        <details className="rounded-lg border border-line px-4 py-3">
          <summary className="type-label cursor-pointer text-muted"><TextoRico valor={textos.bloquearResumo} linha /></summary>
          <form action={bloquear} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="conversa" value={conversaId} />
            <TextoRico valor={textos.bloquearAviso} className="text-body text-muted" />
            <div>
              <button type="submit" className="min-h-11 rounded-lg border border-line px-5 text-body text-text hover:border-accent">
                <TextoRico valor={textos.bloquearConfirmar} linha />
              </button>
            </div>
          </form>
        </details>
      )}
      <details className="rounded-lg border border-line px-4 py-3">
        <summary className="type-label cursor-pointer text-muted"><TextoRico valor={textos.denunciarResumo} linha /></summary>
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="conversa" value={conversaId} />
          <fieldset className="flex flex-col gap-2">
            <legend className="type-label mb-1 text-text"><TextoRico valor={textos.denunciarMotivo} linha /></legend>
            {MESSAGE_REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex min-h-11 items-center gap-3 text-body text-text">
                <input type="radio" name="motivo" value={r.value} required />
                {r.label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-2 type-label text-text">
            <TextoRico valor={textos.denunciarDetalhes} linha />
            <textarea
              name="detalhes"
              rows={3}
              maxLength={500}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-body text-text focus:border-accent"
            />
          </label>
          {!euBloqueei && (
            <label className="flex min-h-11 items-center gap-3 text-body text-text">
              <input type="checkbox" name="bloquear" defaultChecked />
              <TextoRico valor={textos.denunciarTambemBloquear} linha />
            </label>
          )}
          {state && (
            <p role={state.ok ? 'status' : 'alert'} className={`text-body ${state.ok ? 'text-text' : 'text-danger'}`}>
              {state.message}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-lg border border-line px-5 text-body text-text hover:border-accent disabled:opacity-50"
            >
              <TextoRico valor={textos.denunciarEnviar} linha />
            </button>
          </div>
        </form>
      </details>
    </div>
  )
}
