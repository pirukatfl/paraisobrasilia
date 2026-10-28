import { textoParaRico, ricoTemTexto } from './rico'
import type { AreaTextos, TextosDaArea } from './tipos'
import { campoEhFormatado } from './tipos'

export { preencher } from './preencher'

/** Original text of every field of an area (formatted fields converted to editor state). */
export function padroesDaArea<A extends AreaTextos>(area: A): TextosDaArea<A> {
  const out: Record<string, unknown> = {}
  for (const [nome, campo] of Object.entries(area.campos)) {
    out[nome] = campoEhFormatado(campo) ? textoParaRico(campo.padrao) : campo.padrao
  }
  return out as TextosDaArea<A>
}

/**
 * Saved value when it has visible text, else the original (T-03: empty field = original text). A formatted
 * field still holding a plain string (before the migration ran) is converted to editor state.
 */
export function mesclarTextos<A extends AreaTextos>(
  area: A,
  doc: Record<string, unknown> | null | undefined,
): TextosDaArea<A> {
  const out: Record<string, unknown> = {}
  for (const [nome, campo] of Object.entries(area.campos)) {
    const salvo = doc?.[nome]
    if (campoEhFormatado(campo)) {
      if (ricoTemTexto(salvo)) out[nome] = salvo
      else if (typeof salvo === 'string' && salvo.trim() !== '') out[nome] = textoParaRico(salvo)
      else out[nome] = textoParaRico(campo.padrao)
    } else {
      out[nome] = typeof salvo === 'string' && salvo.trim() !== '' ? salvo : campo.padrao
    }
  }
  return out as TextosDaArea<A>
}
