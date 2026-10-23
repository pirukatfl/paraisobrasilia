import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { cached } from '../cache/cached'
import { toDicaCardDTO, toPublicDicaDTO, type DicaCardDTO, type PublicDicaDTO } from './dto'
import { findLatestDicas, findPublishedDica, findPublishedDicaSlugs, findPublishedDicas } from './reads'

export type PublicDicasPage = { items: DicaCardDTO[]; page: number; totalPages: number }

/** Open list of dicas (12 per page). Tag 'dicas'. */
export const getPublicDicas = cached(
  async (page: number): Promise<PublicDicasPage> => {
    const payload = await getPayload({ config })
    const res = await findPublishedDicas(payload, { page })
    return { items: res.items.map(toDicaCardDTO), page: res.page, totalPages: res.totalPages }
  },
  ['dicas:list'],
  () => ['dicas'],
)

/** One published dica, open blocks only. Tags 'dicas' and 'dica:{slug}'. */
export const getPublicDica = cached(
  async (slug: string): Promise<PublicDicaDTO | null> => {
    const payload = await getPayload({ config })
    const doc = await findPublishedDica(payload, slug)
    return doc ? toPublicDicaDTO(doc) : null
  },
  ['dicas:one'],
  (slug) => ['dicas', `dica:${slug}`],
)

/** The n newest dicas (home teaser, "Leia também"). Tag 'dicas'. */
export const getLatestDicas = cached(
  async (n: number): Promise<DicaCardDTO[]> => {
    const payload = await getPayload({ config })
    return (await findLatestDicas(payload, n)).map(toDicaCardDTO)
  },
  ['dicas:latest'],
  () => ['dicas'],
)

export const getPublicDicaSlugs = cached(
  async () => {
    const payload = await getPayload({ config })
    return findPublishedDicaSlugs(payload)
  },
  ['dicas:slugs'],
  () => ['dicas'],
)
