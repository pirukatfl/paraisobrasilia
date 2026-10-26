import type { AreaTextos } from './tipos'

/** Original text of every field of an area. */
export function padroesDaArea<A extends AreaTextos>(area: A): { [K in keyof A['campos']]: string } {
  const out: Record<string, string> = {}
  for (const [nome, campo] of Object.entries(area.campos)) out[nome] = campo.padrao
  return out as { [K in keyof A['campos']]: string }
}

/** Saved value when it has visible text, else the original (T-03: empty field = original text). */
export function mesclarTextos<A extends AreaTextos>(
  area: A,
  doc: Record<string, unknown> | null | undefined,
): { [K in keyof A['campos']]: string } {
  const out: Record<string, string> = {}
  for (const [nome, campo] of Object.entries(area.campos)) {
    const salvo = doc?.[nome]
    out[nome] = typeof salvo === 'string' && salvo.trim() !== '' ? salvo : campo.padrao
  }
  return out as { [K in keyof A['campos']]: string }
}

/** Replaces {name} with its value; unknown names stay as written (T-06). */
export function preencher(texto: string, vars: Record<string, string | number>): string {
  return texto.replace(/\{([a-zA-Z0-9_]+)\}/g, (inteiro, nome: string) =>
    Object.prototype.hasOwnProperty.call(vars, nome) ? String(vars[nome]) : inteiro,
  )
}
