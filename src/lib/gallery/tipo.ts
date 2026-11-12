import type { ModelCardDTO, ModelCategoria } from './types'

/** `?tipo=` values of /modelos (the Galeria submenus). Without it the page lists the professionals only. */
export type ModelTipo = 'profissionais' | 'amadoras'

const TIPO_TO_CATEGORIA: Record<ModelTipo, ModelCategoria> = {
  profissionais: 'profissional',
  amadoras: 'amadora',
}

/** Raw search param → tipo, or null for a missing/unknown value (= list all). */
export function parseTipo(value: string | string[] | undefined): ModelTipo | null {
  const v = Array.isArray(value) ? value[0] : value
  return v === 'profissionais' || v === 'amadoras' ? v : null
}

export function filterByTipo(models: ModelCardDTO[], tipo: ModelTipo | null): ModelCardDTO[] {
  if (!tipo) return models
  return models.filter((m) => m.categoria === TIPO_TO_CATEGORIA[tipo])
}

/** Anything but "amadora" counts as professional (rows saved before the field existed). */
export function toCategoria(value: unknown): ModelCategoria {
  return value === 'amadora' ? 'amadora' : 'profissional'
}
