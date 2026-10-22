/**
 * Infinite-scroll reads for the ClassiSex boards. Plain functions (no 'server-only') so int tests can
 * call them; the server action in more-actions.ts resolves the session and delegates here.
 */
import type { Payload } from 'payload'

import { clampPage, findMemberAds, findPublicAds } from './board'
import type { MemberAdDTO, PublicAdDTO } from './dto'

export type MoreInput = { euSou?: unknown; cidade?: unknown; page?: unknown }

export type MoreResult =
  | { audience: 'membros'; items: MemberAdDTO[]; page: number; totalPages: number }
  | { audience: 'publico'; items: PublicAdDTO[]; page: number; totalPages: number }

const CIDADE_LIMIT = 80

export function sanitiseMoreInput(input: MoreInput) {
  const euSou = Number.parseInt(String(input.euSou ?? ''), 10)
  const cidade = typeof input.cidade === 'string' ? input.cidade.trim().slice(0, CIDADE_LIMIT) : ''
  return {
    euSou: Number.isInteger(euSou) && euSou > 0 ? euSou : undefined,
    cidade: cidade || undefined,
    page: clampPage(input.page),
  }
}

/**
 * Next page of the board. `memberActive` is decided on the server from the session and the
 * subscription (never from the client): only then the members DTOs (contacts) are returned;
 * everyone else gets the public, redacted DTOs, and the city filter is ignored for them.
 */
export async function loadMoreAds(
  payload: Payload,
  memberActive: boolean,
  input: MoreInput,
  now: Date,
): Promise<MoreResult> {
  const { euSou, cidade, page } = sanitiseMoreInput(input)
  if (memberActive) {
    const r = await findMemberAds(payload, { euSou, cidade, page }, now)
    return { audience: 'membros', items: r.items, page: r.page, totalPages: r.totalPages }
  }
  const r = await findPublicAds(payload, { euSou, page }, now)
  return { audience: 'publico', items: r.items, page: r.page, totalPages: r.totalPages }
}
