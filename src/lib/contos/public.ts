import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { cached } from '../cache/cached'
import { toContoCardDTO, toPublicContoDTO, type ContoCardDTO, type PublicContoDTO } from './dto'
import { findPublishedConto, findPublishedContoSlugs, findPublishedContos } from './reads'

export type PublicContosPage = { items: ContoCardDTO[]; page: number; totalPages: number }

/** Open list of contos (title, date, first lines). Tag 'contos'. */
export const getPublicContos = cached(
  async (page: number): Promise<PublicContosPage> => {
    const payload = await getPayload({ config })
    const res = await findPublishedContos(payload, { page })
    return { items: res.items.map(toContoCardDTO), page: res.page, totalPages: res.totalPages }
  },
  ['contos:list'],
  () => ['contos'],
)

/** One published conto, open blocks only. Tags 'contos' and 'conto:{slug}'. */
export const getPublicConto = cached(
  async (slug: string): Promise<PublicContoDTO | null> => {
    const payload = await getPayload({ config })
    const doc = await findPublishedConto(payload, slug)
    return doc ? toPublicContoDTO(doc) : null
  },
  ['contos:one'],
  (slug) => ['contos', `conto:${slug}`],
)

export const getPublicContoSlugs = cached(
  async () => {
    const payload = await getPayload({ config })
    return findPublishedContoSlugs(payload)
  },
  ['contos:slugs'],
  () => ['contos'],
)
