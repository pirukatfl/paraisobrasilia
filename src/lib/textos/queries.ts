import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { cached } from '../cache/cached'
import { AREAS, type AreaKey, type Textos } from './areas'
import { mesclarTextos, padroesDaArea } from './mesclar'

async function buscarDoBanco(area: AreaKey): Promise<Record<string, unknown>> {
  const payload = await getPayload({ config })
  // Slug comes from the registry (not user input); typed loosely because globals are generated per area
  const doc = await payload.findGlobal({ slug: AREAS[area].slug as never, depth: 0 })
  return doc as unknown as Record<string, unknown>
}

const buscarComCache = cached(buscarDoBanco, ['textos'], (area) => [`textos:${area}`, 'textos'])

/**
 * Texts of one area with empty fields replaced by the original text. Never throws: any failure
 * (e.g. prerender without a database) returns the original texts. Cache tag `textos:<area>`.
 */
export async function getTextos<K extends AreaKey>(area: K): Promise<Textos<K>> {
  const definicao = AREAS[area]
  const padroes = padroesDaArea(definicao) as Textos<K>
  if (Object.keys(definicao.campos).length === 0) return padroes
  try {
    return mesclarTextos(definicao, await buscarComCache(area)) as Textos<K>
  } catch (err) {
    console.error(`[textos] "${area}" unavailable, using original texts:`, err instanceof Error ? err.message : err)
    return padroes
  }
}
