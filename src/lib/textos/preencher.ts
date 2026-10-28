/** Replaces {name} with its value; unknown names stay as written (T-06). */
export function preencher(texto: string, vars: Record<string, string | number>): string {
  return texto.replace(/\{([a-zA-Z0-9_]+)\}/g, (inteiro, nome: string) =>
    Object.prototype.hasOwnProperty.call(vars, nome) ? String(vars[nome]) : inteiro,
  )
}
