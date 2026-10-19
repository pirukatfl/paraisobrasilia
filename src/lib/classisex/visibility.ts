import type { Where } from 'payload'

/**
 * ClassiSex visibility (D-05, D-06): an ad exists for members and for the public preview iff it
 * is approved AND its author has access right now. Computed per request from the denormalised
 * `assinantes.accessUntil` (latest non-ended period end, recomputed by the subscription hooks),
 * so an expired subscription hides the ads at São Paulo midnight with no job, and a renewal
 * brings them back. `accessUntil` ignores a future-starting period after a gap (staff never
 * create those through Liberar) — accepted approximation.
 */
export function visibleAdsWhere(now: Date): Where {
  return {
    and: [{ status: { equals: 'aprovado' } }, { 'author.accessUntil': { greater_than: now.toISOString() } }],
  }
}

export function isAdVisible(
  ad: { status: string },
  authorAccessUntil: string | Date | null | undefined,
  now: Date,
): boolean {
  if (ad.status !== 'aprovado' || !authorAccessUntil) return false
  return new Date(authorAccessUntil).getTime() > now.getTime()
}
