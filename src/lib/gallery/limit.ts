/** How many tiles a gallery shows before the lightbox: all of them when no (valid) limit is given. */
export function visibleCount(total: number, limite?: number): number {
  if (limite === undefined || !Number.isFinite(limite) || limite < 1) return total
  return Math.min(total, Math.floor(limite))
}

/** Items hidden behind the lightbox (0 when everything fits). */
export function hiddenCount(total: number, limite?: number): number {
  return total - visibleCount(total, limite)
}
