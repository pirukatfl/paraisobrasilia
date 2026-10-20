/**
 * Sliding-window attempt counter kept in memory (one app container; a restart clears it, which
 * is acceptable for a 5/hour brake on e-mail requests). Keys are hashed-free but never logged.
 */
const HOUR_MS = 3_600_000

type Buckets = Map<string, number[]>
const globalStore = globalThis as unknown as { __paraisoRateLimit?: Buckets }
const buckets: Buckets = (globalStore.__paraisoRateLimit ??= new Map())

/** Records an attempt; returns false when `key` already used `max` attempts in the window. */
export function allowAttempt(key: string, now: number, max = 5, windowMs = HOUR_MS): boolean {
  const recent = (buckets.get(key) ?? []).filter((at) => now - at < windowMs)
  if (recent.length >= max) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  // Opportunistic cleanup so the map cannot grow without bound
  if (buckets.size > 5000) {
    for (const [k, list] of buckets) if (list.every((at) => now - at >= windowMs)) buckets.delete(k)
  }
  return true
}
