/**
 * Age of the ad (novo planejamento 2026-11-01, item K). Optional, 18 to 99, shown and filtered
 * ONLY in the members area: the open area never carries it (see toPublicAdDTO and findPublicAds).
 * Pure: no Payload/Next imports.
 */
export const IDADE_MIN = 18
export const IDADE_MAX = 99

export const IDADE_MESSAGE = `Idade: informe um número de ${IDADE_MIN} a ${IDADE_MAX}.`

/** Age ranges of the members filter. `key` is what travels in `?idade=`. */
export const FAIXAS_IDADE = [
  { key: '18-29', min: 18, max: 29 },
  { key: '30-39', min: 30, max: 39 },
  { key: '40-49', min: 40, max: 49 },
  { key: '50-mais', min: 50, max: IDADE_MAX },
] as const

export type FaixaIdade = (typeof FAIXAS_IDADE)[number]['key']

/** Only the four known keys pass; anything else (untrusted query string) means "Todas". */
export function parseFaixaIdade(raw: unknown): FaixaIdade | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw
  return FAIXAS_IDADE.find((f) => f.key === value)?.key
}

export function limitesDaFaixa(key: FaixaIdade): { min: number; max: number } {
  const faixa = FAIXAS_IDADE.find((f) => f.key === key)!
  return { min: faixa.min, max: faixa.max }
}

/** Empty -> no age (null); a whole number 18..99 -> that number; anything else -> an error message. */
export function lerIdade(raw: string | number | null | undefined): { ok: true; idade: number | null } | { ok: false; error: string } {
  const texto = String(raw ?? '').trim()
  if (texto === '') return { ok: true, idade: null }
  if (!/^\d{1,3}$/.test(texto)) return { ok: false, error: IDADE_MESSAGE }
  const idade = Number.parseInt(texto, 10)
  return idade >= IDADE_MIN && idade <= IDADE_MAX ? { ok: true, idade } : { ok: false, error: IDADE_MESSAGE }
}
