import type { Where } from 'payload'

/**
 * Recados visibility (D-01): a note exists on the board iff it is approved AND its author has
 * access right now. Computed per request from `assinantes.accessUntil` (same rule and same
 * approximation as visibleAdsWhere), so it disappears at São Paulo midnight with no job and comes
 * back on renewal.
 */
export function visibleRecadosWhere(now: Date): Where {
  return {
    and: [{ status: { equals: 'aprovado' } }, { 'author.accessUntil': { greater_than: now.toISOString() } }],
  }
}

export function isRecadoVisible(
  recado: { status: string },
  authorAccessUntil: string | Date | null | undefined,
  now: Date,
): boolean {
  if (recado.status !== 'aprovado' || !authorAccessUntil) return false
  return new Date(authorAccessUntil).getTime() > now.getTime()
}
