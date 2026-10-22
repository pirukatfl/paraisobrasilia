/** Pure helpers of the home party carousel (kept out of the client component so they can be unit tested). */

/** Seconds between automatic slides. */
export const AUTO_ADVANCE_MS = 6000

/** Index after moving one step (wraps around both ends). */
export function stepIndex(current: number, total: number, direction: 1 | -1): number {
  if (total <= 0) return 0
  return (((current + direction) % total) + total) % total
}

/** Which slide a scroll position belongs to (nearest), clamped to the valid range. */
export function indexFromScroll(scrollLeft: number, slideWidth: number, total: number): number {
  if (total <= 0 || slideWidth <= 0) return 0
  return Math.min(total - 1, Math.max(0, Math.round(scrollLeft / slideWidth)))
}

/** Accessible name of one slide: "2 de 5: Título". */
export function slideLabel(position: number, total: number, title: string): string {
  return `${position} de ${total}: ${title}`
}

/** Autoplay runs only with several slides, no reduced-motion preference, and nothing pausing it. */
export function shouldAutoplay(opts: { total: number; reducedMotion: boolean; paused: boolean; userStopped: boolean }): boolean {
  return opts.total > 1 && !opts.reducedMotion && !opts.paused && !opts.userStopped
}
