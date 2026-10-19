/**
 * `?next=` allowlist for the login form (T-03-08: no open redirect).
 * Only paths inside the members area pass; anything else falls back to its home.
 */
export const MEMBERS_HOME = '/area-do-assinante'

export function safeNext(next: unknown): string {
  if (typeof next !== 'string') return MEMBERS_HOME
  if (next !== MEMBERS_HOME && !next.startsWith(`${MEMBERS_HOME}/`)) return MEMBERS_HOME
  if (next.includes('//') || next.includes('\\') || next.includes(':')) return MEMBERS_HOME
  return next
}
