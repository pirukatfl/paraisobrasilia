import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { toDicaCardDTO, toMemberDicaDTO, type DicaCardDTO, type MemberDicaDTO } from './dto'
import { findPublishedDica, findPublishedDicas } from './reads'

// Members reads are NEVER cached: callers (pages) run requireActiveSubscription first (T-05-06).

export type MemberDicasPage = { items: DicaCardDTO[]; page: number; totalPages: number }

export async function listMemberDicas(page: number): Promise<MemberDicasPage> {
  const payload = await getPayload({ config })
  const res = await findPublishedDicas(payload, { page })
  return { items: res.items.map(toDicaCardDTO), page: res.page, totalPages: res.totalPages }
}

export async function getMemberDica(slug: string): Promise<MemberDicaDTO | null> {
  const payload = await getPayload({ config })
  const doc = await findPublishedDica(payload, slug)
  return doc ? toMemberDicaDTO(doc) : null
}
