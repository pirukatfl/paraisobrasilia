import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { toContoCardDTO, toMemberContoDTO, type ContoCardDTO, type MemberContoDTO } from './dto'
import { findPublishedConto, findPublishedContos } from './reads'

// Members reads are NEVER cached: callers (pages) run requireActiveSubscription first (T-05-06).

export type MemberContosPage = { items: ContoCardDTO[]; page: number; totalPages: number }

export async function listMemberContos(page: number): Promise<MemberContosPage> {
  const payload = await getPayload({ config })
  const res = await findPublishedContos(payload, { page })
  return { items: res.items.map(toContoCardDTO), page: res.page, totalPages: res.totalPages }
}

export async function getMemberConto(slug: string): Promise<MemberContoDTO | null> {
  const payload = await getPayload({ config })
  const doc = await findPublishedConto(payload, slug)
  return doc ? toMemberContoDTO(doc) : null
}
