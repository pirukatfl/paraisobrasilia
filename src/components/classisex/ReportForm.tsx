'use client'

import { useActionState } from 'react'

import { denunciarAnuncio } from '@/lib/classisex/actions'
import { REPORT_REASONS } from '@/lib/classisex/report-rules'
import type { Textos } from '@/lib/textos/areas'

const REASON_FIELD = {
  'contato-falso': 'motivoContatoFalso',
  'golpe-ou-cobranca': 'motivoGolpe',
  ofensivo: 'motivoOfensivo',
  'menor-de-idade': 'motivoMenor',
  'sem-autorizacao-de-imagem': 'motivoSemAutorizacao',
  outro: 'motivoOutro',
} as const satisfies Record<(typeof REPORT_REASONS)[number]['value'], keyof Textos<'classisex'>>

/**
 * "Denunciar este anúncio" on the full ad (CLAS-05, D-08). Shown only to viewers who are not the
 * owner; the server decides that and the reporter always comes from the session.
 */
export function ReportForm({ adId, textos: t }: { adId: number; textos: Textos<'classisex'> }) {
  const [state, formAction, pending] = useActionState(denunciarAnuncio, null)
  return (
    <details className="mt-10 max-w-[560px] rounded-lg border border-line px-4 py-3">
      <summary className="type-label cursor-pointer text-muted">{t.denunciarResumo}</summary>
      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="anuncio" value={adId} />
        <fieldset className="flex flex-col gap-2">
          <legend className="type-label mb-1 text-text">{t.denunciarMotivo}</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex min-h-11 items-center gap-3 text-body text-text">
              <input type="radio" name="motivo" value={r.value} required />
              {t[REASON_FIELD[r.value]]}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-2 type-label text-text">
          {t.denunciarDetalhes}
          <textarea
            name="detalhes"
            rows={3}
            maxLength={500}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-body text-text focus:border-accent"
          />
        </label>
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
            {t.denunciarBotao}
          </button>
        </div>
      </form>
    </details>
  )
}
