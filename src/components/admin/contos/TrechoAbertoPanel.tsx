'use client'

import { useFormFields } from '@payloadcms/ui'

import {
  DEFAULT_OPEN_BLOCKS,
  plainTextOf,
  splitConto,
  SINGLE_BLOCK_WORDS,
  type LexicalStateLike,
} from '../../../lib/contos/excerpt'

/**
 * "Trecho aberto" panel of a conto in /admin (PAINEL-03, PREV-03). Pure preview: it reads the
 * form values and applies the same splitConto rule as the public page. No network calls.
 */

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 'var(--style-radius-m, 4px)',
  padding: 'calc(var(--base) * 1)',
  marginBottom: 'calc(var(--base) * 1.5)',
  background: 'var(--theme-elevation-50)',
}
const preview: React.CSSProperties = {
  margin: 'calc(var(--base) * 0.5) 0 0',
  padding: 'calc(var(--base) * 0.5) calc(var(--base) * 0.75)',
  borderLeft: '3px solid var(--theme-elevation-400)',
  whiteSpace: 'pre-line',
  color: 'var(--theme-elevation-800)',
}

export function TrechoAbertoPanel() {
  const texto = useFormFields(([fields]) => fields.texto?.value) as LexicalStateLike | null | undefined
  const abertosRaw = useFormFields(([fields]) => fields.paragrafosAbertos?.value)
  const wanted = typeof abertosRaw === 'number' ? abertosRaw : Number(abertosRaw) || DEFAULT_OPEN_BLOCKS
  const split = splitConto(texto, wanted)
  const rest = split.totalBlocks - split.openBlocks

  let summary: React.ReactNode
  if (split.totalBlocks === 0) {
    summary = <p>Escreva o texto para ver como o conto aparece na área aberta.</p>
  } else if (split.totalBlocks === 1) {
    summary = (
      <p>
        Visitantes leem as primeiras {SINGLE_BLOCK_WORDS} palavras; o conto inteiro fica para assinantes.
      </p>
    )
  } else {
    summary = (
      <>
        <p>
          <strong>
            Visitantes leem {split.openBlocks} de {split.totalBlocks} parágrafos
          </strong>{' '}
          ({split.openWords} de {split.totalWords} palavras).
        </p>
        <p>
          Só assinantes: {rest} {rest === 1 ? 'parágrafo' : 'parágrafos'}
        </p>
        {wanted >= split.totalBlocks ? <p>Pelo menos um parágrafo fica sempre para assinantes.</p> : null}
      </>
    )
  }

  return (
    <div style={box} data-testid="trecho-aberto">
      <h4 style={{ margin: 0 }}>Trecho aberto</h4>
      {summary}
      {split.totalBlocks > 0 ? (
        <>
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0', fontSize: '0.85em' }}>Como aparece na área aberta</p>
          <div style={preview}>{plainTextOf(split.open)}</div>
        </>
      ) : null}
    </div>
  )
}
