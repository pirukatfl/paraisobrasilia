'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { getAccessStatus } from '../assinantes/access'
import { getAssinante } from '../assinantes/session'
import { getPublicAds } from './public'
import { clampPage, type BoardFilters } from './board'
import { loadMoreAds, sanitiseMoreInput, type MoreInput, type MoreResult } from './more'

/**
 * Infinite scroll of the ClassiSex boards. `scope` only says which board the page is on; the DTO
 * kind is decided here from the session (active subscription -> members, anything else -> public),
 * so a forged `scope: 'membros'` from a visitor still gets redacted public items (T-04-01).
 */
export async function loadMoreClassisex(scope: 'publico' | 'membros', input: MoreInput): Promise<MoreResult> {
  const now = new Date()
  let memberActive = false
  if (scope === 'membros') {
    const assinante = await getAssinante()
    if (assinante) memberActive = (await getAccessStatus(assinante.id, now)).state === 'ativa'
  }
  if (memberActive) {
    const payload = await getPayload({ config })
    return loadMoreAds(payload, true, input, now)
  }
  // Public: tagged cache, same as the first page
  const { euSou, page } = sanitiseMoreInput(input)
  const filters: BoardFilters = { euSou, page: clampPage(page) }
  const r = await getPublicAds(filters)
  return { audience: 'publico', items: r.items, page: r.page, totalPages: r.totalPages }
}
